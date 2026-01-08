/**
 * Rate Limiting Middleware
 *
 * Configures rate limiting for different endpoint types to prevent abuse
 * Note: Rate limiting is disabled in test environment to allow test suites to run
 * 
 * All limits are configurable via environment variables.
 * Set any limit to 0 for infinite (no rate limiting for that endpoint).
 */

const rateLimit = require('express-rate-limit');

/**
 * Bypass middleware for test environment or infinite limits
 */
const noOpLimiter = (req, res, next) => next();

/**
 * Check if we're in test or development environment
 */
const isTestEnv = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Helper function to parse rate limit from environment
 * Returns noOpLimiter if limit is 0 (infinite)
 */
const parseRateLimit = (envValue, defaultValue) => {
  const limit = parseInt(envValue) || defaultValue;
  return limit;
};

/**
 * Helper function to create rate limiter with environment config
 * Returns noOpLimiter if max is 0 (infinite)
 */
const createRateLimiter = (config) => {
  if (isTestEnv || config.max === 0) {
    return noOpLimiter;
  }
  return rateLimit(config);
};

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/registration
 * More relaxed in development for easier testing
 * 
 * ENV: AUTH_RATE_LIMIT_MAX (default: 5 in prod, 50 in dev)
 * ENV: AUTH_RATE_LIMIT_WINDOW_MS (default: 900000 = 15 minutes)
 */
const authLimiter = createRateLimiter({
  windowMs: parseRateLimit(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseRateLimit(
    process.env.AUTH_RATE_LIMIT_MAX,
    isDevelopment ? 50 : 5
  ),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false // Count failed requests
});

/**
 * Standard rate limiter for general API endpoints
 * Allows reasonable usage while preventing abuse
 * 
 * ENV: API_RATE_LIMIT_MAX (default: 100)
 * ENV: API_RATE_LIMIT_WINDOW_MS (default: 900000 = 15 minutes)
 */
const apiLimiter = createRateLimiter({
  windowMs: parseRateLimit(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseRateLimit(process.env.API_RATE_LIMIT_MAX, 100),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again later.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Relaxed rate limiter for report endpoints
 * Reports can be resource-intensive but are less likely to be abused
 * 
 * ENV: REPORT_RATE_LIMIT_MAX (default: 50)
 * ENV: REPORT_RATE_LIMIT_WINDOW_MS (default: 900000 = 15 minutes)
 */
const reportLimiter = createRateLimiter({
  windowMs: parseRateLimit(process.env.REPORT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseRateLimit(process.env.REPORT_RATE_LIMIT_MAX, 50),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many report requests. Please try again later.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Very strict rate limiter for password reset endpoints
 * Prevents email/SMS flooding and enumeration attacks
 * 
 * ENV: PASSWORD_RESET_RATE_LIMIT_MAX (default: 3)
 * ENV: PASSWORD_RESET_RATE_LIMIT_WINDOW_MS (default: 3600000 = 1 hour)
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: parseRateLimit(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  max: parseRateLimit(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 3),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset attempts. Please try again later.',
      retryAfter: '1 hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Moderate rate limiter for data export endpoints
 * Exports can be resource-intensive and should be limited
 * 
 * ENV: EXPORT_RATE_LIMIT_MAX (default: 10)
 * ENV: EXPORT_RATE_LIMIT_WINDOW_MS (default: 3600000 = 1 hour)
 */
const exportLimiter = createRateLimiter({
  windowMs: parseRateLimit(process.env.EXPORT_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  max: parseRateLimit(process.env.EXPORT_RATE_LIMIT_MAX, 10),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many export requests. Please try again later.',
      retryAfter: '1 hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * Global rate limiter for all requests (fallback protection)
 * Very high limit to catch extreme abuse only
 * 
 * ENV: GLOBAL_RATE_LIMIT_MAX (default: 500)
 * ENV: GLOBAL_RATE_LIMIT_WINDOW_MS (default: 900000 = 15 minutes)
 */
const globalLimiter = createRateLimiter({
  windowMs: parseRateLimit(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: parseRateLimit(process.env.GLOBAL_RATE_LIMIT_MAX, 500),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please slow down.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests for global limit
});

module.exports = {
  authLimiter,
  apiLimiter,
  reportLimiter,
  passwordResetLimiter,
  exportLimiter,
  globalLimiter
};
