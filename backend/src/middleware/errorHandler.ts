import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation error',
      details: JSON.parse(err.message),
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
  });
}
