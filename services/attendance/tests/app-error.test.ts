import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../src/errors/app-error.js';

describe('AppError', () => {
  it('should create an AppError with message and statusCode', () => {
    const error = new AppError('Test error', 400);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it('should allow non-operational errors', () => {
    const error = new AppError('System crash', 500, false);

    expect(error.isOperational).toBe(false);
  });

  // --- Static factory methods ---
  it('AppError.badRequest() should create a 400 error', () => {
    const error = AppError.badRequest('Invalid input');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
    expect(error.isOperational).toBe(true);
  });

  it('AppError.unauthorized() should create a 401 error with default message', () => {
    const error = AppError.unauthorized();

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication required');
  });

  it('AppError.unauthorized() should accept custom message', () => {
    const error = AppError.unauthorized('Token expired');

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Token expired');
  });

  it('AppError.forbidden() should create a 403 error with default message', () => {
    const error = AppError.forbidden();

    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Access denied');
  });

  it('AppError.notFound() should create a 404 error', () => {
    const error = AppError.notFound();

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
  });

  it('AppError.conflict() should create a 409 error', () => {
    const error = AppError.conflict('Already exists');

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Already exists');
  });

  it('AppError.internal() should create a 500 error', () => {
    const error = AppError.internal();

    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal server error');
  });
});
