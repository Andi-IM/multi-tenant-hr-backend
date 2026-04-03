import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { authenticateToken, authorizeCompany } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createEmployeeSchema } from '../validators/employee.validator.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

const router = Router();

/**
 * @openapi
 * /api/employees:
 *   post:
 *     summary: Create a new employee
 *     description: Adds a new employee to the database for the specified company. Access is restricted based on JWT companyId and the service's own companyId.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Employee created successfully }
 *                 data: { $ref: '#/components/schemas/Employee' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - cross-company access attempt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - employeeId already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  authenticateToken as any,
  authorizeCompany as any,
  validate(createEmployeeSchema),
  (req, res, next) => employeeController.create(req as AuthenticatedRequest, res, next),
);

export default router;
