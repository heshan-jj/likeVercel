import { Router, Response } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { encrypt } from '../utils/crypto';
import { sshManager } from '../services/SSHManager';
import { createVpsSchema, updateVpsSchema } from '../utils/validators';
import { escapeShellArg } from '../utils/helpers';


const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/vps — list all VPS profiles for current user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    const profiles = await prisma.vpsProfile.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        authType: true,
        region: true,
        lastConnectedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach live connection status
    type VpsListItem = typeof profiles[number];
    const profilesWithStatus = profiles.map((p: VpsListItem) => ({
      ...p,
      isConnected: sshManager.isConnected(p.id),
    }));

    res.json({ profiles: profilesWithStatus });
  } catch (error) {
    console.error('[VPS] List error:', error);
    res.status(500).json({ error: 'Failed to list VPS profiles' });
  }
});

// GET /api/vps/:id — get single VPS profile
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        username: true,
        authType: true,
        region: true,
        lastConnectedAt: true,
        createdAt: true,
        deployments: {
          select: {
            id: true,
            projectPath: true,
            processName: true,
            port: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    res.json({
      profile: {
        ...profile,
        isConnected: sshManager.isConnected(profile.id),
      },
    });
  } catch (error) {
    console.error('[VPS] Get error:', error);
    res.status(500).json({ error: 'Failed to get VPS profile' });
  }
});

// POST /api/vps — create new VPS profile
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = createVpsSchema.parse(req.body);

    // Build credentials object
    const credentials: Record<string, any> = {
      host: data.host,
      port: data.port,
      username: data.username,
    };
    if (data.authType === 'password') {
      credentials.password = data.password;
    } else {
      credentials.privateKey = data.privateKey;
      if (data.passphrase) {
        credentials.passphrase = data.passphrase;
      }
    }

    // Encrypt credentials
    const encrypted = encrypt(JSON.stringify(credentials));

    const profile = await prisma.vpsProfile.create({
      data: {
        userId: req.userId,
        name: data.name,
        host: data.host,
        port: data.port,
        username: data.username,
        authType: data.authType,
        encryptedCredentials: encrypted.data,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });

    res.status(201).json({
      profile: {
        id: profile.id,
        name: profile.name,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        authType: profile.authType,
        isConnected: false,
        createdAt: profile.createdAt,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('[VPS] Create error:', error);
    res.status(500).json({ error: 'Failed to create VPS profile' });
  }
});

// PUT /api/vps/:id — update VPS profile
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = updateVpsSchema.parse(req.body);

    // Verify ownership
    const existing = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    // If credentials changed, re-encrypt
    const updateData: Prisma.VpsProfileUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.host) updateData.host = data.host;
    if (data.port) updateData.port = data.port;
    if (data.username) updateData.username = data.username;
    if (data.authType) updateData.authType = data.authType;

    if (data.password || data.privateKey) {
      const credentials: Record<string, any> = {
        host: data.host || existing.host,
        port: data.port || existing.port,
        username: data.username || existing.username,
      };
      const effectiveAuthType = data.authType || existing.authType;
      if (effectiveAuthType === 'password') {
        if (!data.password) {
          res.status(400).json({ error: 'Password is required when authType is password' });
          return;
        }
        credentials.password = data.password;
      } else {
        if (!data.privateKey) {
          res.status(400).json({ error: 'Private key is required when authType is privateKey' });
          return;
        }
        credentials.privateKey = data.privateKey;
        if (data.passphrase) {
          credentials.passphrase = data.passphrase;
        }
      }

      const encrypted = encrypt(JSON.stringify(credentials));
      updateData.encryptedCredentials = encrypted.data;
      updateData.iv = encrypted.iv;
      updateData.authTag = encrypted.authTag;
    }

    const profile = await prisma.vpsProfile.update({
      where: { id: req.params.id as string },
      data: updateData,
    });

    res.json({
      profile: {
        id: profile.id,
        name: profile.name,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        authType: profile.authType,
        isConnected: sshManager.isConnected(profile.id),
        createdAt: profile.createdAt,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('[VPS] Update error:', error);
    res.status(500).json({ error: 'Failed to update VPS profile' });
  }
});

