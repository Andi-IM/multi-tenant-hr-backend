import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService } from '../src/services/attendance.service.js';
import { DateTime } from 'luxon';

// Mock dependencies
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      get: vi.fn(),
    },
  };
});

vi.mock('../src/config/database.js', () => ({
  getTenantConnection: vi.fn(),
}));

vi.mock('../src/models/attendance.model.js', () => ({
  getAttendanceModel: vi.fn(),
}));

import axios from 'axios';
import { getTenantConnection } from '../src/config/database.js';
import { getAttendanceModel } from '../src/models/attendance.model.js';

describe('AttendanceService', () => {
  const service = new AttendanceService();

  const mockEmployeeData = {
    status: 'success',
    data: {
      employmentStatus: 'ACTIVE',
      workSchedule: {
        startTime: '09:00',
        endTime: '17:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      timezone: 'Asia/Jakarta',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // verifyEmployeeStatus tests
  // ──────────────────────────────────────────────

  describe('verifyEmployeeStatus', () => {
    it('should return employee data when employee is ACTIVE', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: mockEmployeeData });

      const result = await service.verifyEmployeeStatus('EMP-001', 'company-A', 'token-123');

      expect(result).toEqual(mockEmployeeData.data);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/internal/employees/EMP-001/status'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token-123',
            'X-Company-ID': 'company-A',
          },
        })
      );
    });

    it('should throw when employee is not ACTIVE', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          status: 'success',
          data: { ...mockEmployeeData.data, employmentStatus: 'INACTIVE' },
        },
      });

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'token-123')
      ).rejects.toThrow('Employee is not active');
    });

    it('should throw when API response status is not success', async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: { status: 'error', data: mockEmployeeData.data },
      });

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'token-123')
      ).rejects.toThrow('Employee is not active');
    });

    it('should throw "Forbidden: Employee is Inactive" on 403 response', async () => {
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 403 };

      // Mock isAxiosError to return true
      const axiosModule = await import('axios');
      vi.spyOn(axiosModule, 'isAxiosError').mockReturnValue(true);

      vi.mocked(axios.get).mockRejectedValue(axiosError);

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'token-123')
      ).rejects.toThrow('Forbidden: Employee is Inactive');
    });

    it('should throw "Employee not found" on 404 response', async () => {
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 404 };

      const axiosModule = await import('axios');
      vi.spyOn(axiosModule, 'isAxiosError').mockReturnValue(true);

      vi.mocked(axios.get).mockRejectedValue(axiosError);

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'token-123')
      ).rejects.toThrow('Employee not found');
    });

    it('should wrap unknown errors with descriptive message', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Connection timeout'));

      await expect(
        service.verifyEmployeeStatus('EMP-001', 'company-A', 'token-123')
      ).rejects.toThrow('Failed to verify employee status: Connection timeout');
    });
  });

  // ──────────────────────────────────────────────
  // checkIn tests
  // ──────────────────────────────────────────────

  describe('checkIn', () => {
    const mockFindOne = vi.fn();
    const mockSave = vi.fn();

    // Create a proper constructor function that supports `new`
    function MockAttendanceModel(this: Record<string, unknown>, data: Record<string, unknown>) {
      Object.assign(this, data);
      this.save = mockSave;
    }
    MockAttendanceModel.findOne = mockFindOne;

    beforeEach(() => {
      // Mock verifyEmployeeStatus to return valid data
      vi.mocked(axios.get).mockResolvedValue({ data: mockEmployeeData });

      // Mock getTenantConnection
      vi.mocked(getTenantConnection).mockReturnValue({} as any);

      // Mock getAttendanceModel
      vi.mocked(getAttendanceModel).mockReturnValue(MockAttendanceModel as any);

      mockFindOne.mockReset();
      mockSave.mockReset();
    });

    it('should return alreadyRecorded: true if check-in exists for today', async () => {
      const existingRecord = {
        employeeId: 'EMP-001',
        date: new Date(),
        checkIn: new Date(),
        status: 'On-Time',
      };
      mockFindOne.mockResolvedValue(existingRecord);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.alreadyRecorded).toBe(true);
      expect(result.attendance).toEqual(existingRecord);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should create new check-in when no existing record', async () => {
      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.alreadyRecorded).toBe(false);
      expect(result.attendance).toBeDefined();
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it('should connect to correct tenant database', async () => {
      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(getTenantConnection).toHaveBeenCalledWith('company-A');
    });

    it('should calculate On-Time status when within grace period', async () => {
      // Set check-in time to exactly 09:10 (within 15-min grace period of 09:00)
      const checkInTime = DateTime.fromObject({ hour: 9, minute: 10 }, { zone: 'Asia/Jakarta' });
      vi.spyOn(DateTime, 'now').mockReturnValue(checkInTime);

      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.attendance?.status).toBe('On-Time');
    });

    it('should calculate Late status when past grace period', async () => {
      // Set check-in time to 09:20 (past 15-min grace period of 09:00)
      const checkInTime = DateTime.fromObject({ hour: 9, minute: 20 }, { zone: 'Asia/Jakarta' });
      vi.spyOn(DateTime, 'now').mockReturnValue(checkInTime);

      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.attendance?.status).toBe('Late');
    });

    it('should calculate On-Time status at exactly the grace period boundary (09:15)', async () => {
      const checkInTime = DateTime.fromObject({ hour: 9, minute: 15 }, { zone: 'Asia/Jakarta' });
      vi.spyOn(DateTime, 'now').mockReturnValue(checkInTime);

      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.attendance?.status).toBe('On-Time');
    });

    it('should propagate verifyEmployeeStatus errors', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Service unavailable'));

      await expect(service.checkIn('EMP-001', 'company-A', 'token-123')).rejects.toThrow(
        'Failed to verify employee status'
      );
    });
  });
});
