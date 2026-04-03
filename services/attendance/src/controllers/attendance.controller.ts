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
}

export const attendanceController = new AttendanceController();
