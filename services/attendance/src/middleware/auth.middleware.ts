import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';
import type { JwtUserPayload, AuthenticatedRequest } from '../types/auth.types.js';
import { createChildLogger } from '@jaga-id/logger';

const logger = createChildLogger('AuthMiddleware');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

/**
 * Middleware: Authenticate JWT Token
 */
export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(
      { method: req.method, path: req.path, reason: 'missing_or_malformed_header' },
      'Authentication failed'
    );
    throw AppError.unauthorized('Missing or malformed Authorization header');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    const err = error as Error & { name?: string };
    logger.warn(
      { method: req.method, path: req.path, error: err.name },
      'Authentication failed - invalid or expired token'
    );
    throw AppError.unauthorized('Invalid or expired token');
  }
}

/**
 * Middleware: Authorize System Actor Access
 */
export function authorizeSystemActor(req: Request, _res: Response, next: NextFunction): void {
  const authenticatedReq = req as AuthenticatedRequest;
  if (!authenticatedReq.user) {
    throw AppError.unauthorized('Authentication required');
  }

  if (authenticatedReq.user.role !== 'SYSTEM_ACTOR') {
    throw AppError.forbidden('Access denied: System Actor role required');
  }

  next();
}
/**
 * Middleware: Authorize Admin HR Access
 */
export function authorizeAdmin(req: Request, _res: Response, next: NextFunction): void {
  const authenticatedReq = req as AuthenticatedRequest;
  if (!authenticatedReq.user) {
    throw AppError.unauthorized('Authentication required');
  }

  if (authenticatedReq.user.role !== 'ADMIN_HR') {
    throw AppError.forbidden('Access denied: ADMIN_HR role required');
  }

  next();
}
