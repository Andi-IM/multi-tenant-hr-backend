import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

type MongooseValidationError = Error & {
  name: 'ValidationError';
  errors?: Record<string, { message?: string }>;
};

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

  const maybeBodyParserError = err as Error & { type?: string; status?: number };
  if (maybeBodyParserError.type === 'entity.parse.failed' || maybeBodyParserError.status === 400) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid JSON body',
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  const mongooseValidationError = err as MongooseValidationError;
  if (mongooseValidationError.name === 'ValidationError' && mongooseValidationError.errors) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: Object.entries(mongooseValidationError.errors).map(([field, detail]) => ({
        field,
        message: detail.message ?? 'Invalid value',
      })),
    });
    return;
  }

  const mongoDuplicateKey = err as Error & { code?: number; keyPattern?: Record<string, unknown> };
  if (mongoDuplicateKey.code === 11000) {
    const fields = mongoDuplicateKey.keyPattern ? Object.keys(mongoDuplicateKey.keyPattern) : [];
    res.status(409).json({
      status: 'error',
      message: fields.length > 0 ? `Duplicate value for: ${fields.join(', ')}` : 'Duplicate key error',
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
