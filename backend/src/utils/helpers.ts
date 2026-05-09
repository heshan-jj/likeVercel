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

/**
 * Escapes a string for use in a shell command.
 * Implements the POSIX sh single-quote escaping pattern.
 */
export function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Simple shell tokenizer that respects quotes but splits by space otherwise.
 */
export function splitShellTokens(cmd: string): string[] {
  const tokens: string[] = [];
  let currentToken = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        currentToken += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inQuote = true;
        quoteChar = char;
      } else if (char === ' ') {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
  }
  if (currentToken.length > 0) tokens.push(currentToken);
  return tokens;
}
