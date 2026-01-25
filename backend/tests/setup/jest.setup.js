/**
 * Jest Global Setup
 * Runs before all test suites
 */

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console output during tests (optional - comment out for debugging)
if (process.env.SUPPRESS_LOGS !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep warn and error for debugging
    warn: console.warn,
    error: console.error
  };
}

// Global afterAll to ensure clean shutdown
afterAll(async () => {
  // Allow async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
