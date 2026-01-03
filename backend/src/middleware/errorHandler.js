/**
 * Global Error Handling Middleware
 *
 * Catches all errors and formats them consistently
 */

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Default error response
  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Invalid or expired token';
  }

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Database validation failed';
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'A record with this value already exists';
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    errorCode = 'INVALID_REFERENCE';
    message = 'Referenced record does not exist';
  }

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = err.errors || err.details;
    errorResponse.error.stack = err.stack;
  }

  // Add validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    errorResponse.error.validationErrors = err.errors.map(e => ({
      field: e.path || e.field,
      message: e.message,
      value: e.value
    }));
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = errorHandler;
module.exports.asyncHandler = asyncHandler;
module.exports.AppError = AppError;
