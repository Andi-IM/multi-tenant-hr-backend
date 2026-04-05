import { Schema, type Model, type Document } from 'mongoose';
import { getDatabaseConnection } from '../config/database.js';

export interface IAttendance extends Document {
  employeeId: string;
  companyId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: 'On-Time' | 'Late' | 'Absent' | 'Incomplete';
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: {
      type: String,
      enum: ['On-Time', 'Late', 'Absent', 'Incomplete'],
      required: true,
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
