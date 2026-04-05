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

      const result = await service.verifyEmployeeStatus(
        'EMP-001',
        'company-A',
        'valid-token'
      );

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

      const { getLeavePermissionRequestModel } = await import(
        '../src/models/leave-permission.model.js'
      );
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
  });
});