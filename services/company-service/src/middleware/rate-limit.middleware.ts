import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';

/**
 * Rate limiting middleware for sensitive endpoints (e.g., /login).
 * Limits each IP to 5 requests per 15 minutes.
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: {
    status: 'error',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
}) as RequestHandler;

export const effectiveLoginRateLimit: RequestHandler =
  process.env.NODE_ENV !== 'production' || process.env.RATE_LIMIT_ENABLED === 'false'
    ? (_req, _res, next) => next()
    : loginRateLimit;
