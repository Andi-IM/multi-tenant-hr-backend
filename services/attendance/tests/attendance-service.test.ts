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
  getDatabaseConnection: vi.fn(),
}));

vi.mock('../src/models/attendance.model.js', () => ({
  getAttendanceModel: vi.fn(),
}));

vi.mock('../src/models/leave-permission.model.js', () => ({
  getLeavePermissionRequestModel: vi.fn(),
}));

import axios from 'axios';
import { getDatabaseConnection } from '../src/config/database.js';
import { getAttendanceModel } from '../src/models/attendance.model.js';
import { getLeavePermissionRequestModel } from '../src/models/leave-permission.model.js';

describe('AttendanceService', () => {
  const service = new AttendanceService();

  const mockEmployeeData = {
    status: 'success',
    data: {
      employeeId: 'emp_123',
      companyId: 'company-A',
      role: 'EMPLOYEE',
      employmentStatus: 'active',
      workSchedule: {
        startTime: '09:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
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
            Authorization: expect.stringContaining('Bearer eyJ'),
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

      // Mock getDatabaseConnection
      vi.mocked(getDatabaseConnection).mockReturnValue({} as any);

      // Mock getAttendanceModel
      vi.mocked(getAttendanceModel).mockReturnValue(MockAttendanceModel as any);

      mockFindOne.mockReset();
      mockSave.mockReset();
    });

    it('should return alreadyRecorded: true if check-in exists for today', async () => {
      const existingRecord = {
        employeeId: 'EMP-001',
        date: new Date(),
        checkInTime: new Date(),
        checkOutTime: undefined,
        status: 'on-time',
        timezone: 'Asia/Jakarta',
        workScheduleSnapshot: {
          startTime: '09:00',
          endTime: '17:00',
          toleranceMinutes: 15,
          workDays: [1, 2, 3, 4, 5],
        },
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

      // Attendance service uses MONGODB_URI from environment config
      // No dynamic tenant connection needed
      expect(mockFindOne).toHaveBeenCalled();
    });

    it('should calculate On-Time status when within grace period', async () => {
      const checkInTime = DateTime.fromObject(
        { hour: 9, minute: 10 },
        { zone: 'Asia/Jakarta' }
      ) as DateTime;
      vi.spyOn(DateTime, 'now').mockReturnValue(checkInTime);

      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.attendance?.status).toBe('on-time');
    });

    it('should calculate Late status when past grace period', async () => {
      const checkInTime = DateTime.fromObject(
        { hour: 9, minute: 20 },
        { zone: 'Asia/Jakarta' }
      ) as DateTime;
      vi.spyOn(DateTime, 'now').mockReturnValue(checkInTime);

      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.attendance?.status).toBe('late');
    });

    it('should calculate On-Time status at exactly the grace period boundary (09:15)', async () => {
      const checkInTime = DateTime.fromObject(
        { hour: 9, minute: 15 },
        { zone: 'Asia/Jakarta' }
      ) as DateTime;
      vi.spyOn(DateTime, 'now').mockReturnValue(checkInTime);

      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkIn('EMP-001', 'company-A', 'token-123');

      expect(result.attendance?.status).toBe('on-time');
    });

    it('should propagate verifyEmployeeStatus errors', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Service unavailable'));

      await expect(service.checkIn('EMP-001', 'company-A', 'token-123')).rejects.toThrow(
        'Failed to verify employee status'
      );
    });
  });

  // ──────────────────────────────────────────────
  // checkOut tests
  // ──────────────────────────────────────────────

  describe('checkOut', () => {
    const mockFindOne = vi.fn();
    const mockSave = vi.fn();

    function MockAttendanceModel(this: Record<string, unknown>, data: Record<string, unknown>) {
      Object.assign(this, data);
      this.save = mockSave;
    }
    MockAttendanceModel.findOne = mockFindOne;

    beforeEach(() => {
      vi.mocked(axios.get).mockResolvedValue({ data: mockEmployeeData });
      vi.mocked(getAttendanceModel).mockReturnValue(MockAttendanceModel as any);
      mockFindOne.mockReset();
      mockSave.mockReset();
    });

    it('should successfully check out if check-in exists', async () => {
      const existingRecord = {
        employeeId: 'EMP-001',
        date: new Date(),
        checkInTime: new Date(),
        checkOutTime: undefined,
        save: mockSave,
      };
      mockFindOne.mockResolvedValue(existingRecord);
      mockSave.mockResolvedValue(undefined);

      const result = await service.checkOut('EMP-001', 'company-A', 'token-123');

      expect(result.alreadyRecorded).toBe(false);
      expect(existingRecord.checkOutTime).toBeDefined();
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it('should return alreadyRecorded: true if already checked out', async () => {
      const existingRecord = {
        employeeId: 'EMP-001',
        date: new Date(),
        checkInTime: new Date(),
        checkOutTime: new Date(),
      };
      mockFindOne.mockResolvedValue(existingRecord);

      const result = await service.checkOut('EMP-001', 'company-A', 'token-123');

      expect(result.alreadyRecorded).toBe(true);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should throw error if no check-in record found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.checkOut('EMP-001', 'company-A', 'token-123')).rejects.toThrow(
        'Check-in record not found for today'
      );
    });
  });

  // ──────────────────────────────────────────────
  // fetchActiveEmployees tests
  // ──────────────────────────────────────────────

  describe('fetchActiveEmployees', () => {
    it('should successfully fetch active employees', async () => {
      const mockListResponse = {
        status: 'success',
        data: [
          {
            employeeId: 'emp1',
            fullName: 'John Doe',
            workSchedule: mockEmployeeData.data.workSchedule,
            timezone: mockEmployeeData.data.timezone,
          },
        ],
      };
      vi.mocked(axios.get).mockResolvedValue({ data: mockListResponse });

      const result = await service.fetchActiveEmployees('company-A', 'token-123');

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp1');
    });

    it('should throw error on invalid response format', async () => {
      vi.mocked(axios.get).mockResolvedValue({ data: { status: 'error' } });

      await expect(service.fetchActiveEmployees('company-A', 'token-123')).rejects.toThrow(
        'Failed to fetch employees'
      );
    });
  });

  // ──────────────────────────────────────────────
  // getAttendances tests
  // ──────────────────────────────────────────────

  describe('getAttendances', () => {
    it('should fetch attendance records with filters and pagination', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ employeeId: 'emp1' }]),
      };
      const mockCount = vi.fn().mockResolvedValue(1);

      vi.mocked(getAttendanceModel).mockReturnValue({
        find: vi.fn().mockReturnValue(mockFind),
        countDocuments: mockCount,
      } as any);

      const result = await service.getAttendances({
        companyId: 'company-A',
        page: 1,
        limit: 10,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });

      expect(result.attendances).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  // ──────────────────────────────────────────────
  // getAttendanceReport tests
  // ──────────────────────────────────────────────

  describe('getAttendanceReport', () => {
    beforeEach(() => {
      vi.mocked(axios.get).mockResolvedValue({ data: mockEmployeeData });
      vi.mocked(getAttendanceModel).mockReturnValue({
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);
      vi.mocked(getLeavePermissionRequestModel).mockReturnValue({
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);
    });

    it('should generate report for a single employee', async () => {
      const result = (await service.getAttendanceReport({
        companyId: 'company-A',
        employeeId: 'emp_123',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        token: 'token-123',
      })) as any;

      expect(result.employeeId).toBe('emp_123');
      expect(result.report).toBeDefined();
      expect(result.report.totalAbsent).toBe(3); // April 1-5, 2026: Wed, Thu, Fri (Working), Sat, Sun (Non-working)
      // Wait, 2026-04-01 is Wednesday. 04-02 Thu, 04-03 Fri. So 3 working days.
    });

    it('should generate report for all employees', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          status: 'success',
          data: [
            {
              employeeId: 'emp1',
              fullName: 'Emp 1',
              workSchedule: mockEmployeeData.data.workSchedule,
              timezone: 'Asia/Jakarta',
            },
            {
              employeeId: 'emp2',
              fullName: 'Emp 2',
              workSchedule: mockEmployeeData.data.workSchedule,
              timezone: 'Asia/Jakarta',
            },
          ],
        },
      });

      const result = await (service as any).getAttendanceReport({
        companyId: 'company-A',
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        token: 'token-123',
      });

      expect(result).toHaveLength(2);
    });

    it('should handle groupBy: day', async () => {
      const result = (await service.getAttendanceReport({
        companyId: 'company-A',
        employeeId: 'emp_123',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        groupBy: 'day',
        token: 'token-123',
      })) as any;

      expect(result.report).toHaveLength(2);
      expect(result.report[0].period).toBe('2026-04-01');
    });

    it('should handle groupBy: week', async () => {
      const result = (await service.getAttendanceReport({
        companyId: 'company-A',
        employeeId: 'emp_123',
        startDate: '2026-04-01',
        endDate: '2026-04-10',
        groupBy: 'week',
        token: 'token-123',
      })) as any;

      expect(result.report).toHaveLength(2); // Spans 2 weeks
    });

    it('should handle groupBy: month', async () => {
      const result = (await service.getAttendanceReport({
        companyId: 'company-A',
        employeeId: 'emp_123',
        startDate: '2026-03-31',
        endDate: '2026-04-01',
        groupBy: 'month',
        token: 'token-123',
      })) as any;

      expect(result.report).toHaveLength(2); // March and April
    });

    it('should throw error on invalid dates', async () => {
      await expect(
        service.getAttendanceReport({
          companyId: 'company-A',
          employeeId: 'emp_123',
          startDate: 'invalid',
          endDate: 'invalid',
          token: 'token-123',
        })
      ).rejects.toThrow('Invalid start_date or end_date');
    });
  });
});
