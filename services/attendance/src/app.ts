import express, {
  type Application,
  type Request,
  type Response,
  type ErrorRequestHandler,
} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import attendanceRoutes from './routes/attendance.route.js';
import { errorHandler } from './middleware/error.middleware.js';

/**
 * Express Application Configuration
 */
const app: Application = express();

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health Check ---
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Attendance Service',
    timestamp: new Date().toISOString(),
  });
});

// --- API Routes ---
app.use('/api/v1/attendances', attendanceRoutes);

// --- Global Error Handler (must be registered last) ---
app.use(errorHandler as ErrorRequestHandler);

export default app;
