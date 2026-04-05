import { Schema, Document, Model } from 'mongoose';
import { getDatabaseConnection } from '../config/database.js';

export interface IWorkSchedule {
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  workDays: number[];
}

export type EmploymentStatus = 'active' | 'inactive' | 'terminated';
export type EmployeeRole = 'EMPLOYEE' | 'ADMIN_HR';

export interface IEmployee {
  _id: import('mongoose').Types.ObjectId;
  employeeId: string;
  fullName: string;
  email: string;
  companyId: string;
  joinDate: Date;
  status: EmploymentStatus;
  workSchedule: IWorkSchedule;
  timezone: string;
  role: EmployeeRole;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  deactivationDate?: Date;
}

// Extending mongoose Document for fully typed query results
export interface IEmployeeDocument extends IEmployee, Document {}

export const EmployeeSchema: Schema<IEmployeeDocument> = new Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    companyId: { type: String, required: true },
    joinDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated'],
      required: true,
      default: 'active',
    },
    workSchedule: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      toleranceMinutes: { type: Number, default: 15 },
      workDays: [{ type: Number, required: true }],
    },
    timezone: { type: String, required: true },
    role: { type: String, enum: ['EMPLOYEE', 'ADMIN_HR'], required: true },
    passwordHash: { type: String, required: true },
    deactivationDate: { type: Date, required: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as { passwordHash?: string }).passwordHash;
        delete (ret as { __v?: number }).__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete (ret as { passwordHash?: string }).passwordHash;
        delete (ret as { __v?: number }).__v;
        return ret;
      },
    },
  }
);

/**
 * Returns the Employee model initialized over the database connection.
 */
export const getEmployeeModel = (): Model<IEmployeeDocument> => {
  const connection = getDatabaseConnection();

  return (
    connection.models.Employee || connection.model<IEmployeeDocument>('Employee', EmployeeSchema)
  );
};
