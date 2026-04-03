import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateTestToken } from './helpers/generate-token.js';
import { employeeRepository } from '../src/repositories/employee.repository.js';
import { AppError } from '../src/errors/app-error.js';

// Mock the employee repository to avoid real database calls during unit tests
vi.mock('../src/repositories/employee.repository.js', () => ({
  employeeRepository: {
    create: vi.fn(),
    findByEmployeeId: vi.fn(),
  },
}));

describe('POST /api/employees', () => {
  const validPayload = {
    employeeId: 'EMP-A-001',
    fullName: 'Test Employee',
    companyId: 'A',
    joinDate: '2025-01-15T00:00:00.000Z',
    employmentStatus: 'ACTIVE',
    workSchedule: {
      startTime: '09:00',
      endTime: '17:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    timezone: 'Asia/Jakarta',
  };

  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 and create an employee successfully', async () => {
    // Mock the created employee returned by Mongoose
    const mockCreatedEmployee = {
      id: 'mock-id',
      employeeId: validPayload.employeeId,
      fullName: validPayload.fullName,
      companyId: validPayload.companyId,
      joinDate: new Date(validPayload.joinDate),
      status: 'ACTIVE',
      workSchedule: {
        shiftStart: validPayload.workSchedule.startTime,
        shiftEnd: validPayload.workSchedule.endTime,
        workingDays: validPayload.workSchedule.workingDays,
      },
      timezone: validPayload.timezone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // @ts-ignore
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);

    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.employeeId).toBe(validPayload.employeeId);
    expect(response.body.data.workSchedule.startTime).toBe(validPayload.workSchedule.startTime); // Ensure reverse mapping works
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app)
      .post('/api/employees')
      .send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Missing or malformed Authorization header');
  });

  it('should return 403 if admin is from Company B', async () => {
    // Token from Company B
    const tokenB = generateTestToken({ companyId: 'B', role: 'ADMIN_HR' });

    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(validPayload);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
  });

  it('should return 403 if token matches but body companyId targets another company', async () => {
    // Token is Company A (matches service), but body says Company C
    const crossCompanyPayload = { ...validPayload, companyId: 'C' };

    // @ts-ignore
    vi.mocked(employeeRepository.create).mockResolvedValue({});

    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(crossCompanyPayload);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Cannot create employee for company');
    expect(employeeRepository.create).not.toHaveBeenCalled();
  });


  it('should return 400 for validation error (missing required fields)', async () => {
    const invalidPayload = { ...validPayload };
    // @ts-ignore
    delete invalidPayload.fullName;

    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.some((e: any) => e.field === 'fullName')).toBe(true);
  });

  it('should return 400 for validation error (invalid enum)', async () => {
    const invalidPayload = { ...validPayload, employmentStatus: 'PENDING' };

    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors.some((e: any) => e.field === 'employmentStatus')).toBe(true);
  });

  it('should return 409 if employeeId already exists', async () => {
    // Mock the Mongoose E11000 duplicate key error
    const duplicateError: any = new Error('Duplicate key');
    duplicateError.code = 11000;
    duplicateError.keyPattern = { employeeId: 1 };
    
    vi.mocked(employeeRepository.create).mockRejectedValue(duplicateError);

    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validPayload);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('already exists');
  });
});
