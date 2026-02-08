const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * Implements different rate limits for different types of requests
 */

// Auth rate limiter: 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skip: (req) => req.method === 'GET' // Skip GET requests
});

// API rate limiter: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many API requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Report rate limiter: 50 requests per 15 minutes
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: {
    success: false,
    error: 'Too many report requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Export rate limiter: 10 requests per hour (resource-intensive)
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: 'Too many export requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Import rate limiter: 5 requests per hour (server-side fetch)
const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many import requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter,
  apiLimiter,
  reportLimiter,
  exportLimiter,
  importLimiter
};