import cron from 'node-cron';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import { getAttendanceModel } from '../models/attendance.model.js';

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
      console.log('[AttendanceTask] Running daily incomplete status check...');
      await this.markIncompleteAttendances();
    });
  }

  /**
   * Mark attendances with missing check-out from previous days as 'Incomplete'
   * This now runs on the single shared database.
   */
  public async markIncompleteAttendances() {
    try {
      const Attendance = getAttendanceModel();
      const today = DateTime.now().startOf('day').toJSDate();

      console.log(`[AttendanceTask] Marking incomplete attendances before ${today.toISOString()}`);

      const result = await Attendance.updateMany(
        {
          date: { $lt: today },
          checkOut: { $exists: false },
          status: { $ne: 'Incomplete' },
        },
        {
          $set: { status: 'Incomplete' },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[AttendanceTask] Marked ${result.modifiedCount} attendances as Incomplete across all tenants`
        );
      } else {
        console.log('[AttendanceTask] No incomplete attendances found to process');
      }
    } catch (error) {
      console.error('[AttendanceTask] Error in markIncompleteAttendances:', error);
    }
  }
}

export const attendanceTaskService = new AttendanceTaskService();
