import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { AppError } from '../errors/app-error.js';

export class AuthController {
  /**
   * Login employee and return JWT.
   */
  async login(req: Request, res: Response, next: NextFunction) {
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

  /**
   * Refresh access token using refresh token.
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw AppError.unauthorized('Refresh token is required');
      }

      const result = await authService.refresh(refreshToken);

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
