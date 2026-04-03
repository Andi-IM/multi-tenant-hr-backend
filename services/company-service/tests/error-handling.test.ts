import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/errors/app-error.js';
import type { Request, Response, NextFunction } from 'express';

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('errorHandler middleware', () => {
  it('should handle AppError with correct status and message', () => {
    const res = createMockRes();
    const err = AppError.badRequest('Invalid input');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Invalid input',
    });
  });

  it('should handle Prisma P2002 unique constraint error', () => {
    const res = createMockRes();
    const err: any = new Error('Unique constraint failed');
    err.code = 'P2002';

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'A record with this identifier already exists',
    });
  });

  it('should handle unknown errors with 500 and generic message', () => {
    const res = createMockRes();
    const err = new Error('Something unexpected happened');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal server error',
    });
  });
});

describe('AppError factory methods', () => {
  it('should create 400 Bad Request', () => {
    const err = AppError.badRequest('bad');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('bad');
    expect(err.isOperational).toBe(true);
  });

  it('should create 401 Unauthorized with default message', () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  it('should create 403 Forbidden with default message', () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
  });

  it('should create 404 Not Found with default message', () => {
    const err = AppError.notFound();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
  });

  it('should create 409 Conflict', () => {
    const err = AppError.conflict('duplicate');
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('duplicate');
  });

  it('should be an instance of Error', () => {
    const err = AppError.badRequest('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});
