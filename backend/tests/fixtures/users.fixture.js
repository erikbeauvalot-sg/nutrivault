/**
 * User Fixtures
 * Test data for user-related tests
 */

const bcrypt = require('bcryptjs');

// Default password for all test users
const DEFAULT_PASSWORD = 'TestPassword123!';

/**
 * Get a hashed password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password = DEFAULT_PASSWORD) {
  return bcrypt.hash(password, 10);
}

/**
 * Valid user creation data
 */
const validUser = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@test.com',
  password: DEFAULT_PASSWORD
};

/**
 * Admin user data
 */
const adminUser = {
  first_name: 'Admin',
  last_name: 'User',
  email: 'admin@test.com',
  password: DEFAULT_PASSWORD,
  role_id: 1 // ADMIN
};

/**
 * Dietitian user data
 */
const dietitianUser = {
  first_name: 'Dietitian',
  last_name: 'User',
  email: 'dietitian@test.com',
  password: DEFAULT_PASSWORD,
  role_id: 2 // DIETITIAN
};

/**
 * Assistant user data
 */
const assistantUser = {
  first_name: 'Assistant',
  last_name: 'User',
  email: 'assistant@test.com',
  password: DEFAULT_PASSWORD,
  role_id: 3 // ASSISTANT
};

/**
 * Invalid user data scenarios
 */
const invalidUsers = {
  missingEmail: {
    first_name: 'Test',
    last_name: 'User',
    password: DEFAULT_PASSWORD
  },
  missingPassword: {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@test.com'
  },
  invalidEmail: {
    first_name: 'Test',
    last_name: 'User',
    email: 'not-an-email',
    password: DEFAULT_PASSWORD
  },
  shortPassword: {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@test.com',
    password: '123'
  },
  missingFirstName: {
    last_name: 'User',
    email: 'test@test.com',
    password: DEFAULT_PASSWORD
  },
  missingLastName: {
    first_name: 'Test',
    email: 'test@test.com',
    password: DEFAULT_PASSWORD
  }
};

/**
 * Login credentials
 */
const loginCredentials = {
  valid: {
    email: 'admin@test.com',
    password: DEFAULT_PASSWORD
  },
  wrongPassword: {
    email: 'admin@test.com',
    password: 'WrongPassword123!'
  },
  nonExistentUser: {
    email: 'nonexistent@test.com',
    password: DEFAULT_PASSWORD
  }
};

/**
 * User update data
 */
const userUpdates = {
  valid: {
    first_name: 'Updated',
    last_name: 'Name'
  },
  invalidEmail: {
    email: 'not-valid-email'
  }
};

/**
 * Password change data
 */
const passwordChange = {
  valid: {
    current_password: DEFAULT_PASSWORD,
    new_password: 'NewPassword123!',
    confirm_password: 'NewPassword123!'
  },
  wrongCurrent: {
    current_password: 'WrongPassword123!',
    new_password: 'NewPassword123!',
    confirm_password: 'NewPassword123!'
  },
  mismatch: {
    current_password: DEFAULT_PASSWORD,
    new_password: 'NewPassword123!',
    confirm_password: 'DifferentPassword123!'
  }
};

module.exports = {
  DEFAULT_PASSWORD,
  hashPassword,
  validUser,
  adminUser,
  dietitianUser,
  assistantUser,
  invalidUsers,
  loginCredentials,
  userUpdates,
  passwordChange
};
