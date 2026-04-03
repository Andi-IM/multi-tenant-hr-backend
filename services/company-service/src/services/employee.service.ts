import { AppError } from '../errors/app-error.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import type { CreateEmployeeInput } from '../validators/employee.validator.js';
import type { IEmployeeDocument } from '../models/employee.model.js';

export class EmployeeService {
  /**
   * Create a new employee dynamically separated by tenant database.
   *
   * 1. Check for valid cross-company access block.
   * 2. Try to persist directly to tenant DB.
   * 3. Handle mongoose duplicate key error (code 11000) for native duplicate check efficiency.
   *
   * @param input - Validated request body (CreateEmployeeInput)
   * @param serviceCompanyId - The company identifier this service manages (from env)
   * @returns Created Employee document
   * @throws AppError(409) if employeeId already exists
   * @throws AppError(403) if companyId in body doesn't match the service's company
   */
  async createEmployee(
    input: CreateEmployeeInput,
    serviceCompanyId: string,
  ): Promise<IEmployeeDocument> {
    // Validate that the request targets this service's company
    // (Requirement: Admin dari Perusahaan B tidak dapat membuat data karyawan untuk Perusahaan A)
    if (input.companyId !== serviceCompanyId) {
      throw AppError.forbidden(
        `Cannot create employee for company "${input.companyId}" on Company ${serviceCompanyId} service`,
      );
    }

    try {
      // Direct insertion. Because of the unique index on employeeId in Mongoose,
      // a duplicate will throw an error with code 11000. This is faster than doing `findOne` first.
      const employee = await employeeRepository.create(input.companyId, {
        employeeId: input.employeeId,
        fullName: input.fullName,
        companyId: input.companyId,
        joinDate: new Date(input.joinDate),
        status: input.employmentStatus,       // API: employmentStatus → DB: status
        timezone: input.timezone,
        workSchedule: {
          shiftStart: input.workSchedule.startTime,   // API: startTime → DB: shiftStart
          shiftEnd: input.workSchedule.endTime,        // API: endTime → DB: shiftEnd
          workingDays: input.workSchedule.workingDays,
        },
      });

      return employee;
    } catch (error: any) {
      if (error && error.code === 11000 && error.keyPattern && error.keyPattern.employeeId) {
        throw AppError.conflict(
          `Employee with ID "${input.employeeId}" already exists`
        );
      }
      throw error;
    }
  }
}

/** Singleton instance */
export const employeeService = new EmployeeService();
