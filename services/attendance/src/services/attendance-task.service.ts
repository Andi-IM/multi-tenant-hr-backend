import cron from 'node-cron';
import { DateTime } from 'luxon';
import { attendanceService } from './attendance.service.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';

/**
 * Service to handle scheduled tasks for attendance
 */
export class AttendanceTaskService {
  /**
   * Initialize scheduled tasks
   */
  public init() {
    // Run every day at 00:05 AM
    cron.schedule('5 0 * * *', async () => {
      console.log('[AttendanceTask] Running daily maintenance jobs...');
      await this.markIncompleteAttendances();
      await this.markAbsentAttendances();
    });
  }

  /**
   * Mark attendances with missing check-out from previous days as 'incomplete'
   */
  public async markIncompleteAttendances() {
    try {
      const today = DateTime.now().startOf('day').toJSDate();

      console.log(`[AttendanceTask] Marking incomplete attendances before ${today.toISOString()}`);

      // We might need to add this method to repository if it becomes frequent
      const result = await attendanceRepository.updateManyAttendances(
        {
          date: { $lt: today },
          checkOutTime: { $exists: false },
          status: { $nin: ['incomplete', 'absent'] },
        },
        { $set: { status: 'incomplete' } }
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[AttendanceTask] Marked ${result.modifiedCount} attendances as Incomplete across all tenants`
        );
      }
    } catch (error: unknown) {
      console.error('[AttendanceTask] Error in markIncompleteAttendances:', error);
    }
  }

  /**
   * Automatically mark employees as 'absent' if no record found for yesterday's work day
   */
  public async markAbsentAttendances() {
    try {
      // Process for yesterday
      const yesterday = DateTime.now().minus({ days: 1 }).startOf('day');
      const yesterdayJS = yesterday.toJSDate();

      console.log(`[AttendanceTask] Checking for absences on ${yesterday.toISODate()}`);

      // We need to check for each company. In a real system, we might discover companies from a DB.
      // For this POC, we use the known Company A and B.
      const companies = ['A', 'B'];

      for (const companyId of companies) {
        try {
          // 1. Fetch all active employees from Company Service
          const employees = await attendanceService.fetchActiveEmployees(
            companyId,
            'SYSTEM_INTERNAL_TOKEN'
          );

          for (const emp of employees) {
            // 2. Check if yesterday was a working day for this employee
            const dayOfWeek = yesterday.setZone(emp.timezone).weekday;
            const normalizedDay = dayOfWeek === 7 ? 0 : dayOfWeek; // Adjust 7 (Sun) to 0

            const isWorkingDay = emp.workSchedule.workDays.includes(normalizedDay);
            if (!isWorkingDay) continue;

            // 3. Check for existing attendance
            const existingAttendance = await attendanceRepository.findOneAttendance({
              employeeId: emp.employeeId,
              date: yesterdayJS,
            });
            if (existingAttendance) continue;

            // 4. Check for approved leave/permission
            const hasApprovedLeave = await attendanceRepository.findOneLeaveRequest({
              employeeId: emp.employeeId,
              status: 'approved',
              startDate: { $lte: yesterdayJS },
              endDate: { $gte: yesterdayJS },
            });
            if (hasApprovedLeave) continue;

            // 5. Create absent record
            await attendanceRepository.createAttendance({
              employeeId: emp.employeeId,
              companyId,
              date: yesterdayJS,
              status: 'absent',
              timezone: emp.timezone,
              workScheduleSnapshot: emp.workSchedule,
            });

            console.log(
              `[AttendanceTask] Marked ${emp.employeeId} as absent for ${yesterday.toISODate()}`
            );
          }
        } catch (companyError: unknown) {
          console.error(
            `[AttendanceTask] Error processing absences for company ${companyId}:`,
            companyError
          );
        }
      }
    } catch (error: unknown) {
      console.error('[AttendanceTask] Critical error in markAbsentAttendances:', error);
    }
  }
}

export const attendanceTaskService = new AttendanceTaskService();