// DELETE /api/vps/:id — delete VPS profile
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const existing = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    // Disconnect if connected
    if (sshManager.isConnected(existing.id)) {
      await sshManager.disconnect(existing.id);
    }

    await prisma.vpsProfile.delete({ where: { id: existing.id } });
    res.json({ message: 'VPS profile deleted' });
  } catch (error) {
    console.error('[VPS] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete VPS profile' });
  }
});

// POST /api/vps/:id/connect — establish SSH connection
router.post('/:id/connect', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
      select: {
        id: true,
        encryptedCredentials: true,
        iv: true,
        authTag: true,
        region: true,
      },
    });

    if (!profile) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    if (sshManager.isConnected(profile.id)) {
      res.json({ message: 'Already connected', isConnected: true });
      return;
    }

    await sshManager.connect(
      profile.id,
      profile.encryptedCredentials,
      profile.iv,
      profile.authTag
    );

    // Update last connected timestamp and region if missing
    const updateData: Prisma.VpsProfileUpdateInput = { lastConnectedAt: new Date() };
    if (!profile.region) {
      try {
        const geoRaw = await sshManager.executeCommand(
          profile.id,
          'curl -s --max-time 5 https://ipapi.co/json/'
        );
        const geo = JSON.parse(geoRaw);
        if (geo.city && geo.country && !geo.error) {
          updateData.region = `${geo.city},${geo.country}`.toUpperCase();
        }
      } catch (err) {
        console.warn('[VPS] Region detection failed:', err);
      }
    }

    await prisma.vpsProfile.update({
      where: { id: profile.id },
      data: updateData,
    });



    res.json({ message: 'Connected successfully', isConnected: true });
  } catch (error: any) {
    console.error('[VPS] Connect error:', error);
    res.status(500).json({ error: `Connection failed: ${error.message}` });
  }
});

// POST /api/vps/:id/disconnect — close SSH connection
router.post('/:id/disconnect', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    });

    if (!profile) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    await sshManager.disconnect(profile.id);
    res.json({ message: 'Disconnected', isConnected: false });
  } catch (error) {
    console.error('[VPS] Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Simple in-memory cache for hardware specs (5 minute TTL)
const specsCache = new Map<string, { data: any, expires: number }>();

// GET /api/vps/:id/specs — get dynamic server hardware specs
router.get('/:id/specs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const vpsId = req.params.id as string;

    // Check cache
    const cached = specsCache.get(vpsId);
    if (cached && cached.expires > Date.now()) {
      res.json(cached.data);
      return;
    }

    const profile = await prisma.vpsProfile.findFirst({
      where: { id: vpsId, userId: req.userId },
      select: { id: true, region: true },
    });

    if (!profile) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    if (!sshManager.isConnected(profile.id)) {
      res.status(400).json({ error: 'VPS is not connected' });
      return;
    }

    try {
      const osVersion = await sshManager.executeCommand(profile.id, "cat /etc/os-release | grep PRETTY_NAME | cut -d '=' -f 2 | tr -d '\"'");
      const cpuStr = await sshManager.executeCommand(profile.id, "nproc");
      const cpuCores = parseInt(cpuStr, 10) || 'Unknown';
      const ramStr = await sshManager.executeCommand(profile.id, "free -h | awk '/^Mem:/{print $2}'");
      const diskStr = await sshManager.executeCommand(profile.id, "df -h / | awk 'NR==2 {print $2}'");
      
      const specs = {
        os: osVersion.trim(),
        cpu: `${cpuCores} Cores`,
        ram: ramStr.trim(),
        disk: diskStr.trim(),
        region: profile.region || 'Unknown'
      };

      // Set cache
      specsCache.set(vpsId, { data: specs, expires: Date.now() + 300000 }); // 5 minutes
      
      res.json(specs);
    } catch (cmdErr: any) {
      console.error('[VPS] Specs cmd error:', cmdErr);
      res.status(500).json({ error: 'Failed to execute spec commands on VPS' });
    }
  } catch (error) {
    console.error('[VPS] Get specs error:', error);
    res.status(500).json({ error: 'Failed to fetch specs' });
  }
});

