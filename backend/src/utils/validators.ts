import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const baseVpsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1, 'Username is required'),
  authType: z.enum(['password', 'privateKey']),
  password: z.string().optional(),
  privateKey: z.string().optional().refine(
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

export const processStartSchema = z.object({
  projectPath: z.string()
    .min(1, 'Project path is required')
    .refine((val) => !val.includes('..'), 'Path traversal not allowed')
    .refine((val) => val.startsWith('/'), 'Absolute path is required'),
  port: z.number().int().min(1024).max(65535).optional(),
  command: z.string().optional(),
});
