import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AttendanceController } from '../src/controllers/attendance.controller.js';

// Mock the attendance service module
vi.mock('../src/services/attendance.service.js', () => ({
  attendanceService: {
    getAttendanceReport: vi.fn(),
  },
}));

import { attendanceService } from '../src/services/attendance.service.js';

function createMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    headers: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('AttendanceController - getReport', () => {
  const controller = new AttendanceController();
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
  });

  it('should return 401 when user is not authenticated', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await controller.getReport(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Unauthorized',
    });
  });

  it('should return 400 when start_date or end_date are missing', async () => {
    const req = createMockReq({
      user: { companyId: 'company-A' },
      query: { start_date: '2026-01-01' }, // end_date missing
    });
    const res = createMockRes();

    await controller.getReport(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'start_date and end_date are required query parameters',
    });
  });

  it('should return 401 when authorization header is missing', async () => {
    const req = createMockReq({
      user: { companyId: 'company-A' },
      query: { start_date: '2026-01-01', end_date: '2026-01-31' },
      headers: {}, // No authorization header
    });
    const res = createMockRes();

    await controller.getReport(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Authorization header missing',
    });
  });

  it('should return 200 and report data on success', async () => {
    const mockReport = {
      employeeId: 'EMP-001',
      fullName: 'Test Employee',
      report: {
        totalOnTime: 10,
        totalLate: 1,
        totalAbsent: 0,
        totalLeaveApproved: 0,
        totalLeaveRejected: 0,
        totalLeavePending: 0,
        totalPermissionApproved: 0,
        totalPermissionRejected: 0,
        totalPermissionPending: 0,
      },
    };

    vi.mocked(attendanceService.getAttendanceReport).mockResolvedValue(mockReport as any);

    const req = createMockReq({
      user: { companyId: 'company-A' },
      query: { start_date: '2026-01-01', end_date: '2026-01-31', employeeId: 'EMP-001' },
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockRes();

    await controller.getReport(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: mockReport,
    });
    expect(attendanceService.getAttendanceReport).toHaveBeenCalledWith({
      companyId: 'company-A',
      employeeId: 'EMP-001',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      groupBy: undefined,
      token: 'valid-token',
    });
  });

  it('should pass errors to next()', async () => {
    const error = new Error('Service error');
    vi.mocked(attendanceService.getAttendanceReport).mockRejectedValue(error);

    const req = createMockReq({
      user: { companyId: 'company-A' },
      query: { start_date: '2026-01-01', end_date: '2026-01-31' },
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createMockRes();

    await controller.getReport(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
