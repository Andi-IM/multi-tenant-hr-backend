import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AttendanceController } from '../src/controllers/attendance.controller.js';

// Mock the attendance service module
vi.mock('../src/services/attendance.service.js', () => ({
  attendanceService: {
    checkIn: vi.fn(),
  },
}));

import { attendanceService } from '../src/services/attendance.service.js';

function createMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    headers: {},
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

describe('AttendanceController', () => {
  const controller = new AttendanceController();
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
  });

  // ──────────────────────────────────────────────
  // checkIn tests
  // ──────────────────────────────────────────────

  describe('checkIn', () => {
    it('should return 401 when user is not authenticated (no user on req)', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await controller.checkIn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
      });
    });

    it('should return 401 when authorization header is missing', async () => {
      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        headers: {}, // No authorization header
      });
      const res = createMockRes();

      await controller.checkIn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authorization header missing',
      });
    });

    it('should return 201 on successful new check-in', async () => {
      const mockAttendance = {
        employeeId: 'EMP-001',
        companyId: 'company-A',
        date: new Date(),
        checkIn: new Date(),
        status: 'On-Time',
      };

      vi.mocked(attendanceService.checkIn).mockResolvedValue({
        alreadyRecorded: false,
        attendance: mockAttendance as any,
      });

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        headers: { authorization: 'Bearer valid-token-123' },
      });
      const res = createMockRes();

      await controller.checkIn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Check-in successful',
        data: mockAttendance,
      });
    });

    it('should return 200 when check-in already recorded (idempotency)', async () => {
      const mockAttendance = {
        employeeId: 'EMP-001',
        companyId: 'company-A',
        date: new Date(),
        checkIn: new Date(),
        status: 'On-Time',
      };

      vi.mocked(attendanceService.checkIn).mockResolvedValue({
        alreadyRecorded: true,
        attendance: mockAttendance as any,
      });

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        headers: { authorization: 'Bearer valid-token-123' },
      });
      const res = createMockRes();

      await controller.checkIn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Check-in already recorded for today',
        data: mockAttendance,
      });
    });

    it('should return 403 when employee is inactive', async () => {
      vi.mocked(attendanceService.checkIn).mockRejectedValue(
        new Error('Forbidden: Employee is Inactive')
      );

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        headers: { authorization: 'Bearer valid-token-123' },
      });
      const res = createMockRes();

      await controller.checkIn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Forbidden: Employee is Inactive',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass unknown errors to next() (global error handler)', async () => {
      const unknownError = new Error('Database connection failed');
      vi.mocked(attendanceService.checkIn).mockRejectedValue(unknownError);

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        headers: { authorization: 'Bearer valid-token-123' },
      });
      const res = createMockRes();

      await controller.checkIn(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(unknownError);
    });

    it('should extract token from Bearer header correctly', async () => {
      vi.mocked(attendanceService.checkIn).mockResolvedValue({
        alreadyRecorded: false,
        attendance: {} as any,
      });

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        headers: { authorization: 'Bearer my-secret-token' },
      });
      const res = createMockRes();

      await controller.checkIn(req, res, mockNext);

      expect(attendanceService.checkIn).toHaveBeenCalledWith(
        'EMP-001',
        'company-A',
        'my-secret-token'
      );
    });
  });
});
