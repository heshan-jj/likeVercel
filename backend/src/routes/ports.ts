import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sshManager } from '../services/SSHManager';
import { verifyVps } from '../utils/helpers';

interface ManagedPortData {
  port: number | null;
  processName: string;
  projectPath: string;
}

const router = Router();

router.use(authMiddleware);

// GET /api/vps/:id/ports — list used ports with process mapping
router.get('/:id/ports', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    // Get listening ports AND processes using them
    // Output: LISTEN 0 128 0.0.0.0:80 0.0.0.0:* users:(("nginx",pid=123,fd=10))
    const output = await sshManager.executeCommand(
      vpsId,
      "ss -tlnp 2>/dev/null | tail -n +2 || true"
    );

    const activePortsMap: any[] = [];
    const ssLines = output.split('\n').filter(Boolean);

    for (const line of ssLines) {
      const pidMatch = line.match(/pid=(\d+)/);
      const nameMatch = line.match(/"([^"]+)"/);
      const portMatch = line.match(/:(\d+)\s/);

      if (portMatch) {
        activePortsMap.push({
          port: parseInt(portMatch[1]),
          pid: pidMatch ? pidMatch[1] : null,
          processName: nameMatch ? nameMatch[1] : 'unknown',
        });
      }
    }

    // Sort and unique ports
    const activePorts = Array.from(new Set(activePortsMap.map(p => p.port))).sort((a, b) => a - b);

    // Get ports from our deployments
    const deployments = await prisma.deployment.findMany({
      where: { vpsId, status: 'running' },
      select: { port: true, processName: true, projectPath: true, id: true },
    });

    // Get the VPS host for shareable URLs
    const vps = await prisma.vpsProfile.findUnique({
      where: { id: vpsId },
      select: { host: true },
    });

    res.json({
      activePorts,
      activePortsMap,
      managedPorts: deployments.map((d: any) => ({
        id: d.id,
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

// DELETE /api/vps/:id/ports/:port/kill — kill the process using a port
router.delete('/:id/ports/:port/kill', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const port = parseInt(req.params.port as string);
    if (isNaN(port)) {
      res.status(400).json({ error: 'Invalid port' });
      return;
    }

    // Find PID using fuser or ss
    const pidOut = await sshManager.executeCommand(vpsId, `fuser ${port}/tcp 2>/dev/null || ss -tlnp 'sport = :${port}' | grep -oP 'pid=\\K\\d+' | head -n 1 || true`);
    const pid = pidOut.trim();

    if (!pid) {
      res.status(404).json({ error: 'No process found listening on this port' });
      return;
    }

    await sshManager.executeCommand(vpsId, `kill -9 ${pid}`);
    res.json({ message: `Process ${pid} on port ${port} terminated` });
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
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      res.status(400).json({ error: 'Invalid port number' });
      return;
    }

    try {
      const output = await sshManager.executeCommand(
        vpsId,
        `ss -tlnp 'sport = :${portNum}' | grep -c LISTEN || echo 0`
      );
      const isUsed = parseInt(output.trim()) > 0;

      res.json({
        port: portNum,
        available: !isUsed,
        message: isUsed ? `Port ${portNum} is in use` : `Port ${portNum} is available`,
      });
    } catch {
      res.json({ port: portNum, available: true, message: `Port ${portNum} appears available` });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vps/:id/ports/share/:port — generate shareable URL
router.get('/:id/ports/share/:port', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const profile = await prisma.vpsProfile.findUnique({
      where: { id: vpsId },
      select: { host: true },
    });

    const port = parseInt(req.params.port as string);
    if (isNaN(port) || port < 1 || port > 65535) {
      res.status(400).json({ error: 'Invalid port number' });
      return;
    }

    const url = `http://${profile?.host}:${port}`;

    res.json({
      url,
      port,
      host: profile?.host,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
