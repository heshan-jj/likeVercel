import { Client, ConnectConfig, ClientChannel } from 'ssh2';
import { EventEmitter } from 'events';
import { decrypt } from '../utils/crypto';

interface ConnectionInfo {
  client: Client;
  vpsId: string;
  keepAliveInterval?: NodeJS.Timeout;
  reconnectAttempts: number;
}

interface DecryptedCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export class SSHManager extends EventEmitter {
  private connections: Map<string, ConnectionInfo> = new Map();
  private static instance: SSHManager;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly KEEPALIVE_INTERVAL = 30000;

  static getInstance(): SSHManager {
    if (!SSHManager.instance) {
      SSHManager.instance = new SSHManager();
    }
    return SSHManager.instance;
  }

  private constructor() {
    super();
    // Prevent unhandled 'error' events from crashing the process
    this.on('error', (vpsId, err) => {
      console.error(`[SSHManager] Background error for ${vpsId}:`, err.message);
    });
  }

  async connect(
    vpsId: string,
    encryptedCreds: string,
    iv: string,
    authTag: string
  ): Promise<Client> {
    // Disconnect existing connection if any
    if (this.connections.has(vpsId)) {
      await this.disconnect(vpsId);
    }

    const decrypted: DecryptedCredentials = JSON.parse(
      decrypt({ data: encryptedCreds, iv, authTag })
    );

    return new Promise((resolve, reject) => {
      const client = new Client();
      const connectConfig: ConnectConfig = {
        host: decrypted.host,
        port: decrypted.port || 22,
        username: decrypted.username,
        keepaliveInterval: this.KEEPALIVE_INTERVAL,
        keepaliveCountMax: 3,
        readyTimeout: 20000,
      };

      if (decrypted.password) {
        console.log(`[SSH] Authenticating to ${decrypted.host} with PASSWORD`);
        connectConfig.password = decrypted.password;
      } else if (decrypted.privateKey) {
        console.log(`[SSH] Authenticating to ${decrypted.host} with PRIVATE KEY (length: ${decrypted.privateKey.length})`);
        connectConfig.privateKey = decrypted.privateKey;
        if (decrypted.passphrase) {
          console.log(`[SSH] Using passphrase of length ${decrypted.passphrase.length}`);
          connectConfig.passphrase = decrypted.passphrase;
        }
      }

      client.on('ready', () => {
        const keepAliveInterval = setInterval(() => {
          if (client) {
            client.exec('echo keepalive', (err) => {
              if (err) {
                console.warn(`[SSH] Keep-alive failed for ${vpsId}`);
              }
            });
          }
        }, this.KEEPALIVE_INTERVAL);

        const connInfo: ConnectionInfo = {
          client,
          vpsId,
          keepAliveInterval,
          reconnectAttempts: 0,
        };

        this.connections.set(vpsId, connInfo);
        this.emit('connected', vpsId);
        resolve(client);
      });

      client.on('error', (err) => {
        console.error(`[SSH] Error for ${vpsId}:`, err.message);
        this.cleanup(vpsId);
        this.emit('error', vpsId, err);
        reject(err);
      });

      client.on('close', () => {
        console.log(`[SSH] Connection closed for ${vpsId}`);
        this.cleanup(vpsId);
        this.emit('disconnected', vpsId);
      });

      client.on('end', () => {
        this.cleanup(vpsId);
      });

      client.connect(connectConfig);
    });
  }

  async disconnect(vpsId: string): Promise<void> {
    const connInfo = this.connections.get(vpsId);
    if (connInfo) {
      if (connInfo.keepAliveInterval) {
        clearInterval(connInfo.keepAliveInterval);
      }
      connInfo.client.end();
      this.connections.delete(vpsId);
      this.emit('disconnected', vpsId);
    }
  }

  getConnection(vpsId: string): Client | null {
    const connInfo = this.connections.get(vpsId);
    return connInfo ? connInfo.client : null;
  }

  isConnected(vpsId: string): boolean {
    return this.connections.has(vpsId);
  }

  getConnectedVpsIds(): string[] {
    return Array.from(this.connections.keys());
  }

  async executeCommand(vpsId: string, command: string): Promise<string> {
    const client = this.getConnection(vpsId);
    if (!client) {
      throw new Error(`No active connection for VPS ${vpsId}`);
    }

    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) return reject(err);

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (code: number) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            reject(new Error(stderr || `Command exited with code ${code}`));
          }
        });
      });
    });
  }

  async openShell(
    vpsId: string
  ): Promise<ClientChannel> {
    const client = this.getConnection(vpsId);
    if (!client) {
      throw new Error(`No active connection for VPS ${vpsId}`);
    }

    return new Promise((resolve, reject) => {
      client.shell(
        {
          term: 'xterm-256color',
          cols: 80,
          rows: 24,
        },
        (err, stream) => {
          if (err) return reject(err);
          resolve(stream);
        }
      );
    });
  }

  private cleanup(vpsId: string): void {
    const connInfo = this.connections.get(vpsId);
    if (connInfo) {
      if (connInfo.keepAliveInterval) {
        clearInterval(connInfo.keepAliveInterval);
      }
      this.connections.delete(vpsId);
    }
  }

  disconnectAll(): void {
    for (const [vpsId] of this.connections) {
      this.disconnect(vpsId);
    }
  }
}

export const sshManager = SSHManager.getInstance();
