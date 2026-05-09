import { Router, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import multer from 'multer';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sshManager } from '../services/SSHManager';
import { SFTPWrapper } from 'ssh2';
import { verifyVps, escapeShellArg } from '../utils/helpers';

const router = Router();

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Multer config for temp uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// Middleware to check file size early (Fix 35)
const checkFileSize = (req: AuthRequest, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > MAX_FILE_SIZE) {
    res.status(413).json({ error: `File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` });
    return;
  }
  next();
};

router.use(authMiddleware);

const DEFAULT_SCOPED_PATHS = ['/var/www', '/home', '/app', '/opt', '/srv'];
const SYSTEM_PATHS = ['/etc', '/root', '/bin', '/boot', '/dev', '/lib', '/lib64', '/proc', '/sys', '/usr', '/var/lib', '/var/log', '/var/cache'];

function isSystemPath(p: string): boolean {
  return SYSTEM_PATHS.some(sysPath => p === sysPath || p.startsWith(sysPath + '/'));
}

// Helper to sanitize remote paths
function sanitizePath(remotePath: string, allowSystemAccess?: boolean): string {
  if (!remotePath) return '/';
  
  // 1. Decode URI components to catch encoded path traversal
  let decoded = remotePath;
  try {
    decoded = decodeURIComponent(remotePath);
  } catch (e) {
    // If decoding fails, continue with original string
  }
  
  // 2. Remove null bytes (poison null byte attack)
  decoded = decoded.replace(/\0/g, '');
  
  // 3. Force it to be an absolute path relative to system root
  const prepended = decoded.startsWith('/') ? decoded : '/' + decoded;
  
  // 4. Normalize (resolves .. segments)
  const normalized = path.posix.normalize(prepended);
  
  // 5. Ensure it didn't collapse into something that tries to go above root
  if (normalized.includes('..')) {
    return '/'; // Fallback to safe default
  }
  
  // 6. Filesystem scoping: restrict to allowed paths unless system access is granted
  if (!allowSystemAccess && isSystemPath(normalized)) {
    const fallback = DEFAULT_SCOPED_PATHS.find(p => !isSystemPath(p)) || '/var/www';
    return fallback;
  }
  
  return normalized;
}

function getAllowSystemAccess(req: AuthRequest): boolean {
  return req.query.systemAccess === 'true' || req.body?.systemAccess === true;
}



// GET /api/vps/:id/files?path=/ — list directory contents
router.get('/:id/files', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const allowSystemAccess = getAllowSystemAccess(req);
    const remotePath = sanitizePath((req.query.path as string) || '/', allowSystemAccess);

    // Use ls with sudo to get detailed list including hidden files
    // --time-style="+%s" gives unix timestamp for easier parsing
    const cmd = `sudo -n ls -lA --time-style="+%s" -- ${escapeShellArg(remotePath)}`;
    const output = await sshManager.executeCommand(vpsId, cmd);

    const lines = output.split('\n');
    const files = [];

    for (const line of lines) {
      if (line.startsWith('total') || !line.trim()) continue;

      // Parse ls -l output: drwxr-xr-x 2 root root 4096 1715264000 filename
      const parts = line.split(/\s+/);
      if (parts.length < 7) continue;

      const perms = parts[0];
      const size = parseInt(parts[4], 10);
      const mtime = parseInt(parts[5], 10);
      const name = parts.slice(6).join(' '); // Handle spaces in filenames

      if (name === '.' || name === '..') continue;

      files.push({
        name,
        path: path.posix.join(remotePath, name),
        isDirectory: perms.startsWith('d'),
        size,
        modifiedAt: new Date(mtime * 1000).toISOString(),
        permissions: perms,
      });
    }

    // Sort: directories first, then alphabetically
    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ path: remotePath, files });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/files/upload — upload file
