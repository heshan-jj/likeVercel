import { Router, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import multer from 'multer';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sshManager } from '../services/SSHManager';
import { SFTPWrapper } from 'ssh2';
import { verifyVps } from '../utils/helpers';

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

// Helper to sanitize remote paths
function sanitizePath(remotePath: string): string {
  if (!remotePath) return '/';
  // Prevent path traversal
  const cleaned = remotePath.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
  return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
}

// Helper to get SFTP session
function getSftp(vpsId: string): Promise<SFTPWrapper> {
  const client = sshManager.getConnection(vpsId);
  if (!client) {
    throw new Error('VPS not connected');
  }

  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) return reject(err);
      resolve(sftp);
    });
  });
}

// GET /api/vps/:id/files?path=/ — list directory contents
router.get('/:id/files', async (req: AuthRequest, res: Response): Promise<void> => {
  let sftp: SFTPWrapper | null = null;
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath((req.query.path as string) || '/');
    sftp = await getSftp(vpsId);

    sftp.readdir(remotePath, (err, list) => {
      if (sftp) sftp.end();
      if (err) {
        res.status(500).json({ error: `Failed to list directory: ${err.message}` });
        return;
      }

      const files = list.map((item) => ({
        name: item.filename,
        path: path.posix.join(remotePath, item.filename),
        isDirectory: item.attrs.isDirectory(),
        size: item.attrs.size,
        modifiedAt: new Date(item.attrs.mtime * 1000).toISOString(),
        permissions: item.attrs.mode?.toString(8),
      }));

      // Sort: directories first, then alphabetically
      files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      res.json({ path: remotePath, files });
    });
  } catch (error: any) {
    if (sftp) sftp.end();
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/files/upload — upload file
router.post(
  '/:id/files/upload',
  checkFileSize,
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    let sftp: SFTPWrapper | null = null;
    try {
      const vpsId = await verifyVps(req, res);
      if (!vpsId) return;

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const remotePath = sanitizePath(req.body.path || '/');
      const remoteFilePath = path.posix.join(remotePath, req.file.originalname);
      sftp = await getSftp(vpsId);

      const writeStream = sftp.createWriteStream(remoteFilePath);

      writeStream.on('close', () => {
        if (sftp) sftp.end();
        if (!res.headersSent) {
          res.json({ message: 'File uploaded', path: remoteFilePath });
        }
      });

      writeStream.on('error', (err: Error) => {
        if (sftp) sftp.end();
        if (!res.headersSent) {
          res.status(500).json({ error: `Upload failed: ${err.message}` });
        }
      });

      writeStream.end(req.file.buffer);
    } catch (error: any) {
      if (sftp) sftp.end();
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }
);

// GET /api/vps/:id/files/download?path= — download file
router.get('/:id/files/download', async (req: AuthRequest, res: Response): Promise<void> => {
  let sftp: SFTPWrapper | null = null;
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath(req.query.path as string);
    if (!remotePath || remotePath === '/') {
      res.status(400).json({ error: 'Valid path is required' });
      return;
    }

    sftp = await getSftp(vpsId);
    const filename = path.posix.basename(remotePath);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const readStream = sftp.createReadStream(remotePath);

    readStream.on('error', (err: Error) => {
      if (sftp) sftp.end();
      if (!res.headersSent) {
        res.status(500).json({ error: `Download failed: ${err.message}` });
      }
    });

    readStream.on('end', () => {
      if (sftp) sftp.end();
    });

    readStream.pipe(res);
  } catch (error: any) {
    if (sftp) sftp.end();
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST /api/vps/:id/files/mkdir — create directory
router.post('/:id/files/mkdir', async (req: AuthRequest, res: Response): Promise<void> => {
  let sftp: SFTPWrapper | null = null;
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath(req.body.path);
    if (!remotePath || remotePath === '/') {
      res.status(400).json({ error: 'Valid path is required' });
      return;
    }

    sftp = await getSftp(vpsId);
    sftp.mkdir(remotePath, (err) => {
      if (sftp) sftp.end();
      if (err) {
        res.status(500).json({ error: `Failed to create directory: ${err.message}` });
        return;
      }
      res.json({ message: 'Directory created', path: remotePath });
    });
  } catch (error: any) {
    if (sftp) sftp.end();
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vps/:id/files?path= — delete file or directory
router.delete('/:id/files', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath(req.query.path as string);
    // Extra safety for dangerous operations (Fix 29)
    const forbiddenPaths = ['/', '/root', '/etc', '/bin', '/usr', '/var'];
    if (!remotePath || forbiddenPaths.includes(remotePath) || remotePath.length < 2) {
      res.status(400).json({ error: 'Invalid or forbidden path for deletion' });
      return;
    }

    // Use SSH command for recursive delete
    await sshManager.executeCommand(vpsId, `rm -rf "${remotePath.replace(/"/g, '\\"')}"`);
    res.json({ message: 'Deleted', path: remotePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/vps/:id/files/rename — rename/move file
router.put('/:id/files/rename', async (req: AuthRequest, res: Response): Promise<void> => {
  let sftp: SFTPWrapper | null = null;
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      res.status(400).json({ error: 'Both oldPath and newPath are required' });
      return;
    }

    sftp = await getSftp(vpsId);
    sftp.rename(sanitizePath(oldPath), sanitizePath(newPath), (err) => {
      if (sftp) sftp.end();
      if (err) {
        res.status(500).json({ error: `Rename failed: ${err.message}` });
        return;
      }
      res.json({ message: 'Renamed', oldPath, newPath });
    });
  } catch (error: any) {
    if (sftp) sftp.end();
    res.status(500).json({ error: error.message });
  }
});

export default router;
