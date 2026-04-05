import { Schema, type Model, type Document } from 'mongoose';
import { getDatabaseConnection } from '../config/database.js';

export type AttendanceStatus = 'on-time' | 'late' | 'absent' | 'incomplete';

export interface IWorkScheduleSnapshot {
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  workDays: number[];
}

export interface IAttendance extends Document {
  employeeId: string;
  companyId: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: AttendanceStatus;
  timezone: string;
  workScheduleSnapshot: IWorkScheduleSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: {
      type: String,
      enum: ['on-time', 'late', 'absent', 'incomplete'],
      required: true,
    },
    timezone: { type: String, required: true },
    workScheduleSnapshot: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      toleranceMinutes: { type: Number, required: true },
      workDays: { type: [Number], required: true },
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of employeeId + date (idempotency)
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const getAttendanceModel = (): Model<IAttendance> => {
  const connection = getDatabaseConnection();
  return connection.model<IAttendance>('Attendance', AttendanceSchema);
};
