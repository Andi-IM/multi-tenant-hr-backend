import axios, { isAxiosError } from 'axios';
import { DateTime } from 'luxon';
import { getAttendanceModel, type IAttendance } from '../models/attendance.model.js';
import { type ILeavePermissionRequest } from '../models/leave-permission.model.js';
import {
  type EmployeeStatusResponse,
  type EmployeeListResponse,
  employeeStatusResponseSchema,
  employeeListResponseSchema,
} from '../types/company-service.types.js';

export class AttendanceService {
  private companyServiceUrl: string;

  constructor() {
    this.companyServiceUrl = process.env.COMPANY_SERVICE_URL || 'http://localhost:3001';
  }

  /**
   * Check if employee is active and get schedule from Company Service
   */
  async verifyEmployeeStatus(
    employeeId: string,
    companyId: string,
    token: string
  ): Promise<EmployeeStatusResponse['data']> {
    try {
      const response = await axios.get<unknown>(
        `${this.companyServiceUrl}/api/v1/internal/employees/${employeeId}/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      // Validate response structure using Zod
      const result = employeeStatusResponseSchema.safeParse(response.data);

      if (!result.success) {
        throw new Error(`Invalid response format from Company Service: ${result.error.message}`);
      }

      const { status, data } = result.data;

      if (status !== 'success' || data.employmentStatus !== 'active') {
        throw new Error('Employee is not active');
      }

      return data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 403) {
        throw new Error('Forbidden: Employee is Inactive', { cause: error });
      }
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new Error('Employee not found', { cause: error });
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to verify employee status: ${message}`, { cause: error });
    }
  }

