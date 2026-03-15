import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';

interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
}

export function encrypt(plaintext: string): EncryptedData {
  try {
    const key = Buffer.from(config.encryption.key, 'hex');
    const iv = crypto.randomBytes(12); // GCM recommended IV length is 12 bytes
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

export function decrypt(encryptedData: EncryptedData): string {
  try {
    const key = Buffer.from(config.encryption.key, 'hex');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}. Possibly invalid key or corrupted data.`);
  }
}
