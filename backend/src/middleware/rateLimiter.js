/**
 * Rate Limiting Middleware
 *
 * Configures rate limiting for different endpoint types to prevent abuse
 * Note: Rate limiting is disabled in test environment to allow test suites to run
 */

const rateLimit = require('express-rate-limit');

/**
 * Bypass middleware for test environment
 */
const noOpLimiter = (req, res, next) => next();

/**
 * Check if we're in test environment
 */
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/registration
 */
const authLimiter = isTestEnv ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
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
 */
const apiLimiter = isTestEnv ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
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
 */
const reportLimiter = isTestEnv ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
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
 */
const passwordResetLimiter = isTestEnv ? noOpLimiter : rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
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
 */
const exportLimiter = isTestEnv ? noOpLimiter : rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 exports per hour
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
 */
const globalLimiter = isTestEnv ? noOpLimiter : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
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
