import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateTime } from 'luxon';
import { attendanceService } from '../src/services/attendance.service.js';
import { attendanceRepository } from '../src/repositories/attendance.repository.js';

vi.mock('../src/repositories/attendance.repository.js', () => ({
  attendanceRepository: {
    getReportAggregation: vi.fn(),
    findOneAttendance: vi.fn(),
    createAttendance: vi.fn(),
    findAttendance: vi.fn(),
    countAttendances: vi.fn(),
  },
}));

describe('AttendanceService - getAttendanceReport (Refactored)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(attendanceService, 'verifyEmployeeStatus').mockResolvedValue({
      employeeId: 'EMP-001',
      fullName: 'John Doe',
      companyId: 'company-A',
      role: 'EMPLOYEE',
      employmentStatus: 'active',
      workSchedule: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
      },
      timezone: 'UTC',
    } as any);

    vi.spyOn(attendanceService, 'fetchActiveEmployees').mockResolvedValue([
      {
        employeeId: 'EMP-001',
        fullName: 'John Doe',
        workSchedule: {
          startTime: '08:00',
          endTime: '17:00',
          toleranceMinutes: 15,
          workDays: [1, 2, 3, 4, 5],
        },
        timezone: 'UTC',
      },
    ] as any);
  });

  it('should call repository aggregation and map results correctly', async () => {
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';

    vi.mocked(attendanceRepository.getReportAggregation).mockResolvedValue({
      attendanceStats: [
        {
          _id: { employeeId: 'EMP-001' },
          totalOnTime: 10,
          totalLate: 2,
          totalIncomplete: 1,
          totalAbsent: 5,
        },
      ],
      leaveStats: [
        { _id: { employeeId: 'EMP-001', type: 'leave' }, count: 2 },
        { _id: { employeeId: 'EMP-001', type: 'permission' }, count: 1 },
      ],
    });

    const report = (await attendanceService.getAttendanceReport({
      companyId: 'company-A',
      employeeId: 'EMP-001',
      startDate,
      endDate,
      token: 'token',
    })) as any;

    expect(attendanceRepository.getReportAggregation).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'EMP-001',
        companyId: 'company-A',
      })
    );

    expect(report.fullName).toBe('John Doe');
    expect(report.report.totalOnTime).toBe(10);
    expect(report.report.totalAbsent).toBe(5);
    expect(report.report.totalLeaveApproved).toBe(2);
    expect(report.report.totalPermissionApproved).toBe(1);
  });

  it('should handle groupBy: "day" correctly', async () => {
    vi.mocked(attendanceRepository.getReportAggregation).mockResolvedValue({
      attendanceStats: [
        {
          _id: { employeeId: 'EMP-001', period: '2026-01-01' },
          totalOnTime: 1,
          totalLate: 0,
          totalIncomplete: 0,
          totalAbsent: 0,
        },
        {
          _id: { employeeId: 'EMP-001', period: '2026-01-02' },
          totalOnTime: 0,
          totalLate: 1,
          totalIncomplete: 0,
          totalAbsent: 0,
        },
      ],
      leaveStats: [],
    });

    const report = (await attendanceService.getAttendanceReport({
      companyId: 'company-A',
      employeeId: 'EMP-001',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      groupBy: 'day',
      token: 'token',
    })) as any;

    expect(Array.isArray(report.report)).toBe(true);
    expect(report.report.length).toBe(2);
    expect(report.report[0].period).toBe('2026-01-01');
    expect(report.report[0].totalOnTime).toBe(1);
    expect(report.report[1].period).toBe('2026-01-02');
    expect(report.report[1].totalLate).toBe(1);
  });
});
