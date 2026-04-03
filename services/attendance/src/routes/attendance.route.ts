import { Router, type Router as RouterType } from 'express';
import { attendanceController } from '../controllers/attendance.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: RouterType = Router();

/**
 * @openapi
 * /api/v1/attendances/checkin:
 *   post:
 *     summary: Employee Check-In API
 *     description: Record employee check-in time, validating status and schedule from Company Service.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Check-in recorded successfully
 *       200:
 *         description: Check-in already recorded for today
 *       403:
 *         description: Employee is inactive
 *       401:
 *         description: Unauthorized
 */
router.post('/checkin', authenticateToken, attendanceController.checkIn);

export default router;
