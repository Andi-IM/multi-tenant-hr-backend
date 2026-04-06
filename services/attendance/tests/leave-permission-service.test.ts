import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { isAxiosError } from 'axios';
import { LeavePermissionService } from '../src/services/leave-permission.service.js';

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      ...actual,
      get: vi.fn(),
    },
  };
});

vi.mock('../src/models/leave-permission.model.js', () => ({
  getLeavePermissionRequestModel: vi.fn(),
}));

const mockedAxios = axios as any;

describe('LeavePermissionService', () => {
  let service: LeavePermissionService;

  const validEmployeeResponse = {
    status: 'success',
    data: {
      employeeId: 'EMP-001',
      companyId: 'company-A',
      role: 'EMPLOYEE',
      employmentStatus: 'active',
      timezone: 'Asia/Jakarta',
      workSchedule: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LeavePermissionService();
  });

  describe('verifyEmployeeStatus', () => {
    it('should return employee data when employee is active', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: validEmployeeResponse });

      const result = await service.verifyEmployeeStatus('EMP-001', 'company-A', 'valid-token');

      expect(result.employeeId).toBe('EMP-001');
      expect(result.employmentStatus).toBe('active');
    });

    it('should throw error when employee is inactive', async () => {
      const inactiveResponse = {
        status: 'success',
        data: {
          employeeId: 'EMP-001',
          companyId: 'company-A',
          role: 'EMPLOYEE',
          employmentStatus: 'inactive',
          timezone: 'Asia/Jakarta',
          workSchedule: {
            startTime: '08:00',
            endTime: '17:00',
            toleranceMinutes: 15,
            workDays: [1, 2, 3, 4, 5],
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: inactiveResponse });

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'valid-token')
      ).rejects.toThrow('Employee is not active');
    });

    it('should throw error when Company Service returns 403', async () => {
      const axiosError = new Error('Forbidden');
      axiosError.name = 'AxiosError';
      (axiosError as any).isAxiosError = true;
      (axiosError as any).response = { status: 403 };

      mockedAxios.get.mockRejectedValueOnce(axiosError);

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'valid-token')
      ).rejects.toThrow('Forbidden: Employee is Inactive');
    });

    it('should throw error when Company Service returns 404', async () => {
      const axiosError = new Error('Not Found');
      axiosError.name = 'AxiosError';
      (axiosError as any).isAxiosError = true;
      (axiosError as any).response = { status: 404 };

      mockedAxios.get.mockRejectedValueOnce(axiosError);

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'valid-token')
      ).rejects.toThrow('Employee not found');
    });

    it('should throw error when Company Service returns invalid format', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { invalid: 'data' } });

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'valid-token')
      ).rejects.toThrow('Invalid response format from Company Service');
    });

    it('should throw error when generic error occurs', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'valid-token')
      ).rejects.toThrow('Failed to verify employee status: Network Error');
    });
  });

  describe('createLeaveRequest', () => {
    it('should throw error when startDate > endDate', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: validEmployeeResponse });

      await expect(
        service.createLeaveRequest(
          'EMP-001',
          'company-A',
          new Date('2026-04-15'),
          new Date('2026-04-10'),
          'valid-token'
        )
      ).rejects.toThrow('Start date must be before or equal to end date');
    });

    it('should throw 409 conflict when overlapping approved request exists', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: validEmployeeResponse });

      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');
      vi.mocked(getLeavePermissionRequestModel).mockReturnValueOnce({
        findOne: vi.fn().mockResolvedValueOnce({ _id: 'existing-req' }),
      } as any);

      await expect(
        service.createLeaveRequest(
          'EMP-001',
          'company-A',
          new Date('2026-04-10'),
          new Date('2026-04-12'),
          'valid-token'
        )
      ).rejects.toThrow('Conflict with existing approved request');
    });

    it('should create leave request successfully when no overlap', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: validEmployeeResponse });

      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockSave = vi.fn().mockResolvedValueOnce({ _id: 'new-req', type: 'leave' });
      const mockFindOne = vi.fn().mockResolvedValueOnce(null);

      function MockModel(this: any, data: any) {
        Object.assign(this, data);
        this.save = mockSave;
      }
      MockModel.findOne = mockFindOne;

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(MockModel as any);

      const result = await service.createLeaveRequest(
        'EMP-001',
        'company-A',
        new Date('2026-04-10'),
        new Date('2026-04-12'),
        'valid-token'
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result.type).toBe('leave');
    });
  });

  describe('createPermissionRequest', () => {
    it('should throw error when reason is empty', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: validEmployeeResponse });

      await expect(
        service.createPermissionRequest('EMP-001', 'company-A', '', 'valid-token')
      ).rejects.toThrow('Reason is required for permission request');
    });

    it('should throw error when reason is only whitespace', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: validEmployeeResponse });

      await expect(
        service.createPermissionRequest('EMP-001', 'company-A', '   ', 'valid-token')
      ).rejects.toThrow('Reason is required for permission request');
    });

    it('should create permission request successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: validEmployeeResponse });

      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockSave = vi.fn().mockResolvedValueOnce({ _id: 'new-req', type: 'permission' });
      function MockModel(this: any, data: any) {
        Object.assign(this, data);
        this.save = mockSave;
      }

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(MockModel as any);

      const result = await service.createPermissionRequest(
        'EMP-001',
        'company-A',
        'Feeling unwell',
        'valid-token'
      );

      expect(mockSave).toHaveBeenCalled();
      expect(result.type).toBe('permission');
    });
  });

  describe('getRequests', () => {
    it('should fetch requests for EMPLOYEE role', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockData = [{ _id: '1', employeeId: 'EMP-001' }];
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce(mockData),
      };

      const mockModel = {
        find: vi.fn().mockReturnValue(mockFind),
        countDocuments: vi.fn().mockResolvedValueOnce(1),
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(mockModel as any);

      const result = await service.getRequests('EMP-001', 'company-A', 'EMPLOYEE', {});

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'EMP-001' })
      );
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });

    it('should fetch requests for ADMIN_HR role', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockModel = {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValueOnce([]),
        }),
        countDocuments: vi.fn().mockResolvedValueOnce(0),
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(mockModel as any);

      await service.getRequests('EMP-001', 'company-A', 'ADMIN_HR', {});

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-A' })
      );
    });

    it('should apply status and type filters', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockModel = {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValueOnce([]),
        }),
        countDocuments: vi.fn().mockResolvedValueOnce(0),
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(mockModel as any);

      await service.getRequests('EMP-001', 'company-A', 'ADMIN_HR', {
        type: 'leave',
        status: 'pending',
      });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'leave',
          status: 'pending',
        })
      );
    });

    it('should apply date range filters', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockModel = {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValueOnce([]),
        }),
        countDocuments: vi.fn().mockResolvedValueOnce(0),
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(mockModel as any);

      await service.getRequests('EMP-001', 'company-A', 'ADMIN_HR', {
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          },
        })
      );
    });
  });

  describe('approveRequest', () => {
    it('should approve request successfully', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockSave = vi.fn().mockResolvedValueOnce({});
      const mockRequest = {
        _id: 'req-1',
        companyId: 'company-A',
        status: 'pending',
        save: mockSave,
      };

      const mockModel = {
        findById: vi.fn().mockResolvedValueOnce(mockRequest),
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(mockModel as any);

      const result = await service.approveRequest('req-1', 'admin-1', 'company-A');

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('admin-1');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error if request not found', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue({
        findById: vi.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(service.approveRequest('req-1', 'admin-1', 'company-A')).rejects.toThrow(
        'Request not found'
      );
    });

    it('should throw error if companyId does not match', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockRequest = {
        _id: 'req-1',
        companyId: 'company-B',
        status: 'pending',
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue({
        findById: vi.fn().mockResolvedValueOnce(mockRequest),
      } as any);

      await expect(service.approveRequest('req-1', 'admin-1', 'company-A')).rejects.toThrow(
        'Request not found'
      );
    });

    it('should throw error if status is not pending', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockRequest = {
        _id: 'req-1',
        companyId: 'company-A',
        status: 'approved',
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue({
        findById: vi.fn().mockResolvedValueOnce(mockRequest),
      } as any);

      await expect(service.approveRequest('req-1', 'admin-1', 'company-A')).rejects.toThrow(
        'Request already processed'
      );
    });
  });

  describe('rejectRequest', () => {
    it('should reject request successfully', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      const mockSave = vi.fn().mockResolvedValueOnce({});
      const mockRequest = {
        _id: 'req-1',
        companyId: 'company-A',
        status: 'pending',
        save: mockSave,
      };

      const mockModel = {
        findById: vi.fn().mockResolvedValueOnce(mockRequest),
      };

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue(mockModel as any);

      const result = await service.rejectRequest('req-1', 'admin-1', 'company-A');

      expect(result.status).toBe('rejected');
      expect(result.approvedBy).toBe('admin-1');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error if request not found', async () => {
      const { getLeavePermissionRequestModel } =
        await import('../src/models/leave-permission.model.js');

      vi.mocked(getLeavePermissionRequestModel).mockReturnValue({
        findById: vi.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(service.rejectRequest('req-1', 'admin-1', 'company-A')).rejects.toThrow(
        'Request not found'
      );
    });
  });
});
