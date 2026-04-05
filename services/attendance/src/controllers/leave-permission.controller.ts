import type { Request, Response, NextFunction } from 'express';
import { leavePermissionService } from '../services/leave-permission.service.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { AppError } from '../errors/app-error.js';

export class LeavePermissionController {
  async createLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'startDate and endDate are required',
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid date format',
        });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          status: 'error',
          message: 'Authorization header missing',
        });
      }
      const token = authHeader.split(' ')[1];

      const request = await leavePermissionService.createLeaveRequest(
        user.id,
        user.companyId,
        start,
        end,
        token
      );

      return res.status(201).json({
        status: 'success',
        data: request,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        });
      }
      if (error instanceof Error) {
        if (error.message.includes('Start date must be before or equal to end date')) {
          return res.status(400).json({
            status: 'error',
            message: error.message,
          });
        }
        if (error.message.includes('Conflict with existing approved request')) {
          return res.status(409).json({
            status: 'error',
            message: error.message,
          });
        }
        if (error.message.includes('Employee is not active')) {
          return res.status(403).json({
            status: 'error',
            message: 'Employee is not active',
          });
        }
      }
      next(error);
    }
  }

  async createPermission(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Reason is required for permission request',
        });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          status: 'error',
          message: 'Authorization header missing',
        });
      }
      const token = authHeader.split(' ')[1];

      const request = await leavePermissionService.createPermissionRequest(
        user.id,
        user.companyId,
        reason,
        token
      );

      return res.status(201).json({
        status: 'success',
        data: request,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        });
      }
      if (error instanceof Error) {
        if (error.message.includes('Reason is required')) {
          return res.status(400).json({
            status: 'error',
            message: error.message,
          });
        }
        if (error.message.includes('Employee is not active')) {
          return res.status(403).json({
            status: 'error',
            message: 'Employee is not active',
          });
        }
      }
      next(error);
    }
  }

  async getRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      const { type, status, start_date, end_date, page, limit } = req.query;

      const result = await leavePermissionService.getRequests(user.id, user.companyId, user.role, {
        type: type as string,
        status: status as string,
        startDate: start_date as string,
        endDate: end_date as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      });

      return res.status(200).json({
        status: 'success',
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        });
      }
      next(error);
    }
  }

  async approveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      if (user.role !== 'ADMIN_HR') {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: Admin HR role required',
        });
      }

      const { id } = req.params;
      const requestId = Array.isArray(id) ? id[0] : id;

      const request = await leavePermissionService.approveRequest(
        requestId,
        user.id,
        user.companyId
      );

      return res.status(200).json({
        status: 'success',
        data: request,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        });
      }
      if (error instanceof Error) {
        if (error.message.includes('Request not found')) {
          return res.status(404).json({
            status: 'error',
            message: error.message,
          });
        }
        if (error.message.includes('Request already processed')) {
          return res.status(409).json({
            status: 'error',
            message: 'Request already processed',
          });
        }
      }
      next(error);
    }
  }

  async rejectRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      if (user.role !== 'ADMIN_HR') {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: Admin HR role required',
        });
      }

      const { id } = req.params;
      const requestId = Array.isArray(id) ? id[0] : id;

      const request = await leavePermissionService.rejectRequest(
        requestId,
        user.id,
        user.companyId
      );

      return res.status(200).json({
        status: 'success',
        data: request,
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        });
      }
      if (error instanceof Error) {
        if (error.message.includes('Request not found')) {
          return res.status(404).json({
            status: 'error',
            message: error.message,
          });
        }
        if (error.message.includes('Request already processed')) {
          return res.status(409).json({
            status: 'error',
            message: 'Request already processed',
          });
        }
      }
      next(error);
    }
  }
}

export const leavePermissionController = new LeavePermissionController();
