import { Router } from 'express';
import employeeRoutes from './employee.route.js';

const router = Router();

/**
 * Mount all route modules here.
 * Each module is mounted under its respective path prefix.
 */
router.use('/employees', employeeRoutes);

export default router;
