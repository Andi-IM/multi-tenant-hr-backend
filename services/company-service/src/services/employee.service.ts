import { AppError } from '../errors/app-error.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '../validators/employee.validator.js';
import type { IEmployee, IEmployeeDocument } from '../models/employee.model.js';

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

  /**
   * Update an existing employee's data (partial update / PATCH semantics).
   *
   * Maps API field names to database field names before persistence:
   * - employmentStatus → status
   * - workSchedule.startTime → workSchedule.shiftStart
   * - workSchedule.endTime → workSchedule.shiftEnd
   *
   * @param employeeId - Business-level employee identifier (from URL param)
   * @param input - Validated partial update body (UpdateEmployeeInput)
   * @param serviceCompanyId - The company identifier this service manages (from env)
   * @returns Updated Employee document
   * @throws AppError(404) if employee not found in this company's database
   */
  async updateEmployee(
    employeeId: string,
    input: UpdateEmployeeInput,
    serviceCompanyId: string,
  ): Promise<IEmployeeDocument> {
    // Build the database update payload with proper field mapping
    const updateData: Partial<IEmployee> = {};

    if (input.fullName !== undefined) {
      updateData.fullName = input.fullName;
    }

    if (input.employmentStatus !== undefined) {
      updateData.status = input.employmentStatus; // API: employmentStatus → DB: status
    }

    if (input.timezone !== undefined) {
      updateData.timezone = input.timezone;
    }

    // Handle nested workSchedule mapping
    // Uses MongoDB dot notation for partial nested updates
    if (input.workSchedule !== undefined) {
      const scheduleUpdate: Record<string, any> = {};

      if (input.workSchedule.startTime !== undefined) {
        scheduleUpdate['workSchedule.shiftStart'] = input.workSchedule.startTime;
      }
      if (input.workSchedule.endTime !== undefined) {
        scheduleUpdate['workSchedule.shiftEnd'] = input.workSchedule.endTime;
      }
      if (input.workSchedule.workingDays !== undefined) {
        scheduleUpdate['workSchedule.workingDays'] = input.workSchedule.workingDays;
      }

      // Merge dot-notation fields into the update payload
      Object.assign(updateData, scheduleUpdate);
    }

    // TODO: If workSchedule or timezone changed, consider emitting an event
    // for Attendance Service synchronization (REQ-U4). Currently, the Attendance
    // Service fetches the latest data via synchronous API call, so no push is needed.

    const updated = await employeeRepository.updateByEmployeeId(
      serviceCompanyId,
      employeeId,
      updateData,
    );

    if (!updated) {
      throw AppError.notFound(`Employee with ID "${employeeId}" not found`);
    }

    return updated;
  }

  /**
   * Retrieve a single employee's details by their business-level employeeId.
   *
   * Data isolation is enforced by querying only the tenant database
   * associated with the service's companyId — no cross-company lookup is possible.
   *
   * @param employeeId - Business-level employee identifier (from URL param)
   * @param serviceCompanyId - The company identifier this service manages (from env)
   * @returns Employee document
   * @throws AppError(404) if employee not found in this company's database
   */
  async getEmployeeById(
    employeeId: string,
    serviceCompanyId: string,
  ): Promise<IEmployeeDocument> {
    const employee = await employeeRepository.findByEmployeeId(
      serviceCompanyId,
      employeeId,
    );

    if (!employee) {
      throw AppError.notFound(`Employee with ID "${employeeId}" not found`);
    }

    return employee;
  }
}

/** Singleton instance */
export const employeeService = new EmployeeService();
