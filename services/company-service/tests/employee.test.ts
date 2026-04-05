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

describe('POST /api/employees', () => {
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
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.employeeId).toBe(validPayload.employeeId);
    expect(response.body.data.workSchedule.startTime).toBe(validPayload.workSchedule.startTime); // Ensure reverse mapping works
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app).post('/api/employees').send(validPayload);

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

// ──────────────────────────────────────────────────────
// PATCH /api/employees/:employeeId — Integration Tests
// ──────────────────────────────────────────────────────

describe('PATCH /api/employees/:employeeId', () => {
  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  const mockUpdatedEmployee = {
    _id: 'mock-id',
    employeeId: 'EMP-A-001',
    fullName: 'Updated Employee Name',
    companyId: 'A',
    joinDate: new Date('2025-01-15T00:00:00.000Z'),
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and update employee with valid partial data', async () => {
    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(mockUpdatedEmployee);

    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ fullName: 'Updated Employee Name' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Employee updated successfully');
    expect(response.body.data.fullName).toBe('Updated Employee Name');
    expect(response.body.data.employeeId).toBe('EMP-A-001');
    expect(response.body.data.workSchedule.startTime).toBe('09:00');
  });

  it('should return 200 when updating workSchedule partially', async () => {
    const updatedMock = {
      ...mockUpdatedEmployee,
      workSchedule: {
        startTime: '08:00',
        endTime: '16:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
    };

    // @ts-ignore
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(updatedMock);

    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ workSchedule: { startTime: '08:00', endTime: '16:00' } });

    expect(response.status).toBe(200);
    expect(response.body.data.workSchedule.startTime).toBe('08:00');
    expect(response.body.data.workSchedule.endTime).toBe('16:00');
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .send({ fullName: 'No Auth' });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Missing or malformed Authorization header');
  });

  it('should return 403 if admin is from another company', async () => {
    const tokenB = generateTestToken({ companyId: 'B', role: 'ADMIN_HR' });

    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ fullName: 'Cross Company Update' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
    expect(employeeRepository.updateByEmployeeId).not.toHaveBeenCalled();
  });

  it('should return 404 if employee is not found', async () => {
    vi.mocked(employeeRepository.updateByEmployeeId).mockResolvedValue(null);

    const response = await request(app)
      .patch('/api/employees/EMP-NONEXISTENT')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ fullName: 'Ghost Employee' });

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });

  it('should return 400 for invalid time format in workSchedule', async () => {
    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ workSchedule: { startTime: '25:00' } });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('should return 400 for empty request body', async () => {
    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('should return 400 when sending immutable/unknown fields (strict mode)', async () => {
    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ employeeId: 'EMP-X-999', fullName: 'Valid Name' });

    expect(response.status).toBe(400);
    // Zod strict mode rejects unrecognized keys
    expect(response.body.errors).toBeDefined();
  });

  it('should return 400 when sending companyId (disallowed for update)', async () => {
    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ companyId: 'A', fullName: 'Valid Name' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('should return 400 for invalid employmentStatus enum value', async () => {
    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ employmentStatus: 'TERMINATED' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('should return 400 for invalid timezone', async () => {
    const response = await request(app)
      .patch('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ timezone: 'Invalid/Timezone' });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });
});

// ──────────────────────────────────────────────────────
// GET /api/employees/:employeeId — Integration Tests
// ──────────────────────────────────────────────────────

describe('GET /api/employees/:employeeId', () => {
  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  const mockEmployee = {
    _id: 'mock-id',
    employeeId: 'EMP-A-001',
    fullName: 'Test Employee',
    companyId: 'A',
    joinDate: new Date('2025-01-15T00:00:00.000Z'),
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with full employee details', async () => {
    // @ts-ignore
    vi.mocked(employeeRepository.findByEmployeeId).mockResolvedValue(mockEmployee);

    const response = await request(app)
      .get('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.employeeId).toBe('EMP-A-001');
    expect(response.body.data.fullName).toBe('Test Employee');
    expect(response.body.data.companyId).toBe('A');
    expect(response.body.data.employmentStatus).toBe('active');
    expect(response.body.data.workSchedule).toEqual({
      startTime: '09:00',
      endTime: '17:00',
      toleranceMinutes: 15,
      workDays: [1, 2, 3, 4, 5],
    });
    expect(response.body.data.timezone).toBe('Asia/Jakarta');
    expect(response.body.data.role).toBe('EMPLOYEE');
    expect(response.body.data.createdAt).toBeDefined();
    expect(response.body.data.updatedAt).toBeDefined();
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app).get('/api/employees/EMP-A-001');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Missing or malformed Authorization header');
  });

  it('should return 403 if admin is from another company', async () => {
    const tokenB = generateTestToken({ companyId: 'B', role: 'ADMIN_HR' });

    const response = await request(app)
      .get('/api/employees/EMP-A-001')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access denied');
    expect(employeeRepository.findByEmployeeId).not.toHaveBeenCalled();
  });

  it('should return 404 if employee is not found', async () => {
    vi.mocked(employeeRepository.findByEmployeeId).mockResolvedValue(null);

    const response = await request(app)
      .get('/api/employees/EMP-NONEXISTENT')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });

  it('should call findByEmployeeId with the correct company context', async () => {
    // @ts-ignore
    vi.mocked(employeeRepository.findByEmployeeId).mockResolvedValue(mockEmployee);

    await request(app).get('/api/employees/EMP-A-001').set('Authorization', `Bearer ${validToken}`);

    // Verifies tenant isolation: the service's COMPANY_ID ('A') is passed, not from the URL
    expect(employeeRepository.findByEmployeeId).toHaveBeenCalledWith('A', 'EMP-A-001');
  });
});

// ──────────────────────────────────────────────────────
// GET /api/employees — Integration Tests
// ──────────────────────────────────────────────────────

describe('GET /api/employees', () => {
  const validToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 and a paginated list of employees', async () => {
    const mockEmployee = {
      _id: 'mock-id',
      employeeId: 'EMP-A-001',
      fullName: 'Test Employee 1',
      companyId: 'A',
      joinDate: new Date('2025-01-15T00:00:00.000Z'),
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
    vi.mocked(employeeRepository.list).mockResolvedValue({
      data: [mockEmployee] as any[],
      total: 1,
    });

    const response = await request(app)
      .get('/api/employees?page=1&limit=10&employmentStatus=active')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].employeeId).toBe('EMP-A-001');
    expect(response.body.meta).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    // Verify arguments passed to repository enforces tenant isolation ('A')
    expect(employeeRepository.list).toHaveBeenCalledWith(
      'A',
      { status: 'active' },
      { joinDate: -1 }, // Default sort
      0, // skip
      10 // limit
    );
  });

  it('should return 400 if pagination parameters are invalid', async () => {
    const response = await request(app)
      .get('/api/employees?page=-1&limit=150&sortBy=invalidField')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.message).toBe('Query validation failed');
    expect(response.body.errors.some((e: any) => e.field === 'page')).toBe(true);
    expect(response.body.errors.some((e: any) => e.field === 'limit')).toBe(true);
    expect(response.body.errors.some((e: any) => e.field === 'sortBy')).toBe(true);
  });
});
