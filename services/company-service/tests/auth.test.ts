import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { employeeRepository } from '../src/repositories/employee.repository.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IEmployeeDocument } from '../src/models/employee.model.js';
import mongoose from 'mongoose';

vi.mock('../src/repositories/employee.repository.js', () => ({
  employeeRepository: {
    findByEmail: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('Auth Controller - Login', () => {
  const mockEmployee = {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN_HR',
    companyId: 'A',
  } as unknown as IEmployeeDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.COMPANY_ID = 'A';
  });

  it('should return 400 for missing email or password', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({});

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
    // Check if validation errors are returned for missing fields
    const fieldsWithErrors = response.body.errors.map((e: any) => e.field);
    expect(fieldsWithErrors).toContain('email');
    expect(fieldsWithErrors).toContain('password');
  });

  it('should return 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'invalid-email', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toBe('Validation failed');
  });

  it('should return 401 for non-existent email', async () => {
    vi.mocked(employeeRepository.findByEmail).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should return 401 for incorrect password', async () => {
    vi.mocked(employeeRepository.findByEmail).mockResolvedValue(mockEmployee);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should return 200 and token for valid credentials', async () => {
    vi.mocked(employeeRepository.findByEmail).mockResolvedValue(mockEmployee);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.expiresIn).toBe(3600);

    const decoded = jwt.verify(response.body.data.accessToken, 'test-secret') as any;
    expect(decoded.email).toBe(mockEmployee.email);
    expect(decoded.role).toBe(mockEmployee.role);
    expect(decoded.companyId).toBe(mockEmployee.companyId);
    expect(decoded.userId).toBe(mockEmployee._id.toString());
    expect(decoded.exp).toBeDefined();
  });
});
