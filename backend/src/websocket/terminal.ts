import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { sshManager } from '../services/SSHManager';
import { ClientChannel } from 'ssh2';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupTerminalWebSocket(io: SocketIOServer): void {
  // Auth middleware for Socket.io
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token as string, config.jwt.secret) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    let activeShell: ClientChannel | null = null;
    let activeVpsId: string | null = null;

    // Start a terminal session
    socket.on('start-terminal', async (data: { vpsId: string }) => {
      try {
        const { vpsId } = data;

        // Verify ownership
        const profile = await prisma.vpsProfile.findFirst({
          where: { id: vpsId, userId: socket.userId },
        });

        if (!profile) {
          socket.emit('terminal-error', 'VPS not found or unauthorized');
          return;
        }

        if (!sshManager.isConnected(vpsId)) {
          socket.emit('terminal-error', 'VPS not connected. Connect via dashboard first.');
          return;
        }

        // Open shell
        const stream = await sshManager.openShell(vpsId);
        activeShell = stream;
        activeVpsId = vpsId;

        // Stream terminal output to client
        stream.on('data', (data: Buffer) => {
          socket.emit('terminal-output', data.toString('utf8'));
        });

        stream.stderr.on('data', (data: Buffer) => {
          socket.emit('terminal-output', data.toString('utf8'));
        });

        stream.on('close', () => {
          socket.emit('terminal-closed');
          activeShell = null;
          activeVpsId = null;
        });

        socket.emit('terminal-ready');
      } catch (error: any) {
        console.error('[WS] Terminal start error:', error);
        socket.emit('terminal-error', error.message);
      }
    });

    // Receive input from client
    socket.on('terminal-input', (data: string) => {
      if (activeShell) {
        activeShell.write(data);
      }
    });

    // Handle terminal resize
    socket.on('terminal-resize', (data: { rows: number; cols: number }) => {
      if (activeShell) {
        activeShell.setWindow(data.rows, data.cols, 0, 0);
      }
    });

    // Close terminal
    socket.on('close-terminal', () => {
      if (activeShell) {
        activeShell.end();
        activeShell = null;
        activeVpsId = null;
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
      if (activeShell) {
        activeShell.end();
        activeShell = null;
      }
    });
  });
}
