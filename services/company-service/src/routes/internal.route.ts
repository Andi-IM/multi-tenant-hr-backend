import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { authenticateToken, authorizeSystemActor } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

const router = Router();

/**
 * @openapi
 * /api/v1/internal/employees/{employeeId}/status:
 *   get:
 *     summary: Verify employee active status (Internal API)
 *     description: This internal endpoint is used by other microservices (e.g., Attendance Service) to verify an employee's presence, status, and fetch required scheduling data. Only accessible by actors with the SYSTEM_ACTOR role.
 *     tags: [Internal APIs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The business-level employee identifier (e.g., "EMP-A-001")
 *     responses:
 *       200:
 *         description: Employee is active and details are returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     employmentStatus: { type: string, example: ACTIVE }
 *                     workSchedule:
 *                       type: object
 *                       properties:
 *                         startTime: { type: string, example: "08:00" }
 *                         endTime: { type: string, example: "17:00" }
 *                         workingDays: { type: array, items: { type: string }, example: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }
 *                     timezone: { type: string, example: "Asia/Jakarta" }
 *       403:
 *         description: Forbidden - Employee is Inactive or caller is not a System Actor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: error }
 *                 message: { type: string, example: "Employee is Inactive" }
 *       404:
 *         description: Employee not found
 */
router.get(
  '/employees/:employeeId/status',
  authenticateToken,
  authorizeSystemActor,
  (req, res, next) => employeeController.verifyStatus(req as AuthenticatedRequest, res, next),
);

export default router;
