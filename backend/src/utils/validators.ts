import { z } from 'zod';

export const setupSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

export const unlockSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

const baseVpsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  host: z.string().min(1, 'Host is required').max(253),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1, 'Username is required').max(64),
  authType: z.enum(['password', 'privateKey']),
  password: z.string().max(1024).optional(),
  privateKey: z.string().max(16384).optional().refine(
    (val) => {
      if (!val) return true;
      return val.includes('-----BEGIN') && val.includes('-----END');
    },
    { message: 'Invalid private key format (must be a PEM string)' }
  ),
  passphrase: z.string().optional(),
});

export const createVpsSchema = baseVpsSchema.refine(
  (data) => {
    if (data.authType === 'password') {
      return !!data.password && data.password.length > 0;
    }
    return true;
  },
  {
    message: 'Password is required when authType is "password"',
    path: ['password'],
  }
).refine(
  (data) => {
    if (data.authType === 'privateKey') {
      return !!data.privateKey && data.privateKey.length > 0;
    }
    return true;
  },
  {
    message: 'Private key is required when authType is "privateKey"',
    path: ['privateKey'],
  }
);

export const updateVpsSchema = baseVpsSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);

export const filePathSchema = z.object({
  path: z.string()
    .min(1, 'Path is required')
    .refine((val) => !val.includes('..'), 'Path traversal not allowed'),
});

export const portSchema = z.object({
  port: z.number().int().min(1).max(65535),
});

export const restoreSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
  signature: z.string().optional(),
});

export const processStartSchema = z.object({
  projectPath: z.string()
    .min(1, 'Project path is required')
    .refine((val) => !val.includes('..'), 'Path traversal not allowed')
    .refine((val) => val.startsWith('/'), 'Absolute path is required'),
  port: z.number().int().min(1).max(65535).optional(),
  command: z.string().optional(),
  processName: z.string().min(1).max(50).optional(),
});
