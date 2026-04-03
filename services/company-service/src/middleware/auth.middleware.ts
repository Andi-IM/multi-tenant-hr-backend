import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';
import type { JwtUserPayload } from '../types/auth.types.js';

interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const COMPANY_ID = process.env.COMPANY_ID || 'A';

/**
 * Middleware: Authenticate JWT Token
 *
 * Validates the Bearer token from the Authorization header,
 * decodes the JWT payload, and attaches the user context to `req.user`.
 *
 * Returns 401 if token is missing or invalid.
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or malformed Authorization header');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }
}

/**
 * Middleware: Authorize Company Access
 *
 * Ensures the authenticated user belongs to the company managed by this service.
 * Compares the `companyId` from the JWT token with the service's COMPANY_ID.
 *
 * Returns 403 if the user's company does not match.
 */
export function authorizeCompany(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    throw AppError.unauthorized('Authentication required');
  }

  if (req.user.companyId !== COMPANY_ID) {
    throw AppError.forbidden(
      `Access denied: You are not authorized to perform actions on Company ${COMPANY_ID} service`,
    );
  }

  next();
}
