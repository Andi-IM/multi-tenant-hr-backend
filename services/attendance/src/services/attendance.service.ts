import axios, { isAxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';
import {
  type EmployeeStatusResponse,
  type EmployeeListResponse,
  employeeStatusResponseSchema,
  employeeListResponseSchema,
} from '../types/company-service.types.js';
import {
  attendanceRepository,
  type AttendanceReportStats,
} from '../repositories/attendance.repository.js';
import { type IAttendance } from '../models/attendance.model.js';

export class AttendanceService {
  private companyServiceUrl: string;
  private jwtSecret: string;

  constructor() {
    this.companyServiceUrl = process.env.COMPANY_SERVICE_URL || 'http://localhost:3001';
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here';
  }

  private getSystemActorToken(companyId: string): string {
    return jwt.sign(
      {
        userId: 'attendance-service',
        employeeId: 'SYSTEM_ACTOR',
        email: 'attendance-service@local',
        role: 'SYSTEM_ACTOR',
        companyId,
      },
      this.jwtSecret,
      { expiresIn: '5m' }
    );
  }

  /**
   * Check if employee is active and get schedule from Company Service
   */
  async verifyEmployeeStatus(
    employeeId: string,
    companyId: string,
    _token: string
  ): Promise<EmployeeStatusResponse['data']> {
    try {
      const systemToken = this.getSystemActorToken(companyId);
      const response = await axios.get<unknown>(
        `${this.companyServiceUrl}/api/v1/internal/employees/${employeeId}/status`,
        {
          headers: {
            Authorization: `Bearer ${systemToken}`,
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
      throw new Error(`Failed to verify employee status: ${message}`, {
        cause: error,
      });
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

    // 3. Check for existing check-in (Idempotency)
    const existingAttendance = await attendanceRepository.findOneAttendance({
      employeeId,
      date: todayDate,
    });

    if (existingAttendance) {
      return {
        alreadyRecorded: true,
        attendance: existingAttendance,
      };
    }

    // 4. Calculate status (On-Time vs Late)
    const status = this.calculateStatus(
      now,
      workSchedule.startTime,
      workSchedule.toleranceMinutes ?? 15
    );

    // 5. Save new check-in with immutable snapshot via Repository
    const newAttendance = await attendanceRepository.createAttendance({
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

    return {
      alreadyRecorded: false,
      attendance: newAttendance,
    };
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

    // 3. Find the attendance record for today
    const attendance = await attendanceRepository.findOneAttendance({
      employeeId,
      date: todayDate,
    });

    // 4. If no check-in found, throw 404
    if (!attendance) {
      throw new Error('Check-in record not found for today');
    }

    // 5. Handle Idempotency (if already checked out, just return success)
    if (attendance.checkOutTime) {
      return {
        alreadyRecorded: true,
        attendance,
      };
    }

    // 6. Update check-out time
    attendance.checkOutTime = now.toJSDate();
    await attendance.save();

    return {
      alreadyRecorded: false,
      attendance,
    };
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

    const gracePeriodEnd = scheduledStartTime.plus({
      minutes: toleranceMinutes,
    });

    return checkInTime <= gracePeriodEnd ? 'on-time' : 'late';
  }

  /**
   * Internal Service-to-Service: Fetch all active employees for a company
   */
  async fetchActiveEmployees(
    companyId: string,
    _token: string
  ): Promise<EmployeeListResponse['data']> {
    try {
      const systemToken = this.getSystemActorToken(companyId);
      const response = await axios.get<unknown>(
        `${this.companyServiceUrl}/api/v1/internal/employees`,
        {
          headers: {
            Authorization: `Bearer ${systemToken}`,
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
      throw new Error(`Failed to fetch employees: ${message}`, {
        cause: error,
      });
    }
  }

  /**
   * Generate Attendance Report for one or all employees in a company
   * Uses MongoDB Aggregation Pipeline for high performance (REQ-POC-02).
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

    // Validate date inputs
    const start = DateTime.fromISO(startDate);
    const end = DateTime.fromISO(endDate);
    if (!start.isValid || !end.isValid) {
      throw new Error('Invalid start_date or end_date');
    }

    // 1. Fetch relevant employees
    let employeesList: Array<{
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
      employeesList = [emp];
    } else {
      employeesList = await this.fetchActiveEmployees(companyId, token);
    }

    // 2. Aggregate counts from MongoDB
    const { attendanceStats, leaveStats } = await attendanceRepository.getReportAggregation({
      companyId,
      employeeId,
      startDate: DateTime.fromISO(startDate).startOf('day').toJSDate(),
      endDate: DateTime.fromISO(endDate).endOf('day').toJSDate(),
      groupBy,
    });

    // 3. Map results back to employee list
    const result = employeesList.map((emp) => {
      // Filter stats for this employee
      const empAttendanceStats = attendanceStats.filter((s) => s._id.employeeId === emp.employeeId);
      const empLeaveStats = leaveStats.filter((l) => l._id.employeeId === emp.employeeId);

      const mapStat = (stat: AttendanceReportStats) => ({
        period: stat._id.period,
        totalOnTime: stat.totalOnTime,
        totalLate: stat.totalLate,
        totalIncomplete: stat.totalIncomplete,
        totalAbsent: stat.totalAbsent,
        totalLeaveApproved: empLeaveStats.find((l) => l._id.type === 'leave')?.count || 0,
        totalPermissionApproved: empLeaveStats.find((l) => l._id.type === 'permission')?.count || 0,
      });

      if (!groupBy) {
        // Flat report (sum up all grouped stats if any, though the repo aggregate with no groupBy returns one record)
        const merged = empAttendanceStats[0] || {
          totalOnTime: 0,
          totalLate: 0,
          totalIncomplete: 0,
          totalAbsent: 0,
        };
        return {
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          report: {
            totalOnTime: merged.totalOnTime,
            totalLate: merged.totalLate,
            totalIncomplete: merged.totalIncomplete,
            totalAbsent: merged.totalAbsent,
            totalLeaveApproved: empLeaveStats.find((l) => l._id.type === 'leave')?.count || 0,
            totalPermissionApproved:
              empLeaveStats.find((l) => l._id.type === 'permission')?.count || 0,
          },
        };
      }

      // Grouped report
      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        report: empAttendanceStats.map(mapStat),
      };
    });

    return employeeId ? result[0] : result;
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
    const query: Record<string, unknown> = { companyId };

    if (employeeId) query.employeeId = employeeId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = DateTime.fromISO(startDate);
        if (start.isValid) {
          (query.date as Record<string, unknown>).$gte = start.startOf('day').toJSDate();
        }
      }
      if (endDate) {
        const end = DateTime.fromISO(endDate);
        if (end.isValid) {
          (query.date as Record<string, unknown>).$lte = end.endOf('day').toJSDate();
        }
      }
    }

    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      attendanceRepository.findAttendance(query),
      attendanceRepository.countAttendances(query),
    ]);

    // Apply pagination in service layer as basic repo find doesn't include it yet
    return {
      attendances: attendances.slice(skip, skip + limit),
      total,
      page,
      limit,
    };
  }
}

export const attendanceService = new AttendanceService();
