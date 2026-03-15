import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sshManager } from '../services/SSHManager';
import { SFTPWrapper } from 'ssh2';

const router = Router();
const prisma = new PrismaClient();

// Multer config for temp uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

router.use(authMiddleware);

// Helper to sanitize remote paths
function sanitizePath(remotePath: string): string {
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
    res.status(400).json({ error: 'VPS not connected. Connect first.' });
    return null;
  }

  return vpsId;
}

// GET /api/vps/:id/files?path=/ — list directory contents
router.get('/:id/files', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath((req.query.path as string) || '/');
    const sftp = await getSftp(vpsId);

    sftp.readdir(remotePath, (err, list) => {
      sftp.end();
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
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/files/upload — upload file
router.post(
  '/:id/files/upload',
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const vpsId = await verifyVps(req, res);
      if (!vpsId) return;

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const remotePath = sanitizePath(req.body.path || '/');
      const remoteFilePath = path.posix.join(remotePath, req.file.originalname);
      const sftp = await getSftp(vpsId);

      const writeStream = sftp.createWriteStream(remoteFilePath);

      writeStream.on('close', () => {
        sftp.end();
        res.json({ message: 'File uploaded', path: remoteFilePath });
      });

      writeStream.on('error', (err: Error) => {
        sftp.end();
        res.status(500).json({ error: `Upload failed: ${err.message}` });
      });

      writeStream.end(req.file.buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/vps/:id/files/download?path= — download file
router.get('/:id/files/download', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath(req.query.path as string);
    if (!remotePath) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }

    const sftp = await getSftp(vpsId);
    const filename = path.posix.basename(remotePath);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const readStream = sftp.createReadStream(remotePath);

    readStream.on('error', (err: Error) => {
      sftp.end();
      if (!res.headersSent) {
        res.status(500).json({ error: `Download failed: ${err.message}` });
      }
    });

    readStream.on('end', () => {
      sftp.end();
    });

    readStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vps/:id/files/mkdir — create directory
router.post('/:id/files/mkdir', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath(req.body.path);
    if (!remotePath) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }

    const sftp = await getSftp(vpsId);
    sftp.mkdir(remotePath, (err) => {
      sftp.end();
      if (err) {
        res.status(500).json({ error: `Failed to create directory: ${err.message}` });
        return;
      }
      res.json({ message: 'Directory created', path: remotePath });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vps/:id/files?path= — delete file or directory
router.delete('/:id/files', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vpsId = await verifyVps(req, res);
    if (!vpsId) return;

    const remotePath = sanitizePath(req.query.path as string);
    if (!remotePath || remotePath === '/') {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    // Use SSH command for recursive delete (safer than SFTP rmdir which isn't recursive)
    await sshManager.executeCommand(vpsId, `rm -rf "${remotePath}"`);
    res.json({ message: 'Deleted', path: remotePath });
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

    const sftp = await getSftp(vpsId);
    sftp.rename(sanitizePath(oldPath), sanitizePath(newPath), (err) => {
      sftp.end();
      if (err) {
        res.status(500).json({ error: `Rename failed: ${err.message}` });
        return;
      }
      res.json({ message: 'Renamed', oldPath, newPath });
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
