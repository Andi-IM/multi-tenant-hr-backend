import { Schema, type Model, type Document } from 'mongoose';
import { getDatabaseConnection } from '../config/database.js';

export type RequestType = 'leave' | 'permission';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface ILeavePermissionRequest extends Document {
  employeeId: string;
  companyId: string;
  type: RequestType;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  status: RequestStatus;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeavePermissionRequestSchema = new Schema<ILeavePermissionRequest>(
  {
    employeeId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    type: { type: String, enum: ['leave', 'permission'], required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    reason: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true,
      default: 'pending',
    },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

LeavePermissionRequestSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
LeavePermissionRequestSchema.index({ status: 1 });
LeavePermissionRequestSchema.index({ companyId: 1, status: 1 });

export const getLeavePermissionRequestModel = (): Model<ILeavePermissionRequest> => {
  const connection = getDatabaseConnection();
  return connection.model<ILeavePermissionRequest>(
    'LeavePermissionRequest',
    LeavePermissionRequestSchema
  );
};
