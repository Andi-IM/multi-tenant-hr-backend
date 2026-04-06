import axios, { isAxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import {
  getLeavePermissionRequestModel,
  type ILeavePermissionRequest,
} from '../models/leave-permission.model.js';
import {
  type EmployeeStatusResponse,
  employeeStatusResponseSchema,
} from '../types/company-service.types.js';

export class LeavePermissionService {
  private companyServiceUrl: string;
  private jwtSecret: string;

  constructor() {
    this.companyServiceUrl = process.env.COMPANY_SERVICE_URL || 'http://localhost:3001';
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here';
  }

  private getSystemActorToken(companyId: string): string {
    return jwt.sign(
      {
        userId: 'attendance-service',
        employeeId: 'SYSTEM_ACTOR',
        email: 'attendance-service@local',
        role: 'SYSTEM_ACTOR',
        companyId,
      },
      this.jwtSecret,
      { expiresIn: '5m' }
    );
  }

  async verifyEmployeeStatus(
    employeeId: string,
    companyId: string,
    _token: string
  ): Promise<EmployeeStatusResponse['data']> {
    try {
      const systemToken = this.getSystemActorToken(companyId);
      const response = await axios.get<unknown>(
        `${this.companyServiceUrl}/api/v1/internal/employees/${employeeId}/status`,
        {
          headers: {
            Authorization: `Bearer ${systemToken}`,
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

  async getRequests(
    employeeId: string,
    companyId: string,
    userRole: string,
    filters: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: ILeavePermissionRequest[]; total: number; page: number; limit: number }> {
    const { type, status, startDate, endDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (userRole === 'EMPLOYEE') {
      query.employeeId = employeeId;
    } else {
      query.companyId = companyId;
    }

    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) (query.createdAt as Record<string, Date>).$lte = new Date(endDate);
    }

    const LeavePermissionRequest = getLeavePermissionRequestModel();
    const [data, total] = await Promise.all([
      LeavePermissionRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LeavePermissionRequest.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async approveRequest(
    requestId: string,
    approverId: string,
    companyId: string
  ): Promise<ILeavePermissionRequest> {
    const LeavePermissionRequest = getLeavePermissionRequestModel();
    const request = await LeavePermissionRequest.findById(requestId);

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.companyId !== companyId) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    request.status = 'approved';
    request.approvedBy = approverId;
    request.approvedAt = new Date();

    await request.save();

    console.log(
      `[AUDIT] Request ${requestId} approved by ${approverId} at ${new Date().toISOString()}`
    );

    return request;
  }

  async rejectRequest(
    requestId: string,
    approverId: string,
    companyId: string
  ): Promise<ILeavePermissionRequest> {
    const LeavePermissionRequest = getLeavePermissionRequestModel();
    const request = await LeavePermissionRequest.findById(requestId);

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.companyId !== companyId) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    request.status = 'rejected';
    request.approvedBy = approverId;
    request.approvedAt = new Date();

    await request.save();

    console.log(
      `[AUDIT] Request ${requestId} rejected by ${approverId} at ${new Date().toISOString()}`
    );

    return request;
  }
}

export const leavePermissionService = new LeavePermissionService();
