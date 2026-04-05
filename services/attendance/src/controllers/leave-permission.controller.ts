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
}

export const leavePermissionController = new LeavePermissionController();
