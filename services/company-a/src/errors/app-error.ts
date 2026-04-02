/**
 * Custom application error class for structured error responses.
 * Used across all layers to throw operational errors with HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Factory: 400 Bad Request
   */
  static badRequest(message: string): AppError {
    return new AppError(message, 400);
  }

  /**
   * Factory: 401 Unauthorized
   */
  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(message, 401);
  }

  /**
   * Factory: 403 Forbidden
   */
  static forbidden(message: string = 'Access denied'): AppError {
    return new AppError(message, 403);
  }

  /**
   * Factory: 404 Not Found
   */
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, 404);
  }

  /**
   * Factory: 409 Conflict
   */
  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }
}
