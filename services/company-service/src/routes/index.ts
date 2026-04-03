import { Router } from 'express';
import employeeRoutes from './employee.route.js';
import internalRoutes from './internal.route.js';

const router = Router();

/**
 * Mount all route modules here.
 * Each module is mounted under its respective path prefix.
 */
router.use('/employees', employeeRoutes);
router.use('/v1/internal', internalRoutes);

export default router;
