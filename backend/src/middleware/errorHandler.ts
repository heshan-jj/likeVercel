import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', err.message || err);

  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  // Zod validation errors (Fix 9)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
    return;
  }

  // Standardize error response format (Fix 22)
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    details: err.details || undefined,
  });
}
