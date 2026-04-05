import { Router } from 'express';
import employeeRoutes from './employee.route.js';
import internalRoutes from './internal.route.js';
import authRoutes from './auth.route.js';

const router = Router();

/**
 * Mount all route modules here.
 * Each module is mounted under its respective path prefix.
 */
router.use('/v1/employees', employeeRoutes);
router.use('/v1/internal', internalRoutes);
router.use('/v1/auth', authRoutes);

export default router;
