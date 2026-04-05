import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { generateTestToken } from './helpers/generate-token.js';
import { employeeRepository } from '../src/repositories/employee.repository.js';

// Mock the employee repository to avoid real database calls during unit tests
vi.mock('../src/repositories/employee.repository.js', () => ({
  employeeRepository: {
    findActiveEmployeeForInternal: vi.fn(),
  },
}));

describe('GET /api/v1/internal/employees/:employeeId/status', () => {
  const employeeId = 'EMP-A-001';
  const systemToken = generateTestToken({ companyId: 'A', role: 'SYSTEM_ACTOR' });
  const adminToken = generateTestToken({ companyId: 'A', role: 'ADMIN_HR' });

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

  it('should return 200 and employee status details for SYSTEM_ACTOR', async () => {
    // @ts-ignore
    vi.mocked(employeeRepository.findActiveEmployeeForInternal).mockResolvedValue(mockEmployee);

    const response = await request(app)
      .get(`/api/v1/internal/employees/${employeeId}/status`)
      .set('Authorization', `Bearer ${systemToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data.employeeId).toBe('EMP-A-001');
    expect(response.body.data.companyId).toBe('A');
    expect(response.body.data.role).toBe('EMPLOYEE');
    expect(response.body.data.employmentStatus).toBe('active');
    expect(response.body.data.workSchedule.startTime).toBe('09:00');
    expect(response.body.data.workSchedule.endTime).toBe('17:00');
    expect(response.body.data.workSchedule.toleranceMinutes).toBe(15);
    expect(response.body.data.workSchedule.workDays).toEqual([1, 2, 3, 4, 5]);
    expect(response.body.data.timezone).toBe('Asia/Jakarta');
  });

  it('should return 403 Forbidden if employee is INACTIVE', async () => {
    const inactiveEmployee = { ...mockEmployee, status: 'inactive' };
    // @ts-ignore
    vi.mocked(employeeRepository.findActiveEmployeeForInternal).mockResolvedValue(inactiveEmployee);

    const response = await request(app)
      .get(`/api/v1/internal/employees/${employeeId}/status`)
      .set('Authorization', `Bearer ${systemToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Employee is Inactive');
  });

  it('should return 404 Not Found if employee does not exist', async () => {
    vi.mocked(employeeRepository.findActiveEmployeeForInternal).mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/v1/internal/employees/NON-EXISTENT/status`)
      .set('Authorization', `Bearer ${systemToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });

  it('should return 403 Forbidden if caller is not SYSTEM_ACTOR (e.g., ADMIN_HR)', async () => {
    const response = await request(app)
      .get(`/api/v1/internal/employees/${employeeId}/status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Insufficient permissions');
  });

  it('should return 401 Unauthorized if no token is provided', async () => {
    const response = await request(app).get(`/api/v1/internal/employees/${employeeId}/status`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('No token provided');
  });
});
