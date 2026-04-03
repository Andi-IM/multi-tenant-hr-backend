import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown in the request pipeline and returns a
 * consistent JSON error response. Operational errors (AppError) are
 * returned as-is; unexpected errors get a generic 500 response to
 * avoid leaking implementation details.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Log error for observability (non-sensitive)
  console.error(`[ERROR] ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Prisma unique constraint violation (P2002)
  if ((err as { code?: string }).code === 'P2002') {
    res.status(409).json({
      status: 'error',
      message: 'A record with this identifier already exists',
    });
    return;
  }

  // Unknown / unexpected errors — never expose stack traces
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
