import { AppError } from '../errors/app-error.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ListEmployeesQuery,
} from '../validators/employee.validator.js';
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
    serviceCompanyId: string
  ): Promise<IEmployeeDocument> {
    // Validate that the request targets this service's company
    // (Requirement: Admin dari Perusahaan B tidak dapat membuat data karyawan untuk Perusahaan A)
    if (input.companyId !== serviceCompanyId) {
      throw AppError.forbidden(
        `Cannot create employee for company "${input.companyId}" on Company ${serviceCompanyId} service`
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
        status: input.employmentStatus,
        timezone: input.timezone,
        role: input.role,
        passwordHash: input.password, // Will be hashed in repository or middleware
        workSchedule: {
          startTime: input.workSchedule.startTime,
          endTime: input.workSchedule.endTime,
          toleranceMinutes: input.workSchedule.toleranceMinutes ?? 15,
          workDays: input.workSchedule.workDays,
        },
      });

      return employee;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000 &&
        'keyPattern' in error &&
        (error as { keyPattern: { employeeId?: unknown } }).keyPattern.employeeId
      ) {
        throw AppError.conflict(`Employee with ID "${input.employeeId}" already exists`);
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
    serviceCompanyId: string
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
      const scheduleUpdate: Record<string, string | number | number[]> = {};

      if (input.workSchedule.startTime !== undefined) {
        scheduleUpdate['workSchedule.startTime'] = input.workSchedule.startTime;
      }
      if (input.workSchedule.endTime !== undefined) {
        scheduleUpdate['workSchedule.endTime'] = input.workSchedule.endTime;
      }
      if (input.workSchedule.toleranceMinutes !== undefined) {
        scheduleUpdate['workSchedule.toleranceMinutes'] = input.workSchedule.toleranceMinutes;
      }
      if (input.workSchedule.workDays !== undefined) {
        scheduleUpdate['workSchedule.workDays'] = input.workSchedule.workDays;
      }

      // Merge dot-notation fields into the update payload
      Object.assign(updateData, scheduleUpdate);
    }

    if (input.role !== undefined) {
      updateData.role = input.role;
    }

    // TODO: If workSchedule or timezone changed, consider emitting an event
    // for Attendance Service synchronization (REQ-U4). Currently, the Attendance
    // Service fetches the latest data via synchronous API call, so no push is needed.

    const updated = await employeeRepository.updateByEmployeeId(
      serviceCompanyId,
      employeeId,
      updateData
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
  async getEmployeeById(employeeId: string, serviceCompanyId: string): Promise<IEmployeeDocument> {
    const employee = await employeeRepository.findByEmployeeId(serviceCompanyId, employeeId);

    if (!employee) {
      throw AppError.notFound(`Employee with ID "${employeeId}" not found`);
    }

    return employee;
  }

  /**
   * Retrieve a paginated list of employees for a specific company.
   *
   * Data isolation is guaranteed because the query only goes to the tenant
   * database identified by the serviceCompanyId.
   *
   * @param query - Validated query parameters
   * @param serviceCompanyId - The company identifier this service manages
   * @returns Paginated result list
   */
  async listEmployees(
    query: ListEmployeesQuery,
    serviceCompanyId: string
  ): Promise<{
    data: IEmployeeDocument[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const filter: Record<string, string> = {};

    if (query.employmentStatus) {
      filter.status = query.employmentStatus; // API domain to DB schema naming
    }

    const sort: Record<string, 1 | -1> = {
      [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const skip = (query.page - 1) * query.limit;

    const { data, total } = await employeeRepository.list(
      serviceCompanyId,
      filter,
      sort,
      skip,
      query.limit
    );

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Deactivate an employee (soft delete — REQ-D1).
   *
   * Sets the employee's status to INACTIVE without removing the document,
   * preserving historical data for audit purposes. The Attendance Service
   * performs synchronous status checks against this data, so once the status
   * is INACTIVE here, the employee will be blocked from attendance operations (REQ-D2).
   *
   * Mongoose's `updatedAt` auto-timestamp serves as the deactivation date
   * for audit trail purposes (REQ-D3).
   *
   * @param employeeId - Business-level employee identifier (from URL param)
   * @param serviceCompanyId - The company identifier this service manages (from env)
   * @returns Updated (deactivated) employee document
   * @throws AppError(404) if employee not found
   * @throws AppError(409) if employee is already inactive
   */
  async deactivateEmployee(
    employeeId: string,
    serviceCompanyId: string
  ): Promise<IEmployeeDocument> {
    // First verify the employee exists and check current status
    const employee = await employeeRepository.findByEmployeeId(serviceCompanyId, employeeId);

    if (!employee) {
      throw AppError.notFound(`Employee with ID "${employeeId}" not found`);
    }

    if (employee.status === 'inactive') {
      throw AppError.conflict(`Employee with ID "${employeeId}" is already inactive`);
    }

    // REQ-D4 (Validation of Existing Records):
    // Before deactivating, the system should ideally check for any pending leave/absence requests
    // for this employee in the Attendance Service.
    // This requires cross-service communication (e.g., via an HTTP call to the Attendance Service API
    // or by querying a shared message queue/database).
    // As cross-service communication is not yet implemented, this check is currently skipped.
    // Future implementation should involve:
    // 1. Making a request to the Attendance Service to check for pending requests.
    // 2. If pending requests exist, either:
    //    a. Throw an AppError.conflict to prevent deactivation until requests are resolved.
    //    b. Return a warning to the Admin (if the API design allows for warnings in 200 OK).
    // For now, we proceed with deactivation directly.

    // For audit trail (REQ-D3), set deactivationDate
    const updated = await employeeRepository.updateByEmployeeId(serviceCompanyId, employeeId, {
      status: 'inactive',
      deactivationDate: new Date(),
    });

    // This should not happen since we just verified the employee exists,
    // but guard defensively.
    if (!updated) {
      throw AppError.notFound(`Employee with ID "${employeeId}" not found`);
    }

    return updated;
  }

  /**
   * Internal Service-to-Service: Verify employee active status (REQ-V1).
   *
   * 1. Find the employee by employeeId in the tenant DB (REQ-V4).
   * 2. If not found, throw AppError(404).
   * 3. If found but status is not ACTIVE, throw AppError(403) with "Inactive" message.
   * 4. If ACTIVE, return required data (REQ-V2).
   *
   * @param employeeId - Business-level employee identifier (from path)
   * @param serviceCompanyId - The company identifier this service manages (from JWT/env)
   * @returns Filtered employee data required for attendance calculation
   */
  async verifyEmployeeStatus(
    employeeId: string,
    serviceCompanyId: string
  ): Promise<{
    employeeId: string;
    companyId: string;
    role: string;
    employmentStatus: string;
    workSchedule: {
      startTime: string;
      endTime: string;
      toleranceMinutes: number;
      workDays: number[];
    };
    timezone: string;
  }> {
    // Optimized: Uses specialized lean repository query with projection (REQ-V5)
    const employee = await employeeRepository.findActiveEmployeeForInternal(
      serviceCompanyId,
      employeeId
    );

    if (!employee) {
      throw AppError.notFound(`Employee with ID "${employeeId}" not found`);
    }

    if (employee.status !== 'active') {
      throw AppError.forbidden('Employee is Inactive');
    }

    return {
      employeeId: employee.employeeId,
      companyId: employee.companyId,
      role: employee.role,
      employmentStatus: employee.status,
      workSchedule: {
        startTime: employee.workSchedule.startTime,
        endTime: employee.workSchedule.endTime,
        toleranceMinutes: employee.workSchedule.toleranceMinutes,
        workDays: employee.workSchedule.workDays,
      },
      timezone: employee.timezone,
    };
  }
}

/** Singleton instance */
export const employeeService = new EmployeeService();
