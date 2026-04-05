import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateToken, authorizeCompany } from '../src/middleware/auth.middleware.js';
import { AppError } from '../src/errors/app-error.js';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../src/types/auth.types.js';
import { generateTestToken } from './helpers/generate-token.js';

function createMockReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    headers: {},
    ...overrides,
  } as AuthenticatedRequest;
}

const mockRes = {} as Response;

describe('authenticateToken middleware', () => {
  it('should throw 401 when Authorization header is missing', () => {
    const req = createMockReq({ headers: {} });
    const next = vi.fn();

    expect(() => authenticateToken(req, mockRes, next)).toThrow(AppError);
    expect(() => authenticateToken(req, mockRes, next)).toThrow('No token provided');
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw 401 when Authorization header does not start with Bearer', () => {
    const req = createMockReq({ headers: { authorization: 'Basic abc123' } });
    const next = vi.fn();

    expect(() => authenticateToken(req, mockRes, next)).toThrow('No token provided');
  });

  it('should throw 401 when token is invalid', () => {
    const req = createMockReq({
      headers: { authorization: 'Bearer invalid-token-here' },
    });
    const next = vi.fn();

    expect(() => authenticateToken(req, mockRes, next)).toThrow('Invalid token');
  });

  it('should attach user to req and call next() when token is valid', () => {
    const token = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });
    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const next = vi.fn();

    authenticateToken(req, mockRes, next);

    expect(req.user).toBeDefined();
    expect(req.user!.companyId).toBe('A');
    expect(req.user!.role).toBe('ADMIN_HR');
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('authorizeCompany middleware', () => {
  it('should throw 401 when req.user is not set', () => {
    const req = createMockReq(); // No user attached
    const next = vi.fn();

    expect(() => authorizeCompany(req, mockRes, next)).toThrow(AppError);
    expect(() => authorizeCompany(req, mockRes, next)).toThrow('Authentication required');
  });

  it('should throw 403 when user companyId does not match service COMPANY_ID', () => {
    const req = createMockReq();
    req.user = { userId: 'user-1', email: 'test@test.com', companyId: 'B', role: 'ADMIN_HR' };
    const next = vi.fn();

    expect(() => authorizeCompany(req, mockRes, next)).toThrow(AppError);

    try {
      authorizeCompany(req, mockRes, next);
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Access denied');
    }
  });

  it('should call next() when user companyId matches service COMPANY_ID', () => {
    const req = createMockReq();
    // Default COMPANY_ID is 'A' in the middleware
    req.user = { userId: 'user-1', email: 'test@test.com', companyId: 'A', role: 'ADMIN_HR' };
    const next = vi.fn();

    authorizeCompany(req, mockRes, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