  /**
   * Process employee check-in
   */
  async checkIn(
    employeeId: string,
    companyId: string,
    token: string
  ): Promise<{ alreadyRecorded: boolean; attendance?: IAttendance }> {
    // 1. Get employee status and schedule
    const employeeData = await this.verifyEmployeeStatus(employeeId, companyId, token);
    const { workSchedule, timezone } = employeeData;

    // 2. Get current time in employee's timezone
    const now = DateTime.now().setZone(timezone);
    const todayDate = now.startOf('day').toJSDate();

    // 3. Get Attendance model
    const Attendance = getAttendanceModel();

    // 4. Check for existing check-in (Idempotency)
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: todayDate,
    });

    if (existingAttendance) {
      return { alreadyRecorded: true, attendance: existingAttendance };
    }

    // 5. Calculate status (On-Time vs Late)
    const status = this.calculateStatus(
      now,
      workSchedule.startTime,
      workSchedule.toleranceMinutes ?? 15
    );

    // 6. Save new check-in with immutable snapshot
    const newAttendance = new Attendance({
      employeeId,
      companyId,
      date: todayDate,
      checkInTime: now.toJSDate(),
      status,
      timezone: timezone,
      workScheduleSnapshot: {
        startTime: workSchedule.startTime,
        endTime: workSchedule.endTime,
        toleranceMinutes: workSchedule.toleranceMinutes,
        workDays: workSchedule.workDays,
      },
    });

    await newAttendance.save();

    return { alreadyRecorded: false, attendance: newAttendance };
  }

  /**
   * Process employee check-out
   */
  async checkOut(
    employeeId: string,
    companyId: string,
    token: string
  ): Promise<{ alreadyRecorded: boolean; attendance: IAttendance }> {
    // 1. Get employee status and schedule (timezone is crucial)
    const employeeData = await this.verifyEmployeeStatus(employeeId, companyId, token);
    const { timezone } = employeeData;

    // 2. Get current time in employee's timezone
    const now = DateTime.now().setZone(timezone);
    const todayDate = now.startOf('day').toJSDate();

    // 3. Get Attendance model
    const Attendance = getAttendanceModel();

    // 4. Find the attendance record for today
    const attendance = await Attendance.findOne({
      employeeId,
      date: todayDate,
    });

    // 5. If no check-in found, throw 404
    if (!attendance) {
      throw new Error('Check-in record not found for today');
    }

    // 6. Handle Idempotency (if already checked out, just return success)
    if (attendance.checkOutTime) {
      return { alreadyRecorded: true, attendance };
    }

    // 7. Update check-out time
    attendance.checkOutTime = now.toJSDate();
    await attendance.save();

    return { alreadyRecorded: false, attendance };
  }

  /**
   * Calculate if the check-in is on-time or late with configurable grace period
   */
  private calculateStatus(
    checkInTime: DateTime,
    startTimeStr: string,
    toleranceMinutes: number
  ): 'on-time' | 'late' {
    if (!startTimeStr || !startTimeStr.includes(':')) {
      throw new Error(`Invalid start time format: ${startTimeStr}`);
    }

    const [hours, minutes] = startTimeStr.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid hours or minutes in start time: ${startTimeStr}`);
    }

    const scheduledStartTime = checkInTime.set({
      hour: hours as number,
      minute: minutes as number,
      second: 0,
      millisecond: 0,
    });

    if (!scheduledStartTime.isValid) {
      throw new Error(`Failed to create a valid scheduled start time from: ${startTimeStr}`);
    }

    const gracePeriodEnd = scheduledStartTime.plus({ minutes: toleranceMinutes });

    return checkInTime <= gracePeriodEnd ? 'on-time' : 'late';
  }

  /**
   * Internal Service-to-Service: Fetch all active employees for a company
   */
  async fetchActiveEmployees(
    companyId: string,
    token: string
  ): Promise<EmployeeListResponse['data']> {
    try {
      const response = await axios.get<unknown>(
        `${this.companyServiceUrl}/api/v1/internal/employees`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      const result = employeeListResponseSchema.safeParse(response.data);
      if (!result.success) {
        throw new Error(`Invalid response format from Company Service: ${result.error.message}`);
      }

      return result.data.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch employees: ${message}`, { cause: error });
    }
  }

  /**
   * Generate Attendance Report for one or all employees in a company
   */
  async getAttendanceReport(params: {
    companyId: string;
    employeeId?: string;
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
    token: string;
  }) {
    const { companyId, employeeId, startDate, endDate, groupBy, token } = params;

    // 1. Fetch relevant employees and their schedules
    let employees: Array<{
      employeeId: string;
      fullName: string;
      workSchedule: {
        startTime: string;
        endTime: string;
        toleranceMinutes: number;
        workDays: number[];
      };
      timezone: string;
    }>;

    if (employeeId) {
      const emp = await this.verifyEmployeeStatus(employeeId, companyId, token);
      employees = [
        {
          employeeId: emp.employeeId,
          fullName: 'Employee', // fullName not returned by verifyEmployeeStatus in original SDD, but we'll adapt
          workSchedule: emp.workSchedule,
          timezone: emp.timezone,
        },
      ];
    } else {
      employees = await this.fetchActiveEmployees(companyId, token);
    }

    // 2. Determine date range
    const start = DateTime.fromISO(startDate).startOf('day');
    const end = DateTime.fromISO(endDate).endOf('day');

    if (!start.isValid || !end.isValid) {
      throw new Error('Invalid start_date or end_date');
    }

    // 3. Prepare data from both collections
    const AttendanceModel = getAttendanceModel();
    const LeavePermissionModel = (
      await import('../models/leave-permission.model.js')
    ).getLeavePermissionRequestModel();

    const [attendances, requests] = await Promise.all([
      AttendanceModel.find({
        companyId,
        ...(employeeId && { employeeId }),
        date: { $gte: start.toJSDate(), $lte: end.toJSDate() },
      }).lean(),
      LeavePermissionModel.find({
        companyId,
        ...(employeeId && { employeeId }),
        $or: [
          { startDate: { $gte: start.toJSDate(), $lte: end.toJSDate() } },
          { endDate: { $gte: start.toJSDate(), $lte: end.toJSDate() } },
          { startDate: { $lte: start.toJSDate() }, endDate: { $gte: end.toJSDate() } },
        ],
        status: { $in: ['approved', 'pending', 'rejected'] }, // We need all to count
      }).lean(),
    ]);

    // 4. Calculate report per employee
    const result = employees.map((emp) => {
      const empAttendances = attendances.filter((a) => a.employeeId === emp.employeeId);
      const empRequests = requests.filter((r) => r.employeeId === emp.employeeId);

      const reportData = this.calculateEmployeeStats({
        employee: emp,
        attendances: empAttendances,
        requests: empRequests,
        start,
        end,
        groupBy,
      });

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        report: reportData,
      };
    });

    return employeeId ? result[0] : result;
  }

  /**
   * Helper to calculate stats for a single employee
   */
  private calculateEmployeeStats(params: {
    employee: {
      employeeId: string;
      fullName: string;
      workSchedule: {
        startTime: string;
        endTime: string;
        toleranceMinutes: number;
        workDays: number[];
      };
      timezone: string;
    };
    attendances: IAttendance[];
    requests: ILeavePermissionRequest[];
    start: DateTime;
    end: DateTime;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const { employee, attendances, requests, start, end, groupBy } = params;

    if (!groupBy) {
      return this.aggregateRange(attendances, requests, employee, start, end);
    }

    // If groupBy is set, we need to bucket by period
    const buckets: Record<string, ReturnType<typeof this.aggregateRange>> = {};
    let current = start;

    while (current <= end) {
      let bucketKey: string;
      let next: DateTime;

      if (groupBy === 'day') {
        bucketKey = current.toISODate()!;
        next = current.plus({ days: 1 });
      } else if (groupBy === 'week') {
        bucketKey = `Year ${current.weekYear}, Week ${current.weekNumber}`;
        next = current.plus({ weeks: 1 }).startOf('week');
      } else {
        bucketKey = current.toFormat('yyyy-MM');
        next = current.plus({ months: 1 }).startOf('month');
      }

      const periodEnd = next < end ? next.minus({ millisecond: 1 }) : end;

      const periodAttendances = attendances.filter((a) => {
        const d = DateTime.fromJSDate(a.date);
        return d >= current && d <= periodEnd;
      });

      const periodRequests = requests.filter((r) => {
        const s = DateTime.fromJSDate(r.startDate || r.createdAt);
        const e = DateTime.fromJSDate(r.endDate || r.startDate || r.createdAt);
        return s <= periodEnd && e >= current;
      });

      buckets[bucketKey] = {
        period: bucketKey,
        ...this.aggregateRange(periodAttendances, periodRequests, employee, current, periodEnd),
      };

      current = next;
    }

    return Object.values(buckets);
  }

  /**
   * Core aggregation logic for a specific range
   */
  private aggregateRange(
    attendances: IAttendance[],
    requests: ILeavePermissionRequest[],
    employee: {
      employeeId: string;
      fullName: string;
      workSchedule: {
        startTime: string;
        endTime: string;
        toleranceMinutes: number;
        workDays: number[];
      };
      timezone: string;
    },
    start: DateTime,
    end: DateTime
  ) {
    const stats: {
      period?: string;
      totalOnTime: number;
      totalLate: number;
      totalAbsent: number;
      totalLeaveApproved: number;
      totalLeaveRejected: number;
      totalLeavePending: number;
      totalPermissionApproved: number;
      totalPermissionRejected: number;
      totalPermissionPending: number;
    } = {
      totalOnTime: 0,
      totalLate: 0,
      totalAbsent: 0,
      totalLeaveApproved: 0,
      totalLeaveRejected: 0,
      totalLeavePending: 0,
      totalPermissionApproved: 0,
      totalPermissionRejected: 0,
      totalPermissionPending: 0,
    };

    // Calculate specific status counts
    attendances.forEach((a) => {
      if (a.status === 'on-time') stats.totalOnTime++;
      else if (a.status === 'late') stats.totalLate++;
    });

    requests.forEach((r) => {
      const field = `total${r.type === 'leave' ? 'Leave' : 'Permission'}${
        r.status.charAt(0).toUpperCase() + r.status.slice(1)
      }` as keyof typeof stats;
      if (stats[field] !== undefined) {
        (stats[field] as number)++;
      }
    });

    // Calculate absences: Working Days WITHOUT (Attendance OR Approved Leave/Permission)
    let current = start.startOf('day');
    const last = end.startOf('day');

    while (current <= last) {
      const isWorkingDay = employee.workSchedule.workDays.includes(
        current.weekday === 7 ? 0 : current.weekday
      );
      if (isWorkingDay) {
        const hasAttendance = attendances.some((a) =>
          DateTime.fromJSDate(a.date).hasSame(current, 'day')
        );
        const hasApprovedRequest = requests.some((r) => {
          if (r.status !== 'approved') return false;
          const s = DateTime.fromJSDate(r.startDate || r.createdAt).startOf('day');
          const e = DateTime.fromJSDate(r.endDate || r.startDate || r.createdAt).startOf('day');
          return current >= s && current <= e;
        });

        if (!hasAttendance && !hasApprovedRequest) {
          stats.totalAbsent++;
        }
      }
      current = current.plus({ days: 1 });
    }

    return stats;
  }

  /**
   * Get attendance records with filtering, pagination, and company isolation
   */
  async getAttendances(params: {
    companyId: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }): Promise<{
    attendances: IAttendance[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { companyId, employeeId, startDate, endDate, page, limit } = params;
    const Attendance = getAttendanceModel();
    const query: {
      companyId: string;
      employeeId?: string;
      date?: Record<string, Date>;
    } = { companyId };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = DateTime.fromISO(startDate);
        if (start.isValid) {
          query.date.$gte = start.startOf('day').toJSDate();
        }
      }
      if (endDate) {
        const end = DateTime.fromISO(endDate);
        if (end.isValid) {
          query.date.$lte = end.endOf('day').toJSDate();
        }
      }
    }

    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      Attendance.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Attendance.countDocuments(query),
    ]);

    return {
      attendances: attendances as unknown as IAttendance[],
      total,
      page,
      limit,
    };
  }
}

export const attendanceService = new AttendanceService();
