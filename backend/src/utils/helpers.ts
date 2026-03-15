import { Response } from 'express';
import prisma from './prisma';
import { sshManager } from '../services/SSHManager';
import { AuthRequest } from '../middleware/auth';

/**
 * Verifies that the user owns the VPS profile and it is connected.
 * Returns the vpsId if successful, otherwise null (and sends response).
 */
export async function verifyVps(req: AuthRequest, res: Response): Promise<string | null> {
  const vpsId = req.params.id as string;
  if (!vpsId) {
    res.status(400).json({ error: 'VPS ID is required' });
    return null;
  }

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