router.post(
  '/:id/files/upload',
  checkFileSize,
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const vpsId = await verifyVps(req, res);
      if (!vpsId) return;

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const allowSystemAccess = getAllowSystemAccess(req);
      const remotePath = sanitizePath(req.body.path || '/', allowSystemAccess);
      const remoteFilePath = path.posix.join(remotePath, req.file.originalname);
      
      const client = sshManager.getConnection(vpsId);
      if (!client) throw new Error('Not connected');

      // Use sudo dd to write the file with root privileges
      client.exec(`sudo -n dd of=${escapeShellArg(remoteFilePath)}`, (err, stream) => {
        if (err) {
          return res.status(500).json({ error: `Upload failed: ${err.message}` });
        }

        stream.on('close', (code: number) => {
          if (code === 0) {
            res.json({ message: 'File uploaded with sudo', path: remoteFilePath });
          } else {
            res.status(500).json({ error: `Upload exited with code ${code}` });
          }
        });

        stream.on('error', (err: Error) => {
          if (!res.headersSent) {
            res.status(500).json({ error: `Upload stream error: ${err.message}` });
          }
        });

        stream.end(req.file!.buffer);
      });
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }
);

// GET /api/vps/:id/files/download?path= — download file
router.get('/:id/files/download', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const allowSystemAccess = getAllowSystemAccess(req);
    const remotePath = sanitizePath(req.query.path as string, allowSystemAccess);
    if (!remotePath || remotePath === '/') {
      res.status(400).json({ error: 'Valid path is required' });
      return;
    }

    const client = sshManager.getConnection(vpsId);
    if (!client) throw new Error('Not connected');

    const filename = path.posix.basename(remotePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Use sudo cat to read the file with root privileges
    client.exec(`sudo -n cat -- ${escapeShellArg(remotePath)}`, (err, stream) => {
      if (err) {
        return res.status(500).json({ error: `Download failed: ${err.message}` });
      }

      stream.on('error', (err: Error) => {
        if (!res.headersSent) {
          res.status(500).json({ error: `Download stream error: ${err.message}` });
        }
      });

      stream.pipe(res);
    });
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST /api/vps/:id/files/mkdir — create directory
router.post('/:id/files/mkdir', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const allowSystemAccess = getAllowSystemAccess(req);
    const remotePath = sanitizePath(req.body.path, allowSystemAccess);
    if (!remotePath || remotePath === '/') {
      res.status(400).json({ error: 'Valid path is required' });
      return;
    }

    await sshManager.executeCommand(vpsId, `sudo -n mkdir -p -- ${escapeShellArg(remotePath)}`);
    res.json({ message: 'Directory created with sudo', path: remotePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vps/:id/files?path= — delete file or directory
router.delete('/:id/files', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const allowSystemAccess = getAllowSystemAccess(req);
    const remotePath = sanitizePath(req.query.path as string, allowSystemAccess);
    
    // Extra safety for dangerous operations
    const forbiddenPaths = ['/', '/root', '/etc', '/bin', '/usr', '/var'];
    if (!remotePath || forbiddenPaths.includes(remotePath) || remotePath.length < 2) {
      res.status(400).json({ error: 'Invalid or forbidden path for deletion' });
      return;
    }

    // Use sudo rm for root-level deletion
    await sshManager.executeCommand(vpsId, `sudo -n rm -rf -- ${escapeShellArg(remotePath)}`);
    res.json({ message: 'Deleted with sudo', path: remotePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/vps/:id/files/rename — rename/move file
router.put('/:id/files/rename', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      res.status(400).json({ error: 'Both oldPath and newPath are required' });
      return;
    }

    const allowSystemAccess = getAllowSystemAccess(req);
    const sanitizedOld = sanitizePath(oldPath, allowSystemAccess);
    const sanitizedNew = sanitizePath(newPath, allowSystemAccess);

    // Use sudo mv for root-level move/rename
    await sshManager.executeCommand(vpsId, `sudo -n mv -- ${escapeShellArg(sanitizedOld)} ${escapeShellArg(sanitizedNew)}`);
    res.json({ message: 'Renamed with sudo', oldPath: sanitizedOld, newPath: sanitizedNew });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
