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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Check-in successful }
 *                 data: { $ref: '#/components/schemas/Attendance' }
 *       200:
 *         description: Check-in already recorded for today
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Check-in already recorded for today }
 *                 data: { $ref: '#/components/schemas/Attendance' }
 *       403:
 *         description: Forbidden - employee is inactive or status check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/checkin', authenticateToken, attendanceController.checkIn);

export default router;
