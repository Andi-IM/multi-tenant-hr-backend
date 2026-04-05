import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateTestToken } from './helpers/generate-token.js';
import { employeeRepository } from '../src/repositories/employee.repository.js';

// Mock the employee repository to avoid real database calls during unit tests
vi.mock('../src/repositories/employee.repository.js', () => ({
  employeeRepository: {
    create: vi.fn(),
    findByEmployeeId: vi.fn(),
    updateByEmployeeId: vi.fn(),
    list: vi.fn(),
  },
}));

describe('POST /api/v1/employees', () => {
  const validPayload = {
    employeeId: 'EMP-A-001',
    fullName: 'Test Employee',
    companyId: 'A',
    joinDate: '2025-01-15T00:00:00.000Z',
    employmentStatus: 'active',
    workSchedule: {
      startTime: '09:00',
      endTime: '17:00',
      toleranceMinutes: 15,
      workDays: [1, 2, 3, 4, 5],
    },
    timezone: 'Asia/Jakarta',
    role: 'EMPLOYEE',
    password: 'password123',
  };

  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 and create an employee successfully', async () => {
    // Mock the created employee returned by Mongoose
    const mockCreatedEmployee = {
      _id: { toString: () => 'mock-id' },
      employeeId: validPayload.employeeId,
      fullName: validPayload.fullName,
      companyId: validPayload.companyId,
      joinDate: new Date(validPayload.joinDate),
      status: 'active',
      workSchedule: {
        startTime: validPayload.workSchedule.startTime,
        endTime: validPayload.workSchedule.endTime,
        toleranceMinutes: validPayload.workSchedule.toleranceMinutes,
        workDays: validPayload.workSchedule.workDays,
      },
      timezone: validPayload.timezone,
      role: validPayload.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // @ts-ignore
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);

    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.employeeId).toBe(validPayload.employeeId);
    expect(response.body.data.workSchedule.startTime).toBe(validPayload.workSchedule.startTime);
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app).post('/api/v1/employees').send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('No token provided');
  });

  it('should return 403 if admin is from Company B', async () => {
    // Token from Company B
    const tokenB = generateTestToken({ companyId: 'B', role: 'ADMIN_HR' });

    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(validPayload);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
  });

  it('should return 403 if token matches but body companyId targets another company', async () => {
    // Token is Company A (matches service), but body says Company C
    const crossCompanyPayload = { ...validPayload, companyId: 'C' };

    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(crossCompanyPayload);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Cannot create employee for company "C"');
  });

  it('should return 400 for validation errors (e.g., invalid email)', async () => {
    const invalidPayload = { ...validPayload, fullName: '' }; // Too short

    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.errors).toBeDefined();
  });
});

describe('PATCH /api/v1/employees/:employeeId', () => {
  const employeeId = 'EMP-A-001';
  const updatePayload = {
    fullName: 'Jane Doe Updated',
    employmentStatus: 'inactive',
  };
  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and update an employee successfully', async () => {
    const mockUpdatedEmployee = {
      _id: { toString: () => 'mock-id' },
      employeeId,
      fullName: updatePayload.fullName,
      companyId: 'A',
      joinDate: new Date(),
      status: updatePayload.employmentStatus,
      workSchedule: {
        startTime: '09:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
      timezone: 'Asia/Jakarta',
      role: 'EMPLOYEE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(mockUpdatedEmployee);

    const response = await request(app)
      .patch(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(updatePayload);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data.fullName).toBe(updatePayload.fullName);
    expect(response.body.data.status).toBe(updatePayload.employmentStatus);
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app).patch(`/api/v1/employees/${employeeId}`).send(updatePayload);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('No token provided');
  });

  it('should return 403 if admin is from another company', async () => {
    const tokenB = generateTestToken({ companyId: 'B', role: 'ADMIN_HR' });

    const response = await request(app)
      .patch(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ fullName: 'Cross Company Update' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
    expect(employeeRepository.updateByEmployeeId).not.toHaveBeenCalled();
  });

  it('should return 404 if employee is not found', async () => {
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/employees/NON-EXISTENT`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(updatePayload);

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });
});

describe('GET /api/v1/employees/:employeeId', () => {
  const employeeId = 'EMP-A-001';
  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with full employee details', async () => {
    const mockEmployee = {
      _id: { toString: () => 'mock-id' },
      employeeId,
      fullName: 'John Doe',
      companyId: 'A',
      joinDate: new Date(),
      status: 'active',
      workSchedule: {
        startTime: '09:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
      timezone: 'Asia/Jakarta',
      role: 'EMPLOYEE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // @ts-ignore
    vi.mocked(employeeRepository.findByEmployeeId).mockResolvedValue(mockEmployee);

    const response = await request(app)
      .get(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data.employeeId).toBe(employeeId);
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app).get(`/api/v1/employees/${employeeId}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('No token provided');
  });

  it('should return 403 if admin is from another company', async () => {
    const tokenB = generateTestToken({ companyId: 'B', role: 'ADMIN_HR' });

    const response = await request(app)
      .get(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
  });
});

describe('GET /api/v1/employees', () => {
  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and a paginated list of employees', async () => {
    const mockResult = {
      data: [
        {
          _id: 'id-1',
          employeeId: 'EMP-A-001',
          fullName: 'John Doe',
          companyId: 'A',
          joinDate: new Date(),
          status: 'active',
          workSchedule: { startTime: '09:00', endTime: '17:00', toleranceMinutes: 15, workDays: [1, 2] },
          timezone: 'Asia/Jakarta',
          role: 'EMPLOYEE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    };

    // @ts-ignore
    vi.mocked(employeeRepository.list).mockResolvedValue(mockResult);

    const response = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
  });
});
