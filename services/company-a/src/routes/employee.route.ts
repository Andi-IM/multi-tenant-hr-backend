import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { authenticateToken, authorizeCompany } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createEmployeeSchema } from '../validators/employee.validator.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

const router = Router();

/**
 * POST /api/employees
 *
 * Pipeline:
 * 1. authenticateToken — verify JWT, attach user to req
 * 2. authorizeCompany — ensure user belongs to this company's service
 * 3. validate(createEmployeeSchema) — validate request body with Zod
 * 4. employeeController.create — business logic + response
 */
router.post(
  '/',
  authenticateToken as any,
  authorizeCompany as any,
  validate(createEmployeeSchema),
  (req, res, next) => employeeController.create(req as AuthenticatedRequest, res, next),
);

export default router;
