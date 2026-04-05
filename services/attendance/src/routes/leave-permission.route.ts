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

/**
 * @openapi
 * /api/v1/requests:
 *   get:
 *     summary: Get Leave/Permission Requests
 *     description: Get list of leave/permission requests. ADMIN_HR sees all requests in their company, EMPLOYEE sees only their own requests.
 *     tags: [Leave Permission]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [leave, permission]
 *         description: Filter by request type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeavePermissionRequest'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     totalPages: { type: integer }
 *       401:
 *         description: Unauthorized
 */
router.get('/requests', authenticateToken, leavePermissionController.getRequests);

/**
 * @openapi
 * /api/v1/requests/{id}/approve:
 *   patch:
 *     summary: Approve Leave/Permission Request
 *     description: Approve a pending leave/permission request. Only ADMIN_HR can approve requests.
 *     tags: [Leave Permission]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     responses:
 *       200:
 *         description: Request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/LeavePermissionRequest'
 *       403:
 *         description: Forbidden - only ADMIN_HR can approve
 *       404:
 *         description: Request not found
 *       409:
 *         description: Conflict - request already processed
 */
router.patch('/requests/:id/approve', authenticateToken, leavePermissionController.approveRequest);

/**
 * @openapi
 * /api/v1/requests/{id}/reject:
 *   patch:
 *     summary: Reject Leave/Permission Request
 *     description: Reject a pending leave/permission request. Only ADMIN_HR can reject requests.
 *     tags: [Leave Permission]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/LeavePermissionRequest'
 *       403:
 *         description: Forbidden - only ADMIN_HR can reject
 *       404:
 *         description: Request not found
 *       409:
 *         description: Conflict - request already processed
 */
router.patch('/requests/:id/reject', authenticateToken, leavePermissionController.rejectRequest);

export default router;
