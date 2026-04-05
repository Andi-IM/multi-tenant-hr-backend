import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateTime } from 'luxon';
import { attendanceService } from '../src/services/attendance.service.js';

const { mockAttendanceModel, mockLeaveModel } = vi.hoisted(() => ({
  mockAttendanceModel: { find: vi.fn() },
  mockLeaveModel: { find: vi.fn() },
}));

// Mock DB models
vi.mock('../src/models/attendance.model.js', () => ({
  getAttendanceModel: () => mockAttendanceModel,
}));

// Mock leave permission model
vi.mock('../src/models/leave-permission.model.js', () => ({
  getLeavePermissionRequestModel: () => mockLeaveModel,
}));

import { getAttendanceModel } from '../src/models/attendance.model.js';
import { getLeavePermissionRequestModel } from '../src/models/leave-permission.model.js';

describe('AttendanceService - getAttendanceReport logic', () => {
  // Use the same references
  const attendanceModel = getAttendanceModel();
  const leaveModel = getLeavePermissionRequestModel();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behavior for successful empty finds
    vi.mocked(mockAttendanceModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);
    vi.mocked(mockLeaveModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(attendanceService, 'verifyEmployeeStatus').mockResolvedValue({
      employeeId: 'EMP-001',
      companyId: 'company-A',
      role: 'EMPLOYEE',
      employmentStatus: 'active',
      workSchedule: {
        startTime: '08:00',
        endTime: '17:00',
        toleranceMinutes: 15,
        workDays: [1, 2, 3, 4, 5], // Mon-Fri
      },
      timezone: 'UTC',
    } as any);
  });

  it('should correctly calculate totals for a single employee', async () => {
    const startDate = '2026-01-01'; // Thursday (Work day)
    const endDate = '2026-01-05'; // Monday (Work day)

    const mockAttendances = [
      { employeeId: 'EMP-001', date: DateTime.fromISO('2026-01-01').toJSDate(), status: 'on-time' },
      { employeeId: 'EMP-001', date: DateTime.fromISO('2026-01-02').toJSDate(), status: 'late' },
    ];

    vi.mocked(mockAttendanceModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockAttendances),
    } as any);

    const report = (await attendanceService.getAttendanceReport({
      companyId: 'company-A',
      employeeId: 'EMP-001',
      startDate,
      endDate,
      token: 'token',
    })) as any;

    expect(report.employeeId).toBe('EMP-001');
    expect(report.report.totalOnTime).toBe(1);
    expect(report.report.totalLate).toBe(1);
    expect(report.report.totalAbsent).toBe(1); // Jan 5 is missing
  });

  it('should ignore absences on non-working days', async () => {
    const startDate = '2026-01-03'; // Sat
    const endDate = '2026-01-04'; // Sun

    const report = (await attendanceService.getAttendanceReport({
      companyId: 'company-A',
      employeeId: 'EMP-001',
      startDate,
      endDate,
      token: 'token',
    })) as any;

    expect(report.report.totalAbsent).toBe(0);
  });

  it('should NOT count absence if there is an approved leave', async () => {
    const startDate = '2026-01-05'; // Mon (Work day)
    const endDate = '2026-01-05';

    // Mock an approved leave for Jan 5
    const mockRequests = [
      {
        employeeId: 'EMP-001',
        type: 'leave',
        status: 'approved',
        startDate: DateTime.fromISO('2026-01-05').toJSDate(),
        endDate: DateTime.fromISO('2026-01-05').toJSDate(),
      },
    ];

    vi.mocked(mockLeaveModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockRequests),
    } as any);

    const report = (await attendanceService.getAttendanceReport({
      companyId: 'company-A',
      employeeId: 'EMP-001',
      startDate,
      endDate,
      token: 'token',
    })) as any;

    expect(report.report.totalAbsent).toBe(0);
    expect(report.report.totalLeaveApproved).toBe(1);
  });
});
