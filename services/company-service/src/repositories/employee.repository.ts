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
    const TenantModel = getEmployeeModel(companyId);
    return TenantModel.create(data);
  }

  /**
   * Find an employee by their business-level employeeId (unique) in a specific tenant's DB.
   * Used for duplicate checking before creation.
   */
  async findByEmployeeId(companyId: string, employeeId: string): Promise<IEmployeeDocument | null> {
    const TenantModel = getEmployeeModel(companyId);
    return TenantModel.findOne({ employeeId });
  }

  /**
   * Find an employee by their internal MongoDB ObjectId.
   */
  async findById(companyId: string, id: string): Promise<IEmployeeDocument | null> {
    const TenantModel = getEmployeeModel(companyId);
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
    data: Partial<IEmployee>,
  ): Promise<IEmployeeDocument | null> {
    const TenantModel = getEmployeeModel(companyId);
    return TenantModel.findOneAndUpdate(
      { employeeId },
      { $set: data },
      { new: true, runValidators: true },
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
    limit: number,
  ): Promise<{ data: IEmployeeDocument[]; total: number }> {
    const TenantModel = getEmployeeModel(companyId);
    
    const [data, total] = await Promise.all([
      TenantModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      TenantModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }
}

/** Singleton instance */
export const employeeRepository = new EmployeeRepository();
