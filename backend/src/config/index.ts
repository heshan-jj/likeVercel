import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try multiple .env locations
const envPaths = [
  path.resolve(process.cwd(), '.env'), // backend/.env
  path.resolve(__dirname, '../../.env'), // root/.env (if __dirname is src/config)
  path.resolve(__dirname, '../../../.env') // root/.env (if __dirname is dist/config)
];

let loaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[Config] Loaded environment variables from ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn('[Config] No .env file found, relying on system environment variables.');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      return secret;
    })(),
    refreshSecret: (() => {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) {
        throw new Error('JWT_REFRESH_SECRET environment variable is required');
      }
      return secret;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  encryption: {
    key: (() => {
      const key = process.env.ENCRYPTION_KEY;
      if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required');
      }
      if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
      }
      return key;
    })(),
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