// GET /api/vps/:id/status — get connection status
router.get('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profile = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    });

    if (!profile) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    res.json({ isConnected: sshManager.isConnected(profile.id) });
  } catch (error) {
    console.error('[VPS] Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// GET /api/vps/:id/usage — live CPU% and RAM% via procfs
router.get('/:id/usage', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const profile = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    });
    if (!profile) { res.status(404).json({ error: 'VPS not found' }); return; }
    if (!sshManager.isConnected(profile.id)) { res.status(400).json({ error: 'Not connected' }); return; }

    // Two /proc/stat samples, 100ms apart for accurate CPU delta
    const stat1 = await sshManager.executeCommand(profile.id, "cat /proc/stat | head -1");
    await new Promise(r => setTimeout(r, 100));
    const stat2 = await sshManager.executeCommand(profile.id, "cat /proc/stat | head -1");

    const parse = (line: string) => line.split(/\s+/).slice(1).map(Number);
    const s1 = parse(stat1), s2 = parse(stat2);
    const idle1 = s1[3], idle2 = s2[3];
    const total1 = s1.reduce((a, b) => a + b, 0), total2 = s2.reduce((a, b) => a + b, 0);
    const cpuPercent = Math.round((1 - (idle2 - idle1) / (total2 - total1)) * 100);

    const memStr = await sshManager.executeCommand(profile.id, "free | grep Mem | awk '{print $2,$3}'");
    const [totalMem, usedMem] = memStr.split(' ').map(Number);
    const ramPercent = Math.round((usedMem / totalMem) * 100);

    res.json({ cpu: cpuPercent, ram: ramPercent });
  } catch (error) {
    console.error('[VPS] Usage error:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

function spkiToSshPublicKey(spkiPem: string): string {
  const keyObject = crypto.createPublicKey(spkiPem);
  const der = keyObject.export({ type: 'spki', format: 'der' });
  // SPKI DER structure for Ed25519:
  // SEQUENCE { SEQUENCE { OID 1.3.101.112 } BIT STRING (0 unused bits) <raw 32-byte key> }
  // Skip past the OID and BIT STRING wrapper to get the raw key bytes
  let offset = 15;
  if (der[offset] !== 0x00) offset--;
  offset++;
  const rawKey = der.subarray(offset);

  const algo = Buffer.from('ssh-ed25519', 'utf8');
  const algoLen = Buffer.alloc(4);
  algoLen.writeUInt32BE(algo.length, 0);
  const keyLen = Buffer.alloc(4);
  keyLen.writeUInt32BE(rawKey.length, 0);
  const buf = Buffer.concat([algoLen, algo, keyLen, rawKey]);
  return `ssh-ed25519 ${buf.toString('base64')} likeVercel-generated`;
}

// POST /api/vps/keys/generate — generate an Ed25519 SSH keypair server-side
router.post('/keys/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    const sshPublicKey = spkiToSshPublicKey(publicKey);

    res.json({ privateKey, publicKey: sshPublicKey });
  } catch (error: any) {
    console.error('[Keys] Generate error:', error);
    res.status(500).json({ error: `Key generation failed: ${error.message}` });
  }
});

// POST /api/vps/:id/keys/install — install a public key on a connected VPS
router.post('/:id/keys/install', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { publicKey } = req.body as { publicKey: string };
    if (!publicKey || !publicKey.trim()) {
      res.status(400).json({ error: 'publicKey is required' });
      return;
    }

    const profile = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id as string, userId: req.userId },
    });
    if (!profile) { res.status(404).json({ error: 'VPS not found' }); return; }
    if (!sshManager.isConnected(profile.id)) { res.status(400).json({ error: 'VPS is not connected' }); return; }

    const publicKeyLine = publicKey.trim() + '\n';
    const sftp = await sshManager.getSftp(profile.id);
    
    try {
      // Ensure .ssh exists
      await new Promise<void>((resolve, reject) => {
        sftp.mkdir('.ssh', { mode: 0o700 }, (err) => {
          // ssh2 reports EEXIST as a generic "Failure" message
          if (err && !err.message.toLowerCase().includes('failure')) {
            reject(new Error(`Failed to create .ssh directory: ${err.message}`));
          } else {
            resolve();
          }
        });
      });

      // Append to authorized_keys
      await new Promise((resolve, reject) => {
        const stream = sftp.createWriteStream('.ssh/authorized_keys', { 
          flags: 'a',
          mode: 0o600 
        });
        stream.on('error', reject);
        stream.on('close', resolve);
        stream.end(publicKeyLine);
      });
    } finally {
      sftp.end();
    }

    res.json({ message: 'Public key installed successfully' });
  } catch (error: any) {
    console.error('[Keys] Install error:', error);
    res.status(500).json({ error: `Key install failed: ${error.message}` });
  }
});

export default router;
