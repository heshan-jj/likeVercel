import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { config } from '../config';
import { sshManager } from '../services/SSHManager';
import { ClientChannel } from 'ssh2';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Track active terminal connections per user (Fix 19)
const userConnections = new Map<string, Set<string>>();
const MAX_CONNECTIONS_PER_USER = 5;

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

      // Check connection limits (Fix 19)
      const userId = decoded.userId;
      const connections = userConnections.get(userId) || new Set();
      if (connections.size >= MAX_CONNECTIONS_PER_USER) {
        return next(new Error('Too many active terminal sessions'));
      }
      connections.add(socket.id);
      userConnections.set(userId, connections);

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[WS] Client connected: ${socket.id} (User: ${socket.userId})`);

    let activeShell: ClientChannel | null = null;
    let activeVpsId: string | null = null;

    // Listen for SSH manager disconnects (Fix 15)
    const onSshDisconnected = (vpsId: string) => {
      if (vpsId === activeVpsId && activeShell) {
        console.log(`[WS] SSH connection for ${vpsId} closed, cleaning up terminal`);
        activeShell.end();
        socket.emit('terminal-closed', { reason: 'SSH connection lost' });
      }
    };
    sshManager.on('disconnected', onSshDisconnected);

    // Start a terminal session
    socket.on('start-terminal', async (data: { vpsId: string }) => {
      try {
        const { vpsId } = data;
        if (!socket.userId) return;

        // Verify ownership (Fix 20)
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

        // Close existing shell if any
        if (activeShell) {
          activeShell.end();
        }

        // Open shell
        const stream = await sshManager.openShell(vpsId);
        activeShell = stream;
        activeVpsId = vpsId;

        // Stream terminal output to client
        // Fix 34: Use binary data if possible, but Xterm.js usually expects strings or Uint8Array
        stream.on('data', (data: Buffer) => {
          if (socket.connected) { // Fix 13
            socket.emit('terminal-output', data);
          }
        });

        stream.stderr.on('data', (data: Buffer) => {
          if (socket.connected) { // Fix 13
            socket.emit('terminal-output', data);
          }
        });

        stream.on('close', () => {
          if (socket.connected) {
            socket.emit('terminal-closed');
          }
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
    socket.on('terminal-input', async (data: string | Buffer) => {
      if (activeShell && activeVpsId && socket.userId) {
        // Optional: Periodic ownership re-verification (Fix 20)
        // For performance, we trust the established stream unless VPS is deleted/transferred
        activeShell.write(data);
      } else {
        console.warn(`[WS] Dropping terminal-input due to missing activeShell/activeVpsId/userId`);
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
      sshManager.off('disconnected', onSshDisconnected);
      
      // Cleanup connection tracking (Fix 19)
      if (socket.userId) {
        const connections = userConnections.get(socket.userId);
        if (connections) {
          connections.delete(socket.id);
          if (connections.size === 0) {
            userConnections.delete(socket.userId);
          }
        }
      }

      if (activeShell) {
        activeShell.end();
        activeShell = null;
      }
    });
  });
}
