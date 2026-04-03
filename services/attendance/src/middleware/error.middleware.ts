import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

/**
 * Global Error Handler Middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's a known AppError, return it
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Otherwise, it's an unhandled error (500)
  console.error('Unhandled Error:', err);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'Something went wrong',
  });
}
