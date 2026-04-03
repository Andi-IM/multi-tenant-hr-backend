import axios, { isAxiosError } from 'axios';
import { DateTime } from 'luxon';
import { getTenantConnection } from '../config/database.js';
import { getAttendanceModel, type IAttendance } from '../models/attendance.model.js';

interface EmployeeStatusResponse {
  status: string;
  data: {
    employmentStatus: string;
    workSchedule: {
      startTime: string;
      endTime: string;
      workingDays: string[];
    };
    timezone: string;
  };
}

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
      const response = await axios.get<EmployeeStatusResponse>(
        `${this.companyServiceUrl}/api/v1/internal/employees/${employeeId}/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      if (response.data.status !== 'success' || response.data.data.employmentStatus !== 'ACTIVE') {
        throw new Error('Employee is not active');
      }

      return response.data.data;
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
   * Calculate if the check-in is on-time or late with 15-minute grace period
   */
  private calculateStatus(
    checkInTime: DateTime,
    startTimeStr: string,
    _timezone: string
  ): 'On-Time' | 'Late' {
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const scheduledStartTime = checkInTime.set({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    });

    // 15 minutes grace period
    const gracePeriodEnd = scheduledStartTime.plus({ minutes: 15 });

    return checkInTime <= gracePeriodEnd ? 'On-Time' : 'Late';
  }
}

export const attendanceService = new AttendanceService();
