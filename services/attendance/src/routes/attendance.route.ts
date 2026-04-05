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
 *             example:
 *               status: error
 *               message: "Forbidden: Employee is Inactive"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingToken:
 *                 value:
 *                   status: error
 *                   message: "Authorization header missing"
 *               invalidToken:
 *                 value:
 *                   status: error
 *                   message: "Unauthorized"
 */
router.post('/checkin', authenticateToken, attendanceController.checkIn);

/**
 * @openapi
 * /api/v1/attendances/checkout:
 *   post:
 *     summary: Employee Check-Out API
 *     description: Record employee check-out time. System finds the active check-in record for today and updates it.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-out recorded successfully or already recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Check-out successful }
 *                 data: { $ref: '#/components/schemas/Attendance' }
 *       404:
 *         description: Not Found - no check-in record found for today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               message: "Check-in record not found for today"
 *       403:
 *         description: Forbidden - employee is inactive or status check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               message: "Forbidden: Employee is Inactive"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingToken:
 *                 value:
 *                   status: error
 *                   message: "Authorization header missing"
 *               invalidToken:
 *                 value:
 *                   status: error
 *                   message: "Unauthorized"
 */
router.post('/checkout', authenticateToken, attendanceController.checkOut);

/**
 * @openapi
 * /api/v1/attendances:
 *   get:
 *     summary: List Attendance Records
 *     description: Retrieve a paginated list of attendance records. Only accessible by HR Admins.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by employee ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Attendance records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendances:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Attendance' }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 */
router.get('/', attendanceController.listAttendances);

/**
 * @openapi
 * /api/v1/attendances/report:
 *   get:
 *     summary: Get Attendance Report
 *     description: Retrieve a rekapitulasi report for one or all employees. Supports grouping by day, week, or month.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema: { type: string, format: date }
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *         description: Filter by employee ID (optional)
 *       - in: query
 *         name: group_by
 *         schema: { type: string, enum: [day, week, month] }
 *         description: Group results by period (optional)
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { type: object }
 */
router.get('/report', authenticateToken, attendanceController.getReport);

export default router;
