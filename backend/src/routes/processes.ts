import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sshManager } from '../services/SSHManager';
import { processStartSchema } from '../utils/validators';
import { verifyVps } from '../utils/helpers';

const router = Router();

router.use(authMiddleware);

// GET /api/vps/:id/processes — list managed processes
router.get('/:id/processes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const deployments = await prisma.deployment.findMany({
      where: { vpsId },
      orderBy: { createdAt: 'desc' },
    });

    // Get the VPS host for shareable URLs
    const vps = await prisma.vpsProfile.findUnique({
      where: { id: vpsId },
      select: { host: true },
    });

    // Check actual PM2 process status
    let pm2Processes: any[] = [];
    try {
      const pm2Output = await sshManager.executeCommand(vpsId, 'pm2 list --format json 2>/dev/null || pm2 jlist 2>/dev/null || echo "[]"');
      pm2Processes = JSON.parse(pm2Output);
    } catch {
      // PM2 not available or output not parseable, pm2Processes stays empty
    }

    const unmanagedPm2Processes = pm2Processes.filter(
      (p: any) => !deployments.find((d) => d.processName === p.name)
    ).map((p: any) => ({
      processName: p.name,
      cpu: p.monit?.cpu || 0,
      memory: p.monit?.memory || 0,
      status: p.pm2_env?.status || 'unknown',
      pm_id: p.pm_id
    }));

    if (pm2Processes.length > 0) {
      const processesWithStatus = deployments.map((d: any) => {
        const pm2Process = pm2Processes.find((p: any) => p.name === d.processName);
        return {
          ...d,
          actualStatus: pm2Process ? pm2Process.pm2_env.status : 'stopped',
          cpu: pm2Process?.monit?.cpu || 0,
          memory: pm2Process?.monit?.memory || 0,
          url: `http://${vps?.host}:${d.port}`,
        };
      });

      res.json({ processes: processesWithStatus, unmanagedProcesses: unmanagedPm2Processes });
    } else {
      const processesWithUrls = deployments.map((d: any) => ({
        ...d,
        url: `http://${vps?.host}:${d.port}`,
      }));
      res.json({ processes: processesWithUrls, unmanagedProcesses: unmanagedPm2Processes });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Escapes a string for use in a shell command.
 */
function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// POST /api/vps/:id/processes/start — detect project & start process
router.post('/:id/processes/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const data = processStartSchema.parse(req.body);
    const projectPath = data.projectPath; // Already validated for .. and absolute path
    const port = data.port || Math.floor(3000 + Math.random() * 6000);

    const escapedPath = escapeShellArg(projectPath);

    // Detect project type using a more robust way (Fix 14)
    // We'll check for files using find or ls with specific flags
    let files: string;
    try {
      // Fix 2: Use escaped path
      files = await sshManager.executeCommand(vpsId, `ls -F ${escapedPath}`);
    } catch {
      res.status(400).json({ error: 'Project path not found on server' });
      return;
    }

    let startCommand: string;
    let processName: string;
    let projectType: string;

    const fileList = files.split('\n').map(f => f.trim());

    if (data.command) {
      // Custom command — escape the entire command string safely
      processName = `custom-${port}`;
      const escapedCmd = escapeShellArg(data.command);
      startCommand = `cd ${escapedPath} && pm2 start ${escapedCmd} --name ${escapeShellArg(processName)}`;
      projectType = 'custom';
    } else if (fileList.includes('package.json')) {
      processName = `node-${port}`;
      const escapedProcessName = escapeShellArg(processName);
      startCommand = `cd ${escapedPath} && npm install && PORT=${port} pm2 start npm --name ${escapedProcessName} -- start`;
      projectType = 'node';
    } else if (fileList.includes('requirements.txt')) {
      processName = `python-${port}`;
      const escapedProcessName = escapeShellArg(processName);
      // Detect the main Python file instead of assuming app.py
      const mainFile = fileList.find(f => f.endsWith('.py') && !f.startsWith('.')) || 'app.py';
      const escapedMainFile = escapeShellArg(mainFile);
      startCommand = `cd ${escapedPath} && pip install -r requirements.txt && pm2 start ${escapedMainFile} --name ${escapedProcessName}`;
      projectType = 'python';
    } else if (fileList.includes('index.html')) {
      processName = `static-${port}`;
      const escapedProcessName = escapeShellArg(processName);
      startCommand = `pm2 serve ${escapedPath} ${port} --name ${escapedProcessName} --spa`;
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
      where: { id: req.params.deploymentId as string, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    try {
      await sshManager.executeCommand(vpsId, `pm2 stop ${escapeShellArg(deployment.processName)}`);
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
      where: { id: req.params.deploymentId as string, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    await sshManager.executeCommand(vpsId, `pm2 restart ${escapeShellArg(deployment.processName)}`);

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
      where: { id: req.params.deploymentId as string, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    // Delete from PM2
    try {
      await sshManager.executeCommand(vpsId, `pm2 delete ${escapeShellArg(deployment.processName)}`);
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
      where: { id: req.params.deploymentId as string, vpsId },
    });

    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }

    const lines = parseInt(req.query.lines as string) || 100;
    const logs = await sshManager.executeCommand(
      vpsId,
      `pm2 logs ${escapeShellArg(deployment.processName)} --nostream --lines ${lines} 2>&1`
    );

    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
