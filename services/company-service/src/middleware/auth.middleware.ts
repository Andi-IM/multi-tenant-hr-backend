import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';
import type { JwtUserPayload, AuthenticatedRequest, UserRole } from '../types/auth.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const COMPANY_ID = process.env.COMPANY_ID || 'A';

/**
 * Middleware: Authenticate JWT Token (SEC-001:773-780)
 *
 * Validates the Bearer token from the Authorization header,
 * decodes the JWT payload, and attaches the user context to `req.user`.
 */
export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Token expired');
    }
    throw AppError.unauthorized('Invalid token');
  }
}

/**
 * Middleware: Authorize Roles (SEC-001:786-789)
 *
 * Checks if the authenticated user has one of the required roles.
 *
 * @param roles - List of allowed roles
 */
export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!roles.includes(authReq.user.role)) {
      throw AppError.forbidden('Insufficient permissions');
    }

    next();
  };
}

/**
 * Middleware: Authorize Company Access
 *
 * Ensures the authenticated user belongs to the company managed by this service.
 * Compares the `companyId` from the JWT token with the service's COMPANY_ID.
 */
export function authorizeCompany(req: Request, _res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    throw AppError.unauthorized('Authentication required');
  }

  if (authReq.user.companyId !== COMPANY_ID) {
    throw AppError.forbidden(
      `Access denied: You are not authorized to perform actions on Company ${COMPANY_ID} service`
    );
  }

  next();
}
