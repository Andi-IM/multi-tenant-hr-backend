import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AttendanceController } from '../src/controllers/attendance.controller.js';

// Mock the attendance service module
vi.mock('../src/services/attendance.service.js', () => ({
  attendanceService: {
    checkIn: vi.fn(),
    checkOut: vi.fn(),
    getAttendances: vi.fn(),
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

describe('AttendanceController - listAttendances', () => {
  const controller = new AttendanceController();
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
  });

  it('should return 400 when companyId is missing in query', async () => {
    const req = createMockReq();
    const res = createMockRes();

    await controller.listAttendances(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'companyId query parameter is required for public access',
    });
  });

  it('should return 200 and list of attendances for ADMIN_HR', async () => {
    const mockResult = {
      attendances: [],
      total: 0,
      page: 1,
      limit: 10,
    };

    vi.mocked(attendanceService.getAttendances).mockResolvedValue(mockResult);

    const req = createMockReq({
      query: { companyId: 'company-A', page: '1', limit: '10' },
    });
    const res = createMockRes();

    await controller.listAttendances(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: mockResult,
    });
    expect(attendanceService.getAttendances).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-A',
      page: 1,
      limit: 10,
    }));
  });

  it('should pass filters to attendance service', async () => {
    const mockResult = {
      attendances: [],
      total: 0,
      page: 1,
      limit: 5,
    };

    vi.mocked(attendanceService.getAttendances).mockResolvedValue(mockResult);

    const req = createMockReq({
      query: { 
        companyId: 'company-A',
        employeeId: 'EMP-123', 
        startDate: '2024-01-01', 
        endDate: '2024-01-31',
        page: '1',
        limit: '5'
      },
    });
    const res = createMockRes();

    await controller.listAttendances(req, res, mockNext);

    expect(attendanceService.getAttendances).toHaveBeenCalledWith({
      companyId: 'company-A',
      employeeId: 'EMP-123',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      page: 1,
      limit: 5,
    });
  });
});
