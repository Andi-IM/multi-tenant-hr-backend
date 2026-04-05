import type { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

export class AttendanceController {
  /**
   * Employee Check-In Controller
   * POST /api/v1/attendances/checkin
   */
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Extract employee ID and company ID from JWT payload (assumed to be in req.user)
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const employeeId = user.id; // Or user.employeeId depending on token structure
      const companyId = user.companyId;

      // 2. Extract token from Authorization header to pass to internal service
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ status: 'error', message: 'Authorization header missing' });
      }
      const token = authHeader.split(' ')[1];

      // 3. Process check-in
      const { alreadyRecorded, attendance } = await attendanceService.checkIn(
        employeeId,
        companyId,
        token
      );

      // 4. Handle idempotency (Return 200 OK if already recorded)
      if (alreadyRecorded) {
        return res.status(200).json({
          status: 'success',
          message: 'Check-in already recorded for today',
          data: attendance,
        });
      }

      // 5. Handle success (Return 201 Created)
      return res.status(201).json({
        status: 'success',
        message: 'Check-in successful',
        data: attendance,
      });
    } catch (error: unknown) {
      // 6. Handle specific errors
      if (error instanceof Error && error.message.includes('Forbidden: Employee is Inactive')) {
        return res
          .status(403)
          .json({ status: 'error', message: 'Forbidden: Employee is Inactive' });
      }

      // Pass other errors to global error handler
      next(error);
    }
  }

  /**
   * Employee Check-Out Controller
   * POST /api/v1/attendances/checkout
   */
  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Extract employee ID and company ID from JWT payload
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const employeeId = user.id;
      const companyId = user.companyId;

      // 2. Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ status: 'error', message: 'Authorization header missing' });
      }
      const token = authHeader.split(' ')[1];

      // 3. Process check-out
      const { alreadyRecorded, attendance } = await attendanceService.checkOut(
        employeeId,
        companyId,
        token
      );

      // 4. Handle idempotency (Return 200 OK if already recorded)
      if (alreadyRecorded) {
        return res.status(200).json({
          status: 'success',
          message: 'Check-out already recorded for today',
          data: attendance,
        });
      }

      // 5. Handle success (Return 200 OK)
      return res.status(200).json({
        status: 'success',
        message: 'Check-out successful',
        data: attendance,
      });
    } catch (error: unknown) {
      // 6. Handle specific errors
      if (error instanceof Error && error.message.includes('Check-in record not found for today')) {
        return res.status(404).json({ status: 'error', message: error.message });
      }

      if (error instanceof Error && error.message.includes('Forbidden: Employee is Inactive')) {
        return res
          .status(403)
          .json({ status: 'error', message: 'Forbidden: Employee is Inactive' });
      }

      // Pass other errors to global error handler
      next(error);
    }
  }

  /**
   * List Attendances Controller
   * GET /api/v1/attendances/
   */
  async listAttendances(req: Request, res: Response, next: NextFunction) {
    try {
      // Access is now public as per requirement.
      // companyId MUST be provided in the query for filtering/isolation.
      const { companyId, employeeId, startDate, endDate, page = 1, limit = 10 } = req.query;

      if (!companyId) {
        return res.status(400).json({
          status: 'error',
          message: 'companyId query parameter is required for public access',
        });
      }

      const result = await attendanceService.getAttendances({
        companyId: companyId as string,
        employeeId: employeeId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: Number(page),
        limit: Number(limit),
      });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Get Attendance Report Controller
   * GET /api/v1/attendances/report
   */
  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const companyId = user.companyId;
      const { start_date, end_date, employeeId, group_by } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          status: 'error',
          message: 'start_date and end_date are required query parameters',
        });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ status: 'error', message: 'Authorization header missing' });
      }
      const token = authHeader.split(' ')[1];

      const report = await attendanceService.getAttendanceReport({
        companyId,
        employeeId: employeeId as string,
        startDate: start_date as string,
        endDate: end_date as string,
        groupBy: group_by as 'day' | 'week' | 'month',
        token,
      });

      return res.status(200).json({
        status: 'success',
        data: report,
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
