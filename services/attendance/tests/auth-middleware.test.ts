import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateToken, authorizeSystemActor } from '../src/middleware/auth.middleware.js';
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
    expect(() => authenticateToken(req, mockRes, next)).toThrow(
      'Missing or malformed Authorization header'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw 401 when Authorization header does not start with Bearer', () => {
    const req = createMockReq({ headers: { authorization: 'Basic abc123' } });
    const next = vi.fn();

    expect(() => authenticateToken(req, mockRes, next)).toThrow(
      'Missing or malformed Authorization header'
    );
  });

  it('should throw 401 when token is invalid', () => {
    const req = createMockReq({
      headers: { authorization: 'Bearer invalid-token-here' },
    });
    const next = vi.fn();

    expect(() => authenticateToken(req, mockRes, next)).toThrow('Invalid or expired token');
  });

  it('should attach user to req and call next() when token is valid', () => {
    const token = generateTestToken({ companyId: 'company-A', role: 'EMPLOYEE' });
    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const next = vi.fn();

    authenticateToken(req, mockRes, next);

    expect(req.user).toBeDefined();
    expect(req.user!.companyId).toBe('company-A');
    expect(req.user!.role).toBe('EMPLOYEE');
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('authorizeSystemActor middleware', () => {
  it('should throw 401 when req.user is not set', () => {
    const req = createMockReq();
    const next = vi.fn();

    expect(() => authorizeSystemActor(req, mockRes, next)).toThrow(AppError);
    expect(() => authorizeSystemActor(req, mockRes, next)).toThrow('Authentication required');
  });

  it('should throw 403 when user role is not SYSTEM_ACTOR', () => {
    const req = createMockReq();
    req.user = { id: 'user-1', companyId: 'company-A', role: 'EMPLOYEE' };
    const next = vi.fn();

    expect(() => authorizeSystemActor(req, mockRes, next)).toThrow(AppError);

    try {
      authorizeSystemActor(req, mockRes, next);
    } catch (err: unknown) {
      expect((err as AppError).statusCode).toBe(403);
      expect((err as AppError).message).toContain('Access denied');
    }
  });

  it('should call next() when user role is SYSTEM_ACTOR', () => {
    const req = createMockReq();
    req.user = { id: 'system-1', companyId: 'company-A', role: 'SYSTEM_ACTOR' };
    const next = vi.fn();

    authorizeSystemActor(req, mockRes, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
