import { Router, type Router as RouterType } from 'express';
import { leavePermissionController } from '../controllers/leave-permission.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: RouterType = Router();

/**
 * @openapi
 * /api/v1/leave:
 *   post:
 *     summary: Submit Leave Request
 *     description: Submit a leave request for the authenticated employee. Start date must be before or equal to end date.
 *     tags: [Leave Permission]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Leave start date (ISO 8601)
 *                 example: "2026-04-10"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Leave end date (ISO 8601)
 *                 example: "2026-04-12"
 *           example:
 *             startDate: "2026-04-10"
 *             endDate: "2026-04-12"
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/LeavePermissionRequest'
 *       400:
 *         description: Bad Request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidDates:
 *                 value:
 *                   status: error
 *                   code: BAD_REQUEST
 *                   message: "Start date must be before or equal to end date"
 *               missingFields:
 *                 value:
 *                   status: error
 *                   code: BAD_REQUEST
 *                   message: "startDate and endDate are required"
 *       403:
 *         description: Forbidden - employee is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               code: FORBIDDEN
 *               message: "Employee is not active"
 *       409:
 *         description: Conflict - overlapping approved request exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               code: CONFLICT
 *               message: "Conflict with existing approved request"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: "Unauthorized"
 */
router.post('/leave', authenticateToken, leavePermissionController.createLeave);

/**
 * @openapi
 * /api/v1/permission:
 *   post:
 *     summary: Submit Permission Request
 *     description: Submit a permission request for the authenticated employee. Reason is required.
 *     tags: [Leave Permission]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for permission request
 *                 example: "Doctor appointment"
 *           example:
 *             reason: "Doctor appointment"
 *     responses:
 *       201:
 *         description: Permission request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/LeavePermissionRequest'
 *       400:
 *         description: Bad Request - reason is empty or missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               code: BAD_REQUEST
 *               message: "Reason is required for permission request"
 *       403:
 *         description: Forbidden - employee is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               code: FORBIDDEN
 *               message: "Employee is not active"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: "Unauthorized"
 */
router.post('/permission', authenticateToken, leavePermissionController.createPermission);

export default router;
