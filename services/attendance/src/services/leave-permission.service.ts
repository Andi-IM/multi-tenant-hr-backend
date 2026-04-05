import axios, { isAxiosError } from 'axios';
import { z } from 'zod';
import {
  getLeavePermissionRequestModel,
  type ILeavePermissionRequest,
} from '../models/leave-permission.model.js';

const employeeStatusResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    employeeId: z.string(),
    companyId: z.string(),
    role: z.string(),
    employmentStatus: z.string(),
    workSchedule: z.object({
      startTime: z.string(),
      endTime: z.string(),
      toleranceMinutes: z.number(),
      workDays: z.array(z.number()),
    }),
    timezone: z.string(),
  }),
});

type EmployeeStatusResponse = z.infer<typeof employeeStatusResponseSchema>;

export class LeavePermissionService {
  private companyServiceUrl: string;

  constructor() {
    this.companyServiceUrl = process.env.COMPANY_SERVICE_URL || 'http://localhost:3001';
  }

  async verifyEmployeeStatus(
    employeeId: string,
    companyId: string,
    token: string
  ): Promise<EmployeeStatusResponse['data']> {
    try {
      const response = await axios.get<unknown>(
        `${this.companyServiceUrl}/api/v1/internal/employees/${employeeId}/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Company-ID': companyId,
          },
        }
      );

      const result = employeeStatusResponseSchema.safeParse(response.data);

      if (!result.success) {
        throw new Error(`Invalid response format from Company Service: ${result.error.message}`);
      }

      const { status, data } = result.data;

      if (status !== 'success' || data.employmentStatus !== 'active') {
        throw new Error('Employee is not active');
      }

      return data;
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

  private async checkOverlappingApproved(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const LeavePermissionRequest = getLeavePermissionRequestModel();

    const overlapping = await LeavePermissionRequest.findOne({
      employeeId,
      status: 'approved',
      $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
    });

    return !!overlapping;
  }

  async createLeaveRequest(
    employeeId: string,
    companyId: string,
    startDate: Date,
    endDate: Date,
    token: string
  ): Promise<ILeavePermissionRequest> {
    await this.verifyEmployeeStatus(employeeId, companyId, token);

    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    const hasOverlap = await this.checkOverlappingApproved(employeeId, startDate, endDate);
    if (hasOverlap) {
      throw new Error('Conflict with existing approved request');
    }

    const LeavePermissionRequest = getLeavePermissionRequestModel();
    const request = new LeavePermissionRequest({
      employeeId,
      companyId,
      type: 'leave',
      startDate,
      endDate,
      status: 'pending',
    });

    return request.save();
  }

  async createPermissionRequest(
    employeeId: string,
    companyId: string,
    reason: string,
    token: string
  ): Promise<ILeavePermissionRequest> {
    await this.verifyEmployeeStatus(employeeId, companyId, token);

    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required for permission request');
    }

    const LeavePermissionRequest = getLeavePermissionRequestModel();
    const request = new LeavePermissionRequest({
      employeeId,
      companyId,
      type: 'permission',
      reason: reason.trim(),
      status: 'pending',
    });

    return request.save();
  }
}

export const leavePermissionService = new LeavePermissionService();
