import cron from 'node-cron';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import { getTenantConnection } from '../config/database.js';
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
   */
  public async markIncompleteAttendances() {
    try {
      // 1. Get all tenant databases
      const adminDb = mongoose.connection.useDb('admin').db;
      if (!adminDb) {
        console.error('[AttendanceTask] Could not access admin DB to list tenants');
        return;
      }

      const dbs = await adminDb.admin().listDatabases();
      const tenantDbs = dbs.databases
        .filter((db: { name: string }) => db.name.startsWith('tenant_'))
        .map((db: { name: string }) => db.name.replace('tenant_', ''));

      console.log(`[AttendanceTask] Found ${tenantDbs.length} tenants to process`);

      for (const companyId of tenantDbs) {
        await this.processTenantIncompleteAttendances(companyId);
      }
    } catch (error) {
      console.error('[AttendanceTask] Error in markIncompleteAttendances:', error);
    }
  }

  /**
   * Process a single tenant for incomplete attendances
   */
  private async processTenantIncompleteAttendances(companyId: string) {
    try {
      const connection = getTenantConnection(companyId);
      const Attendance = getAttendanceModel(connection);

      // Yesterday's end (in UTC, or we can just look for anything older than today)
      // Since it's running at 00:05, anything with date < today and checkOut null is incomplete
      const today = DateTime.now().startOf('day').toJSDate();

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
          `[AttendanceTask] [Tenant: ${companyId}] Marked ${result.modifiedCount} attendances as Incomplete`
        );
      }
    } catch (error) {
      console.error(`[AttendanceTask] Error processing tenant ${companyId}:`, error);
    }
  }
}

export const attendanceTaskService = new AttendanceTaskService();
