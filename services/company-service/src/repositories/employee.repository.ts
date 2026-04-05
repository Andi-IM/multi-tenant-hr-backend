import { getEmployeeModel, IEmployee, IEmployeeDocument } from '../models/employee.model.js';

/**
 * Employee Repository — Data Access Layer using Mongoose
 *
 * Implements dynamic tenant connection based on companyId.
 */
export class EmployeeRepository {
  /**
   * Create a new employee record dynamically in the indicated tenant's DB.
   */
  async create(companyId: string, data: Partial<IEmployee>): Promise<IEmployeeDocument> {
    const TenantModel = getEmployeeModel();
    return TenantModel.create(data);
  }

  /**
   * Find an employee by their business-level employeeId (unique) in a specific tenant's DB.
   * Used for duplicate checking before creation.
   */
  async findByEmployeeId(companyId: string, employeeId: string): Promise<IEmployeeDocument | null> {
    const TenantModel = getEmployeeModel();
    return TenantModel.findOne({ employeeId });
  }

  /**
   * Specialized lean query for internal service-to-service status verification.
   * Optimized for low latency:
   * 1. Uses .lean() to return plain JS objects (skips Mongoose document hydration).
   * 2. Uses projection to fetch only required fields.
   */
  async findActiveEmployeeForInternal(
    companyId: string,
    employeeId: string
  ): Promise<Pick<
    IEmployee,
    'employeeId' | 'companyId' | 'role' | 'status' | 'workSchedule' | 'timezone'
  > | null> {
    const TenantModel = getEmployeeModel();
    return TenantModel.findOne(
      { employeeId },
      { employeeId: 1, companyId: 1, role: 1, status: 1, workSchedule: 1, timezone: 1, _id: 0 }
    ).lean();
  }

  /**
   * Find an employee by their internal MongoDB ObjectId.
   */
  async findById(companyId: string, id: string): Promise<IEmployeeDocument | null> {
    const TenantModel = getEmployeeModel();
    return TenantModel.findById(id);
  }

  /**
   * Update an employee by their business-level employeeId.
   * Uses $set for partial updates — only provided fields are modified.
   *
   * @returns Updated document, or null if not found.
   */
  async updateByEmployeeId(
    companyId: string,
    employeeId: string,
    data: Partial<IEmployee>
  ): Promise<IEmployeeDocument | null> {
    const TenantModel = getEmployeeModel();
    return TenantModel.findOneAndUpdate(
      { employeeId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  /**
   * Mongoose powered list query supporting pagination, filtering by exact match,
   * and sorting. Retrieves total counts in parallel.
   */
  async list(
    companyId: string,
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number
  ): Promise<{ data: IEmployeeDocument[]; total: number }> {
    const TenantModel = getEmployeeModel();

    const [data, total] = await Promise.all([
      TenantModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      TenantModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }
}

/** Singleton instance */
export const employeeRepository = new EmployeeRepository();
