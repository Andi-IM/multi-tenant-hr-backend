import axios, { isAxiosError } from 'axios';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { getTenantConnection } from '../config/database.js';
import { getAttendanceModel, type IAttendance } from '../models/attendance.model.js';

// Zod schema for internal employee status verification
const employeeStatusResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    employmentStatus: z.string(),
    workSchedule: z.object({
      startTime: z.string(),
      endTime: z.string(),
      workingDays: z.array(z.string()),
    }),
    timezone: z.string(),
  }),
});

type EmployeeStatusResponse = z.infer<typeof employeeStatusResponseSchema>;

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

      if (status !== 'success' || data.employmentStatus !== 'ACTIVE') {
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

    // 3. Connect to tenant DB and get model
    const connection = getTenantConnection(companyId);
    const Attendance = getAttendanceModel(connection);

    // 4. Check for existing check-in (Idempotency)
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: todayDate,
    });

    if (existingAttendance) {
      return { alreadyRecorded: true, attendance: existingAttendance };
    }

    // 5. Calculate status (On-Time vs Late)
    const status = this.calculateStatus(now, workSchedule.startTime, timezone);

    // 6. Save new check-in
    const newAttendance = new Attendance({
      employeeId,
      companyId,
      date: todayDate,
      checkIn: now.toJSDate(),
      status,
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

    // 3. Connect to tenant DB and get model
    const connection = getTenantConnection(companyId);
    const Attendance = getAttendanceModel(connection);

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
    if (attendance.checkOut) {
      return { alreadyRecorded: true, attendance };
    }

    // 7. Update check-out time
    attendance.checkOut = now.toJSDate();
    await attendance.save();

    return { alreadyRecorded: false, attendance };
  }

  /**
   * Calculate if the check-in is on-time or late with 15-minute grace period
   */
  private calculateStatus(
    checkInTime: DateTime,
    startTimeStr: string,
    _timezone: string
  ): 'On-Time' | 'Late' {
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

    // 15 minutes grace period
    const gracePeriodEnd = scheduledStartTime.plus({ minutes: 15 });

    return checkInTime <= gracePeriodEnd ? 'On-Time' : 'Late';
  }
}

export const attendanceService = new AttendanceService();
