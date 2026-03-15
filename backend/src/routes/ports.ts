import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sshManager } from '../services/SSHManager';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Helper to verify VPS ownership & connection
async function verifyVps(req: AuthRequest, res: Response): Promise<string | null> {
  const vpsId = req.params.id;
  const profile = await prisma.vpsProfile.findFirst({
    where: { id: vpsId, userId: req.userId },
  });

  if (!profile) {
    res.status(404).json({ error: 'VPS profile not found' });
    return null;
  }

  if (!sshManager.isConnected(vpsId)) {
    res.status(400).json({ error: 'VPS not connected' });
    return null;
  }

  return vpsId;
}

// GET /api/vps/:id/ports — list used ports
router.get('/:id/ports', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    // Get listening ports from the server
    const output = await sshManager.executeCommand(
      vpsId,
      "ss -tlnp 2>/dev/null | tail -n +2 | awk '{print $4}' | rev | cut -d: -f1 | rev | sort -un"
    );

    const activePorts = output
      .split('\n')
      .filter(Boolean)
      .map((p) => parseInt(p.trim()))
      .filter((p) => !isNaN(p));

    // Get ports from our deployments
    const deployments = await prisma.deployment.findMany({
      where: { vpsId, status: 'running' },
      select: { port: true, processName: true, projectPath: true },
    });

    // Get the VPS host for shareable URLs
    const vps = await prisma.vpsProfile.findUnique({
      where: { id: vpsId },
      select: { host: true },
    });

    res.json({
      activePorts,
      managedPorts: deployments.map((d) => ({
        port: d.port,
        processName: d.processName,
        projectPath: d.projectPath,
        url: `http://${vps?.host}:${d.port}`,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/ports/check — check if a port is available
router.post('/:id/ports/check', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const { port } = req.body;
    if (!port || port < 1 || port > 65535) {
      res.status(400).json({ error: 'Invalid port number' });
      return;
    }

    try {
      const output = await sshManager.executeCommand(
        vpsId,
        `ss -tlnp | grep ":${port} " | wc -l`
      );
      const isUsed = parseInt(output.trim()) > 0;

      res.json({
        port,
        available: !isUsed,
        message: isUsed ? `Port ${port} is in use` : `Port ${port} is available`,
      });
    } catch {
      res.json({ port, available: true, message: `Port ${port} appears available` });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vps/:id/ports/share/:port — generate shareable URL
router.get('/:id/ports/share/:port', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await prisma.vpsProfile.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!profile) {
      res.status(404).json({ error: 'VPS profile not found' });
      return;
    }

    const port = parseInt(req.params.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      res.status(400).json({ error: 'Invalid port number' });
      return;
    }

    const url = `http://${profile.host}:${port}`;

    res.json({
      url,
      port,
      host: profile.host,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
