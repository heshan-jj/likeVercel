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

export const createVpsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1, 'Username is required'),
  authType: z.enum(['password', 'privateKey']),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
});

export const updateVpsSchema = createVpsSchema.partial();

export const filePathSchema = z.object({
  path: z.string()
    .min(1, 'Path is required')
    .refine((val) => !val.includes('..'), 'Path traversal not allowed'),
});

export const portSchema = z.object({
  port: z.number().int().min(1).max(65535),
});

export const processStartSchema = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  port: z.number().int().min(1024).max(65535).optional(),
  command: z.string().optional(),
});
