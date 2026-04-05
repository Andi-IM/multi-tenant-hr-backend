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
   * @returns {Promise<{ token: string, expiresIn: number }>}
   */
  async login(
    input: LoginInput,
    serviceCompanyId: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const { email, password } = input;

    // 1. Cari employee berdasarkan email
    const employee = await employeeRepository.findByEmail(serviceCompanyId, email);

    if (!employee) {
      // Return generic error for security
      throw AppError.unauthorized('Invalid credentials');
    }

    // 2. Verifikasi password menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);

    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid credentials');
    }

    // 3. Generate JWT dengan payload: userId, email, role, companyId, exp
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here';
    const expiresIn = 3600; // 1 hour as requested in criteria
    const payload = {
      userId: employee._id.toString(),
      employeeId: employee.employeeId,
      email: employee.email,
      role: employee.role,
      companyId: employee.companyId,
    };

    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn,
    });

    // 4. Generate Refresh Token (Longer expiration, separate secret)
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key-here';
    const refreshToken = jwt.sign(payload, refreshSecret, {
      expiresIn: '7d', // 7 days refresh validity
    });

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   * Stateless implementation: Verifies signatures and returns new pair.
   *
   * @param refreshToken - The refresh token provided by the client
   * @returns {Promise<{ accessToken: string, refreshToken: string, expiresIn: number }>}
   */
  async refresh(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key-here';
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here';

    try {
      // 1. Verify refresh token
      const decoded = jwt.verify(refreshToken, refreshSecret) as any;

      // 2. Prepare new payload (removing iat/exp from decoded)
      const { iat, exp, ...payload } = decoded;

      // 3. Generate new pair
      const expiresIn = 3600;
      const newAccessToken = jwt.sign(payload, jwtSecret, { expiresIn });
      const newRefreshToken = jwt.sign(payload, refreshSecret, { expiresIn: '7d' });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      };
    } catch (error) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }
  }
}

export const authService = new AuthService();
