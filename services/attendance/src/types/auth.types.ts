import { type Request } from 'express';

/**
 * Roles available in the system RBAC model.
 */
export type UserRole = 'ADMIN_HR' | 'EMPLOYEE' | 'APPROVER' | 'SYSTEM_ACTOR';

/**
 * JWT token payload structure.
 * Embedded into the token by the authentication system.
 */
export interface JwtUserPayload {
  id: string; // The user's ID
  role: UserRole;
  companyId: string;
}

/**
 * Extended Express Request that includes the authenticated user context.
 * Available after the `authenticateToken` middleware has run.
 */
export interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}
