import express, {
  type Application,
  type Request,
  type Response,
  type ErrorRequestHandler,
} from 'express';
import routes from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';
import { errorHandler } from './middleware/error.middleware.js';

/**
 * Express Application Configuration
 *
 * Sets up:
 * 1. JSON body parser
 * 2. URL-encoded body parser
 * 3. Health check endpoint
 * 4. API routes (mounted under /api)
 * 5. Global error handler (must be last)
 */
const app: Application = express();

// --- Body Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health Check ---
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Company A Service',
    timestamp: new Date().toISOString(),
  });
});

// --- API Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API Routes ---
app.use('/api', routes);

// --- Global Error Handler (must be registered last) ---
app.use(errorHandler as ErrorRequestHandler);

export default app;
