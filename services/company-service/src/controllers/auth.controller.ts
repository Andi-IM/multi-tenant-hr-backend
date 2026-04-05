import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { LoginInput } from '../validators/auth.validator.js';

export class AuthController {
  /**
   * Login employee and return JWT.
   */
  async login(
    req: Request<Record<string, never>, Record<string, never>, LoginInput>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const serviceCompanyId = process.env.COMPANY_ID || 'A';
      const result = await authService.login(req.body, serviceCompanyId);

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
