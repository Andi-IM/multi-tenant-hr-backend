import express, {
  type Application,
  type Request,
  type Response,
  type ErrorRequestHandler,
} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import attendanceRoutes from './routes/attendance.route.js';
import { swaggerSpec } from './config/swagger.config.js';
import { errorHandler } from './middleware/error.middleware.js';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Attendance Service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/attendances', attendanceRoutes);

app.use(errorHandler as ErrorRequestHandler);

export default app;
