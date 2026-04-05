import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { LeavePermissionController } from '../src/controllers/leave-permission.controller.js';

vi.mock('../src/services/leave-permission.service.js', () => ({
  leavePermissionService: {
    createLeaveRequest: vi.fn(),
    createPermissionRequest: vi.fn(),
  },
}));

import { leavePermissionService } from '../src/services/leave-permission.service.js';

function createMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    headers: { authorization: 'Bearer valid-token' },
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

describe('LeavePermissionController', () => {
  const controller = new LeavePermissionController();
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
  });

  describe('createLeave', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req = createMockReq({ user: undefined });
      const res = createMockRes();

      await controller.createLeave(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
      });
    });

    it('should return 400 when startDate and endDate are missing', async () => {
      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: {},
      });
      const res = createMockRes();

      await controller.createLeave(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'startDate and endDate are required',
      });
    });

    it('should return 400 when startDate > endDate', async () => {
      vi.mocked(leavePermissionService.createLeaveRequest).mockRejectedValue(
        new Error('Start date must be before or equal to end date')
      );

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { startDate: '2026-04-15', endDate: '2026-04-10' },
      });
      const res = createMockRes();

      await controller.createLeave(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Start date must be before or equal to end date',
      });
    });

    it('should return 201 with status=pending on successful leave request', async () => {
      const mockRequest = {
        _id: 'req-123',
        employeeId: 'EMP-001',
        companyId: 'company-A',
        type: 'leave',
        startDate: new Date('2026-04-10'),
        endDate: new Date('2026-04-12'),
        status: 'pending',
      };

      vi.mocked(leavePermissionService.createLeaveRequest).mockResolvedValue(
        mockRequest as any
      );

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { startDate: '2026-04-10', endDate: '2026-04-12' },
      });
      const res = createMockRes();

      await controller.createLeave(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRequest,
      });
      expect(mockRequest.status).toBe('pending');
    });

    it('should return 409 when overlapping approved request exists', async () => {
      vi.mocked(leavePermissionService.createLeaveRequest).mockRejectedValue(
        new Error('Conflict with existing approved request')
      );

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { startDate: '2026-04-10', endDate: '2026-04-12' },
      });
      const res = createMockRes();

      await controller.createLeave(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Conflict with existing approved request',
      });
    });

    it('should return 403 when employee is inactive', async () => {
      vi.mocked(leavePermissionService.createLeaveRequest).mockRejectedValue(
        new Error('Employee is not active')
      );

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { startDate: '2026-04-10', endDate: '2026-04-12' },
      });
      const res = createMockRes();

      await controller.createLeave(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Employee is not active',
      });
    });
  });

  describe('createPermission', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req = createMockReq({ user: undefined });
      const res = createMockRes();

      await controller.createPermission(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
      });
    });

    it('should return 400 when reason is empty', async () => {
      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { reason: '' },
      });
      const res = createMockRes();

      await controller.createPermission(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Reason is required for permission request',
      });
    });

    it('should return 400 when reason is missing', async () => {
      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: {},
      });
      const res = createMockRes();

      await controller.createPermission(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Reason is required for permission request',
      });
    });

    it('should return 400 when reason is only whitespace', async () => {
      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { reason: '   ' },
      });
      const res = createMockRes();

      await controller.createPermission(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Reason is required for permission request',
      });
    });

    it('should return 201 with status=pending on successful permission request', async () => {
      const mockRequest = {
        _id: 'req-456',
        employeeId: 'EMP-001',
        companyId: 'company-A',
        type: 'permission',
        reason: 'Doctor appointment',
        status: 'pending',
      };

      vi.mocked(leavePermissionService.createPermissionRequest).mockResolvedValue(
        mockRequest as any
      );

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { reason: 'Doctor appointment' },
      });
      const res = createMockRes();

      await controller.createPermission(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRequest,
      });
      expect(mockRequest.status).toBe('pending');
    });

    it('should return 403 when employee is inactive', async () => {
      vi.mocked(leavePermissionService.createPermissionRequest).mockRejectedValue(
        new Error('Employee is not active')
      );

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        body: { reason: 'Doctor appointment' },
      });
      const res = createMockRes();

      await controller.createPermission(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Employee is not active',
      });
    });
  });
});