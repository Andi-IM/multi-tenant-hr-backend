import { Schema, Document, Model } from 'mongoose';
import { getTenantConnection } from '../config/database.js';

export interface IWorkSchedule {
  shiftStart: string;
  shiftEnd: string;
  workingDays: string[];
}

export interface IEmployee {
  _id: import('mongoose').Types.ObjectId;
  employeeId: string;
  fullName: string;
  companyId: string;
  joinDate: Date;
  status: string;
  workSchedule: IWorkSchedule;
  timezone: string;
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
    companyId: { type: String, required: true },
    joinDate: { type: Date, required: true },
    status: { type: String, required: true, default: 'ACTIVE' },
    workSchedule: {
      shiftStart: { type: String, required: true },
      shiftEnd: { type: String, required: true },
      workingDays: [{ type: String, required: true }],
    },
    timezone: { type: String, required: true },
    deactivationDate: { type: Date, required: false },
  },
  {
    timestamps: true,
  }
);

/**
 * Returns the Employee model initialized over the appropriate tenant connection.
 * @param companyId The tenant identifier
 */
export const getEmployeeModel = (companyId: string): Model<IEmployeeDocument> => {
  const connection = getTenantConnection(companyId);

  // Note: If the model is already bound to this connection, retrieve it. Otherwise construct.
  return (
    connection.models.Employee || connection.model<IEmployeeDocument>('Employee', EmployeeSchema)
  );
};
