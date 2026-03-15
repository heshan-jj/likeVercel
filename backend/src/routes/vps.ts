import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createVpsSchema, updateVpsSchema } from '../utils/validators';
import { encrypt } from '../utils/crypto';
import { sshManager } from '../services/SSHManager';

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
        lastConnectedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach live connection status
    const profilesWithStatus = profiles.map((p) => ({
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
    const updateData: any = {};
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
      if ((data.authType || existing.authType) === 'password') {
        credentials.password = data.password;
      } else {
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

    // Update last connected timestamp
    await prisma.vpsProfile.update({
      where: { id: profile.id },
      data: { lastConnectedAt: new Date() },
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
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
