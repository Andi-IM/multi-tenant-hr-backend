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
}

/** Singleton instance */
export const employeeRepository = new EmployeeRepository();
