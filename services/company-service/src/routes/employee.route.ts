import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { authenticateToken, authorizeCompany } from '../middleware/auth.middleware.js';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import { createEmployeeSchema, updateEmployeeSchema, listEmployeesQuerySchema } from '../validators/employee.validator.js';
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

/**
 * @openapi
 * /api/employees/{employeeId}:
 *   patch:
 *     summary: Update an employee's data
 *     description: Partially updates an existing employee's profile or work details. Only the provided fields are modified. Immutable fields (employeeId, companyId, joinDate) are not accepted.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The business-level employee identifier (e.g., "EMP-A-001")
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Jane Doe Updated
 *               employmentStatus:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               workSchedule:
 *                 type: object
 *                 properties:
 *                   startTime:
 *                     type: string
 *                     example: "08:00"
 *                   endTime:
 *                     type: string
 *                     example: "16:00"
 *                   workingDays:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
 *               timezone:
 *                 type: string
 *                 example: Asia/Jakarta
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Employee updated successfully }
 *                 data: { $ref: '#/components/schemas/Employee' }
 *       400:
 *         description: Validation error (invalid fields or empty body)
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
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch(
  '/:employeeId',
  authenticateToken as any,
  authorizeCompany as any,
  validate(updateEmployeeSchema),
  (req, res, next) => employeeController.update(req as AuthenticatedRequest, res, next),
);

/**
 * @openapi
 * /api/employees/{employeeId}:
 *   get:
 *     summary: Retrieve employee details
 *     description: Returns the full profile of a single employee identified by their business-level employeeId. The query is scoped to the company database associated with the authenticated Admin's token, enforcing multi-tenant data isolation.
 *     tags: [Employees]
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
 *         description: Employee details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data: { $ref: '#/components/schemas/Employee' }
 *       401:
 *         description: Unauthorized - missing or invalid token
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
 *       404:
 *         description: Employee not found in this company's database
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:employeeId',
  authenticateToken as any,
  authorizeCompany as any,
  (req, res, next) => employeeController.getById(req as unknown as AuthenticatedRequest, res, next),
);

/**
 * @openapi
 * /api/employees:
 *   get:
 *     summary: List employees
 *     description: Retrieves a paginated list of employees for the authenticated admin's company. Supports optionally filtering by employment status, and sorting by name or join date. Data isolation is strictly enforced.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (maximum 100)
 *       - in: query
 *         name: employmentStatus
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter employees by their active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [fullName, joinDate]
 *           default: joinDate
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: A paginated list of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Employee' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer, example: 50 }
 *                     page: { type: integer, example: 1 }
 *                     limit: { type: integer, example: 10 }
 *                     totalPages: { type: integer, example: 5 }
 *       400:
 *         description: Validation error on query parameters
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  authenticateToken as any,
  authorizeCompany as any,
  validateQuery(listEmployeesQuerySchema),
  (req, res, next) => employeeController.list(req as unknown as AuthenticatedRequest, res, next),
);

export default router;
