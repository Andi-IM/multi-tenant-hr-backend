import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory: Validate Request Body
 *
 * Accepts a Zod schema and returns a middleware that validates `req.body`.
 * On failure, returns 400 Bad Request with structured validation errors.
 *
 * @param schema - Zod schema to validate against
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        _res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: details,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Middleware factory: Validate Request Query Parameters
 *
 * Accepts a Zod schema and returns a middleware that validates `req.query`.
 * Uses Zod to parse/coerce strings into numbers/booleans as defined by the schema.
 * On failure, returns 400 Bad Request with structured validation errors.
 *
 * @param schema - Zod schema to validate against
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      Object.defineProperty(req, 'query', {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        _res.status(400).json({
          status: 'error',
          message: 'Query validation failed',
          errors: details,
        });
        return;
      }
      next(error);
    }
  };
}
