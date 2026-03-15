import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sshManager } from '../services/SSHManager';
import { processStartSchema } from '../utils/validators';

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

// GET /api/vps/:id/processes — list managed processes
router.get('/:id/processes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const deployments = await prisma.deployment.findMany({
      where: { vpsId },
      orderBy: { createdAt: 'desc' },
    });

    // Check actual PM2 process status
    try {
      const pm2Output = await sshManager.executeCommand(vpsId, 'pm2 jlist 2>/dev/null || echo "[]"');
      const pm2Processes = JSON.parse(pm2Output);

      const processesWithStatus = deployments.map((d) => {
        const pm2Process = pm2Processes.find((p: any) => p.name === d.processName);
        return {
          ...d,
          actualStatus: pm2Process ? pm2Process.pm2_env.status : 'stopped',
          cpu: pm2Process?.monit?.cpu || 0,
          memory: pm2Process?.monit?.memory || 0,
        };
      });

      res.json({ processes: processesWithStatus });
    } catch {
      // PM2 not available, return DB status
      res.json({ processes: deployments });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/processes/start — detect project & start process
router.post('/:id/processes/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const data = processStartSchema.parse(req.body);
    const projectPath = data.projectPath.replace(/\.\./g, '');
    const port = data.port || Math.floor(3000 + Math.random() * 6000);

    // Detect project type
    let files: string;
    try {
      files = await sshManager.executeCommand(vpsId, `ls ${projectPath}`);
    } catch {
      res.status(400).json({ error: 'Project path not found on server' });
      return;
    }

    let startCommand: string;
    let processName: string;
    let projectType: string;

    if (data.command) {
      // Custom command
      startCommand = `cd ${projectPath} && pm2 start "${data.command}" --name "custom-${port}"`;
      processName = `custom-${port}`;
      projectType = 'custom';
    } else if (files.includes('package.json')) {
      processName = `node-${port}`;
      startCommand = `cd ${projectPath} && npm install && PORT=${port} pm2 start npm --name "${processName}" -- start`;
      projectType = 'node';
    } else if (files.includes('requirements.txt')) {
      processName = `python-${port}`;
      startCommand = `cd ${projectPath} && pip install -r requirements.txt && pm2 start "python app.py" --name "${processName}"`;
      projectType = 'python';
    } else if (files.includes('index.html')) {
      processName = `static-${port}`;
      startCommand = `pm2 serve ${projectPath} ${port} --name "${processName}" --spa`;
      projectType = 'static';
    } else {
      res.status(400).json({
        error: 'Unable to detect project type. Provide a custom command.',
        hint: 'Supported: package.json (Node), requirements.txt (Python), index.html (Static)',
      });
      return;
    }

    // Execute start command
    try {
      await sshManager.executeCommand(vpsId, startCommand);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to start process: ${error.message}` });
      return;
    }

    // Save deployment record
    const deployment = await prisma.deployment.create({
      data: {
        vpsId,
        projectPath,
        processName,
        port,
        status: 'running',
        startedAt: new Date(),
      },
    });

    res.status(201).json({
      deployment: {
        ...deployment,
        projectType,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/processes/:deploymentId/stop
router.post('/:id/processes/:deploymentId/stop', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const deployment = await prisma.deployment.findFirst({
      where: { id: req.params.deploymentId, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    try {
      await sshManager.executeCommand(vpsId, `pm2 stop ${deployment.processName}`);
    } catch (error: any) {
      console.warn(`[Process] PM2 stop warning: ${error.message}`);
    }

    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: 'stopped', stoppedAt: new Date() },
    });

    res.json({ message: 'Process stopped' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/processes/:deploymentId/restart
router.post('/:id/processes/:deploymentId/restart', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const deployment = await prisma.deployment.findFirst({
      where: { id: req.params.deploymentId, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    await sshManager.executeCommand(vpsId, `pm2 restart ${deployment.processName}`);

    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: 'running', startedAt: new Date() },
    });

    res.json({ message: 'Process restarted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vps/:id/processes/:deploymentId — remove process
router.delete('/:id/processes/:deploymentId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const deployment = await prisma.deployment.findFirst({
      where: { id: req.params.deploymentId, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    // Delete from PM2
    try {
      await sshManager.executeCommand(vpsId, `pm2 delete ${deployment.processName}`);
    } catch {
      // PM2 process might not exist
    }

    await prisma.deployment.delete({ where: { id: deployment.id } });
    res.json({ message: 'Process removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vps/:id/processes/:deploymentId/logs — get process logs
router.get('/:id/processes/:deploymentId/logs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const deployment = await prisma.deployment.findFirst({
      where: { id: req.params.deploymentId, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    const lines = parseInt(req.query.lines as string) || 100;
    const logs = await sshManager.executeCommand(
      vpsId,
      `pm2 logs ${deployment.processName} --nostream --lines ${lines} 2>&1`
    );

    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
