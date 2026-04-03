import { type Response, type NextFunction } from 'express';
import { employeeService } from '../services/employee.service.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';

const COMPANY_ID = process.env.COMPANY_ID || 'A';

/**
 * Employee Controller — Thin Orchestration Layer
 *
 * Responsibilities:
 * - Extract validated data from the request
 * - Delegate to the service layer
 * - Format and send the HTTP response
 */
export class EmployeeController {
  /**
   * POST /api/employees
   *
   * Creates a new employee record.
   * Request body has already been validated by the validation middleware.
   *
   * @returns 201 Created with the new employee data
   */
  async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const employee = await employeeService.createEmployee(req.body, COMPANY_ID);

      res.status(201).json({
        status: 'success',
        message: 'Employee created successfully',
        data: {
          id: (employee as any)._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          companyId: employee.companyId,
          joinDate: employee.joinDate,
          employmentStatus: employee.status,
          workSchedule: {
            startTime: employee.workSchedule.shiftStart,
            endTime: employee.workSchedule.shiftEnd,
            workingDays: employee.workSchedule.workingDays,
          },
          timezone: employee.timezone,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/employees/:employeeId
   *
   * Partially updates an existing employee's data.
   * Request body has already been validated by the validation middleware.
   *
   * @returns 200 OK with the updated employee data
   */
  async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { employeeId } = req.params;
      const employee = await employeeService.updateEmployee(employeeId as string, req.body, COMPANY_ID);

      res.status(200).json({
        status: 'success',
        message: 'Employee updated successfully',
        data: {
          id: (employee as any)._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          companyId: employee.companyId,
          joinDate: employee.joinDate,
          employmentStatus: employee.status,
          workSchedule: {
            startTime: employee.workSchedule.shiftStart,
            endTime: employee.workSchedule.shiftEnd,
            workingDays: employee.workSchedule.workingDays,
          },
          timezone: employee.timezone,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/employees/:employeeId
   *
   * Retrieves detailed information for a single employee.
   *
   * @returns 200 OK with the employee data
   */
  async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { employeeId } = req.params;
      const employee = await employeeService.getEmployeeById(employeeId as string, COMPANY_ID);

      res.status(200).json({
        status: 'success',
        data: {
          id: (employee as any)._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          companyId: employee.companyId,
          joinDate: employee.joinDate,
          employmentStatus: employee.status,
          workSchedule: {
            startTime: employee.workSchedule.shiftStart,
            endTime: employee.workSchedule.shiftEnd,
            workingDays: employee.workSchedule.workingDays,
          },
          timezone: employee.timezone,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/employees
   *
   * Retrieves a paginated list of employees.
   */
  async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // query is already validated by middleware, we can safely cast
      const query = req.query as any;
      const result = await employeeService.listEmployees(query, COMPANY_ID);

      res.status(200).json({
        status: 'success',
        data: result.data.map((employee: any) => ({
          id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          companyId: employee.companyId,
          joinDate: employee.joinDate,
          employmentStatus: employee.status,
          workSchedule: {
            startTime: employee.workSchedule.shiftStart,
            endTime: employee.workSchedule.shiftEnd,
            workingDays: employee.workSchedule.workingDays,
          },
          timezone: employee.timezone,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        })),
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const employeeController = new EmployeeController();
