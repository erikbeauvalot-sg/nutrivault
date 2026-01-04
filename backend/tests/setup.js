/**
 * Jest Test Setup
 *
 * This file runs before each test suite
 */

const db = require('../../models');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests

// Increase test timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup before all tests
beforeAll(async () => {
  // Sync database (creates tables in memory or test database)
  await db.sequelize.sync({ force: true });
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await db.sequelize.close();
});

// Clean up after each test
afterEach(async () => {
  // Clear all tables
  const models = Object.keys(db).filter(key =>
    key !== 'sequelize' && key !== 'Sequelize'
  );

  for (const modelName of models) {
    if (db[modelName].destroy) {
      await db[modelName].destroy({ where: {}, force: true });
    }
  }
});
