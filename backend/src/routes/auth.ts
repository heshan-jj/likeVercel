import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from '../utils/prisma';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema } from '../utils/validators';


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();
const SALT_ROUNDS = 12;

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


// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    // Enforce single-user policy: block registration if a user already exists
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      res.status(403).json({ error: 'Registration is closed. Only one administrator is allowed.' });
      return;
    }
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user in local DB
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });



    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user.id);

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const { accessToken, refreshToken } = await generateTokens(user.id);

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
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

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (stored) {
        await prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revoked: true },
        });
      }
    }
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
      select: { id: true, email: true, name: true, createdAt: true },
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

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name },
      select: { id: true, email: true, name: true }
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Both current and new passwords are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword }
    });

    // Revoke all refresh tokens on password change
    await prisma.refreshToken.updateMany({
      where: { userId: req.userId, revoked: false },
      data: { revoked: true },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// DELETE /api/auth/profile
router.delete('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = req.userId;
    const vpsProfiles = await prisma.vpsProfile.findMany({ where: { userId } });
    for (const profile of vpsProfiles) {
      await prisma.deployment.deleteMany({ where: { vpsId: profile.id } });
    }
    await prisma.vpsProfile.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'User profile and all associated data deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// POST /api/auth/restore — upload a backup SQLite file to replace dev.db
router.post('/restore', authMiddleware, upload.single('backup'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: 'No backup file uploaded' });
      return;
    }

    // Validate SQLite3 magic bytes: "SQLite format 3\0"
    const SQLITE_MAGIC = Buffer.from([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00]);
    if (file.buffer.length < 16 || !file.buffer.slice(0, 16).equals(SQLITE_MAGIC)) {
      res.status(400).json({ error: 'File does not appear to be a valid SQLite 3 database' });
      return;
    }

    const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
    const backupPath = `${dbPath}.pre-restore-${Date.now()}`;

    // Keep a safety copy of the current db, then replace
    if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, backupPath);
    try {
      await prisma.$disconnect();
      fs.writeFileSync(dbPath, file.buffer);

      // Run pending migrations to ensure schema compatibility
      const { execSync } = require('child_process');
      const migrateOutput = execSync('npx prisma migrate deploy', {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf-8',
        timeout: 30000,
      });
      console.log('[Auth] Migration output:', migrateOutput);

      // Reconnect by accessing prisma lazily (it reconnects on next query)
      await prisma.$connect();
      // Clean up safety backup on success
      try { if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath); } catch {}
    } catch (writeErr) {
      // Try to roll back
      if (fs.existsSync(backupPath)) {
        try { fs.copyFileSync(backupPath, dbPath); await prisma.$connect(); } catch {}
      }
      throw writeErr;
    }

    res.json({ message: 'Database restored and migrations applied successfully. Please reload the app.' });
  } catch (error: any) {
    console.error('[Auth] Restore error:', error);
    res.status(500).json({ error: `Restore failed: ${error.message}` });
  }
});

// GET /api/auth/backup — stream a copy of the SQLite database
router.get('/backup', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Prisma stores the db relative to the schema file (prisma/dev.db)
    const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: 'Database file not found' });
      return;
    }

    // WAL checkpoint to ensure consistency before backup
    try {
      await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(FULL)');
    } catch (checkpointErr) {
      console.warn('[Auth] WAL checkpoint warning:', checkpointErr);
    }

    const filename = `likeVercel-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(dbPath).pipe(res);
  } catch (error) {
    console.error('[Auth] Backup error:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});



export default router;
