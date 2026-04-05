import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';
import { employeeRepository } from '../repositories/employee.repository.js';
import { LoginInput } from '../validators/auth.validator.js';

export class AuthService {
  /**
   * Login employee and generate JWT.
   *
   * @param input - LoginInput containing email and password
   * @param serviceCompanyId - The company identifier this service manages (from env)
   * @returns {Promise<{ token: string }>}
   */
  async login(input: LoginInput, serviceCompanyId: string): Promise<{ token: string }> {
    const { email, password } = input;

    // 1. Cari employee berdasarkan email
    const employee = await employeeRepository.findByEmail(serviceCompanyId, email);

    if (!employee) {
      // Return generic error for security
      throw AppError.unauthorized('Invalid email or password');
    }

    // 2. Verifikasi password menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);

    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // 3. Generate JWT dengan payload: userId, email, role, companyId, exp
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here';
    const payload = {
      userId: employee._id.toString(),
      email: employee.email,
      role: employee.role,
      companyId: employee.companyId,
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: '24h',
    });

    return { token };
  }
}

export const authService = new AuthService();
