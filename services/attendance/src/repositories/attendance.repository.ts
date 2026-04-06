import { type Model, type UpdateResult } from 'mongoose';
import { getAttendanceModel, type IAttendance } from '../models/attendance.model.js';
import {
  getLeavePermissionRequestModel,
  type ILeavePermissionRequest,
} from '../models/leave-permission.model.js';

export interface AttendanceReportStats {
  _id: {
    employeeId: string;
    period?: string;
  };
  totalOnTime: number;
  totalLate: number;
  totalIncomplete: number;
  totalAbsent: number;
}

export interface LeaveReportStats {
  _id: {
    employeeId: string;
    type: 'leave' | 'permission';
  };
  count: number;
}

export class AttendanceRepository {
  private getAttendanceModel(): Model<IAttendance> {
    return getAttendanceModel();
  }

  private getLeaveModel(): Model<ILeavePermissionRequest> {
    return getLeavePermissionRequestModel();
  }

  async findAttendance(query: Record<string, unknown>): Promise<IAttendance[]> {
    return this.getAttendanceModel().find(query).lean();
  }

  async findOneAttendance(query: Record<string, unknown>): Promise<IAttendance | null> {
    return this.getAttendanceModel().findOne(query);
  }

  async createAttendance(data: Partial<IAttendance>): Promise<IAttendance> {
    const AttendanceModel = this.getAttendanceModel();
    return new AttendanceModel(data).save();
  }

  async updateManyAttendances(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<UpdateResult> {
    return this.getAttendanceModel().updateMany(filter, update);
  }

  async countAttendances(query: Record<string, unknown>): Promise<number> {
    return this.getAttendanceModel().countDocuments(query);
  }

  async findLeaveRequests(
    query: Record<string, unknown>,
    options?: { skip?: number; limit?: number }
  ): Promise<ILeavePermissionRequest[]> {
    const skip = options?.skip ?? 0;
    const limit = options?.limit ?? 0;

    return this.getLeaveModel().find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }

  async findOneLeaveRequest(
    query: Record<string, unknown> | string
  ): Promise<ILeavePermissionRequest | null> {
    if (typeof query === 'string') {
      return this.getLeaveModel().findById(query);
    }
    return this.getLeaveModel().findOne(query);
  }

  async createLeaveRequest(
    data: Partial<ILeavePermissionRequest>
  ): Promise<ILeavePermissionRequest> {
    const LeaveModel = this.getLeaveModel();
    return new LeaveModel(data).save();
  }

  async countLeaveRequests(query: Record<string, unknown>): Promise<number> {
    return this.getLeaveModel().countDocuments(query);
  }

  async getReportAggregation(params: {
    companyId: string;
    employeeId?: string;
    startDate: Date;
    endDate: Date;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    attendanceStats: AttendanceReportStats[];
    leaveStats: LeaveReportStats[];
  }> {
    const { companyId, employeeId, startDate, endDate, groupBy } = params;

    const match: Record<string, unknown> = {
      companyId,
      date: { $gte: startDate, $lte: endDate },
    };

    if (employeeId) {
      match.employeeId = employeeId;
    }

    const group_id: Record<string, unknown> = { employeeId: '$employeeId' };
    if (groupBy === 'day') {
      group_id.period = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    } else if (groupBy === 'week') {
      group_id.period = {
        $concat: [
          'Year ',
          { $toString: { $isoWeekYear: '$date' } },
          ', Week ',
          { $toString: { $isoWeek: '$date' } },
        ],
      };
    } else if (groupBy === 'month') {
      group_id.period = { $dateToString: { format: '%Y-%m', date: '$date' } };
    }

    const attendanceStats = await this.getAttendanceModel().aggregate<AttendanceReportStats>([
      { $match: match },
      {
        $group: {
          _id: group_id,
          totalOnTime: {
            $sum: { $cond: [{ $eq: ['$status', 'on-time'] }, 1, 0] },
          },
          totalLate: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          totalIncomplete: {
            $sum: { $cond: [{ $eq: ['$status', 'incomplete'] }, 1, 0] },
          },
          totalAbsent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
          },
        },
      },
    ]);

    const leaveMatch: Record<string, unknown> = {
      companyId,
      status: 'approved',
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    };
    if (employeeId) leaveMatch.employeeId = employeeId;

    const leaveStats = await this.getLeaveModel().aggregate<LeaveReportStats>([
      { $match: leaveMatch },
      {
        $group: {
          _id: { employeeId: '$employeeId', type: '$type' },
          count: { $sum: 1 },
        },
      },
    ]);

    return { attendanceStats, leaveStats };
  }
}

export const attendanceRepository = new AttendanceRepository();
