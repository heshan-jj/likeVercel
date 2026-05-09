import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import crypto from 'crypto';
import { CookieSerializeOptions } from 'cookie';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import prisma from '../utils/prisma';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { setupSchema, unlockSchema, restoreSchema } from '../utils/validators';


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();
const SALT_ROUNDS = 12;

const COOKIE_OPTIONS: CookieSerializeOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/api',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', { ...COOKIE_OPTIONS });
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, path: '/api/auth' });
}

const bruteForceLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 unlock attempts per windowMs
  message: { error: 'Too many failed attempts. Please try again in 10 minutes.' },
  skipSuccessfulRequests: true,
});

async function generateTokens(userId: string) {
  const { secret, refreshSecret, expiresIn, refreshExpiresIn } = config.jwt;

  const parsedExpiresIn = typeof expiresIn === 'string' ? expiresIn : '15m';
  const parsedRefreshExpiresIn = typeof refreshExpiresIn === 'string' ? refreshExpiresIn : '7d';

  const accessToken = jwt.sign({ userId }, secret, { expiresIn: parsedExpiresIn } as jwt.SignOptions);

  const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: parsedRefreshExpiresIn } as jwt.SignOptions);

  // Parse refresh token expiry for DB storage
  const refreshExpiryMs = parseDuration(parsedRefreshExpiresIn);
  const expiresAt = new Date(Date.now() + refreshExpiryMs);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1]);
  switch (match[2]) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

// GET /api/auth/status
router.get('/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findFirst();
    res.json({
      isSetup: !!user && user.onboardingCompleted,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

// POST /api/auth/setup
router.post('/setup', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = setupSchema.parse(req.body);

    const userCount = await prisma.user.count();
    if (userCount > 0) {
      res.status(403).json({ error: 'Setup already completed.' });
      return;
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(data.pin, SALT_ROUNDS);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        hashedPin,
        onboardingCompleted: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user.id);

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: { id: user.id },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('[Auth] Setup error:', error);
    res.status(500).json({ error: `Setup failed: ${error.message || 'Unknown error'}` });
  }
});

// POST /api/auth/unlock
router.post('/unlock', bruteForceLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = unlockSchema.parse(req.body);

    const user = await prisma.user.findFirst();
    if (!user) {
      res.status(404).json({ error: 'Setup not completed' });
      return;
    }

    const validPin = await bcrypt.compare(data.pin, user.hashedPin);
    if (!validPin) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    const { accessToken, refreshToken } = await generateTokens(user.id);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: { id: user.id },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('[Auth] Unlock error:', error);
    res.status(500).json({ error: 'Unlock failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if refresh token exists in DB and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!storedToken || storedToken.revoked) {
      res.status(401).json({ error: 'Refresh token has been revoked' });
      return;
    }

    // Rotate: revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokens(user.id);

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (refreshToken) {
      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (stored) {
        await prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revoked: true },
        });
      }
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/auth/pin - Change PIN
router.put('/pin', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      res.status(400).json({ error: 'Both current and new PINs are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPin = await bcrypt.compare(currentPin, user.hashedPin);
    if (!validPin) {
      res.status(401).json({ error: 'Current PIN is incorrect' });
      return;
    }

    const hashedPin = await bcrypt.hash(newPin, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.userId },
      data: { hashedPin }
    });

    // Revoke all refresh tokens on PIN change
    await prisma.refreshToken.updateMany({
      where: { userId: req.userId, revoked: false },
      data: { revoked: true },
    });

    res.json({ message: 'PIN updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

function computeBackupSignature(data: Buffer): string {
  return crypto.createHmac('sha256', config.encryption.key).update(data).digest('hex');
}

async function verifyDatabaseIntegrity(dbBuffer: Buffer): Promise<{ valid: boolean; error?: string }> {
  const tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'db-verify-'));
  const tmpDb = path.join(tmpDir, 'verify.db');
  try {
    fs.writeFileSync(tmpDb, dbBuffer);
    const { execSync } = require('child_process');
    const pragmaOutput = execSync(`sqlite3 "${tmpDb}" "PRAGMA integrity_check;"`, {
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();
    if (pragmaOutput !== 'ok') {
      return { valid: false, error: `Database integrity check failed: ${pragmaOutput}` };
    }
    const tablesRaw = execSync(`sqlite3 "${tmpDb}" ".tables"`, {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    const requiredTables = ['User', 'VpsProfile', 'RefreshToken', 'Deployment', 'DeploymentLog'];
    for (const table of requiredTables) {
      if (!tablesRaw.includes(table)) {
        return { valid: false, error: `Required table '${table}' not found in backup database` };
      }
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Integrity verification error: ${err.message}` };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// POST /api/auth/restore
router.post('/restore', authMiddleware, upload.single('backup'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: 'No backup file uploaded' });
      return;
    }

    const data = restoreSchema.parse(req.body);
    const user = await prisma.user.findFirst();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPin = await bcrypt.compare(data.pin, user.hashedPin);
    if (!validPin) {
      res.status(401).json({ error: 'Invalid PIN. Restore requires PIN confirmation.' });
      return;
    }

    const expectedSignature = computeBackupSignature(file.buffer);
    if (data.signature && data.signature !== expectedSignature) {
      res.status(400).json({ error: 'Backup signature is invalid. The file may have been tampered with.' });
      return;
    }

    const SQLITE_MAGIC = Buffer.from([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00]);
    if (file.buffer.length < 16 || !file.buffer.slice(0, 16).equals(SQLITE_MAGIC)) {
      res.status(400).json({ error: 'File does not appear to be a valid SQLite 3 database' });
      return;
    }

    const integrity = await verifyDatabaseIntegrity(file.buffer);
    if (!integrity.valid) {
      res.status(400).json({ error: integrity.error });
      return;
    }

    const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
    const backupPath = `${dbPath}.pre-restore-${Date.now()}`;

    if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, backupPath);
    try {
      await prisma.$disconnect();
      fs.writeFileSync(dbPath, file.buffer);

      const { execSync } = require('child_process');
      const migrateOutput = execSync('npx prisma migrate deploy', {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf-8',
        timeout: 30000,
      });
      console.log('[Auth] Migration output:', migrateOutput);

      await prisma.$connect();
      try { if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath); } catch {}
    } catch (writeErr) {
      if (fs.existsSync(backupPath)) {
        try { fs.copyFileSync(backupPath, dbPath); await prisma.$connect(); } catch {}
      }
      throw writeErr;
    }

    res.json({
      message: 'Database restored successfully. Restart the server for changes to take effect.',
      requiresRestart: true,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('[Auth] Restore error:', error);
    res.status(500).json({ error: `Restore failed: ${error.message}` });
  }
});

// GET /api/auth/backup
router.get('/backup', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: 'Database file not found' });
      return;
    }

    try {
      await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(FULL)');
    } catch (checkpointErr) {
      console.warn('[Auth] WAL checkpoint warning:', checkpointErr);
    }

    const dbBuffer = fs.readFileSync(dbPath);
    const signature = computeBackupSignature(dbBuffer);

    const filename = `likeVercel-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Backup-Signature', signature);
    res.send(dbBuffer);
  } catch (error) {
    console.error('[Auth] Backup error:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

export default router;