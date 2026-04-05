import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { LeavePermissionController } from '../src/controllers/leave-permission.controller.js';

vi.mock('../src/services/leave-permission.service.js', () => ({
  leavePermissionService: {
    createLeaveRequest: vi.fn(),
    createPermissionRequest: vi.fn(),
    getRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
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

      vi.mocked(leavePermissionService.createLeaveRequest).mockResolvedValue(mockRequest as any);

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
  });

  describe('getRequests', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req = createMockReq({ user: undefined });
      const res = createMockRes();

      await controller.getRequests(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
      });
    });

    it('should return 200 with data for EMPLOYEE (own requests only)', async () => {
      const mockData = [
        { _id: 'req-1', employeeId: 'EMP-001', status: 'pending' },
      ];
      vi.mocked(leavePermissionService.getRequests).mockResolvedValue({
        data: mockData as any,
        total: 1,
        page: 1,
        limit: 10,
      });

      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        query: {},
      });
      const res = createMockRes();

      await controller.getRequests(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockData,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should return 200 with data for ADMIN_HR (all requests)', async () => {
      const mockData = [
        { _id: 'req-1', employeeId: 'EMP-001', status: 'pending' },
        { _id: 'req-2', employeeId: 'EMP-002', status: 'approved' },
      ];
      vi.mocked(leavePermissionService.getRequests).mockResolvedValue({
        data: mockData as any,
        total: 2,
        page: 1,
        limit: 10,
      });

      const req = createMockReq({
        user: { id: 'ADMIN-001', companyId: 'company-A', role: 'ADMIN_HR' },
        query: { type: 'leave', status: 'pending' },
      });
      const res = createMockRes();

      await controller.getRequests(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(leavePermissionService.getRequests).toHaveBeenCalledWith(
        'ADMIN-001',
        'company-A',
        'ADMIN_HR',
        { type: 'leave', status: 'pending', page: 1, limit: 10 }
      );
    });
  });

  describe('approveRequest', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req = createMockReq({ user: undefined, params: { id: 'req-123' } });
      const res = createMockRes();

      await controller.approveRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user is not ADMIN_HR', async () => {
      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.approveRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied: Admin HR role required',
      });
    });

    it('should return 404 when request not found', async () => {
      vi.mocked(leavePermissionService.approveRequest).mockRejectedValue(
        new Error('Request not found')
      );

      const req = createMockReq({
        user: { id: 'ADMIN-001', companyId: 'company-A', role: 'ADMIN_HR' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.approveRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Request not found',
      });
    });

    it('should return 409 when request already processed', async () => {
      vi.mocked(leavePermissionService.approveRequest).mockRejectedValue(
        new Error('Request already processed')
      );

      const req = createMockReq({
        user: { id: 'ADMIN-001', companyId: 'company-A', role: 'ADMIN_HR' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.approveRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Request already processed',
      });
    });

    it('should return 200 with approved status when successful', async () => {
      const mockRequest = {
        _id: 'req-123',
        status: 'approved',
        approvedBy: 'ADMIN-001',
        approvedAt: new Date(),
      };
      vi.mocked(leavePermissionService.approveRequest).mockResolvedValue(mockRequest as any);

      const req = createMockReq({
        user: { id: 'ADMIN-001', companyId: 'company-A', role: 'ADMIN_HR' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.approveRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockRequest,
      });
      expect(mockRequest.status).toBe('approved');
    });
  });

  describe('rejectRequest', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req = createMockReq({ user: undefined, params: { id: 'req-123' } });
      const res = createMockRes();

      await controller.rejectRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user is not ADMIN_HR', async () => {
      const req = createMockReq({
        user: { id: 'EMP-001', companyId: 'company-A', role: 'EMPLOYEE' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.rejectRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied: Admin HR role required',
      });
    });

    it('should return 404 when request not found', async () => {
      vi.mocked(leavePermissionService.rejectRequest).mockRejectedValue(
        new Error('Request not found')
      );

      const req = createMockReq({
        user: { id: 'ADMIN-001', companyId: 'company-A', role: 'ADMIN_HR' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.rejectRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 when request already processed', async () => {
      vi.mocked(leavePermissionService.rejectRequest).mockRejectedValue(
        new Error('Request already processed')
      );

      const req = createMockReq({
        user: { id: 'ADMIN-001', companyId: 'company-A', role: 'ADMIN_HR' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.rejectRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 200 with rejected status when successful', async () => {
      const mockRequest = {
        _id: 'req-123',
        status: 'rejected',
        approvedBy: 'ADMIN-001',
        approvedAt: new Date(),
      };
      vi.mocked(leavePermissionService.rejectRequest).mockResolvedValue(mockRequest as any);

      const req = createMockReq({
        user: { id: 'ADMIN-001', companyId: 'company-A', role: 'ADMIN_HR' },
        params: { id: 'req-123' },
      });
      const res = createMockRes();

      await controller.rejectRequest(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRequest.status).toBe('rejected');
    });
  });
});
