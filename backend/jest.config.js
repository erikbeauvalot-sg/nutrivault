/**
 * Jest Configuration for NutriVault Backend
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/data/'
  ],

  // Transform ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],

  // Use babel-jest to transform
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/cli/**/*.js',
    '!src/seed.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Timeout for tests
  testTimeout: 30000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true
};
