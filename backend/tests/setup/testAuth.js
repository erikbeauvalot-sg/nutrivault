/**
 * Test Authentication Utilities
 * Provides helpers for creating authenticated users in tests
 */

const bcrypt = require('bcryptjs');
const testDb = require('./testDb');

// Use the actual JWT module from the codebase
const { signAccessToken } = require('../../src/auth/jwt');

// Counter for generating unique emails
let userCounter = 0;

/**
 * Generate a unique email for test users
 */
function generateUniqueEmail(prefix = 'test') {
  userCounter++;
  return `${prefix}_${userCounter}_${Date.now()}@test.com`;
}

/**
 * Generate a unique username for test users
 */
function generateUniqueUsername(prefix = 'test') {
  return `${prefix}_${userCounter}_${Date.now()}`;
}

/**
 * Create a test user with specified role
 * @param {string} roleName - 'ADMIN', 'DIETITIAN', or 'ASSISTANT'
 * @param {object} overrides - Optional field overrides
 * @returns {object} User data with authHeader and token
 */
async function createUser(roleName = 'ADMIN', overrides = {}) {
  const db = testDb.getDb();

  // Find the role
  const role = await db.Role.findOne({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role ${roleName} not found. Make sure to call testDb.seedBaseData() first.`);
  }

  // Hash password
  const password = overrides.password || 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate unique identifiers
  const uniqueEmail = overrides.email || generateUniqueEmail(roleName.toLowerCase());
  const uniqueUsername = overrides.username || generateUniqueUsername(roleName.toLowerCase());

  // Create user
  const userData = {
    username: uniqueUsername,
    first_name: overrides.first_name || `Test${roleName}`,
    last_name: overrides.last_name || 'User',
    email: uniqueEmail,
    password_hash: hashedPassword,
    role_id: role.id,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    ...overrides
  };
  delete userData.password; // Remove plain password if passed
  delete userData.email_verified; // Field doesn't exist in User model

  const user = await db.User.create(userData);

  // Generate JWT token
  const token = generateToken(user, role);

  // Load user with role and permissions for complete auth context
  const fullUser = await db.User.findByPk(user.id, {
    include: [{
      model: db.Role,
      as: 'role',
      include: [{
        model: db.Permission,
        as: 'permissions'
      }]
    }]
  });

  return {
    user: fullUser,
    token,
    authHeader: `Bearer ${token}`,
    password,
    role: roleName
  };
}

/**
 * Generate a JWT token for a user using the actual JWT module
 * @param {object} user - User model instance
 * @param {object} role - Role model instance
 * @returns {string} JWT token
 */
function generateToken(user, role) {
  // Use the actual signAccessToken function from the codebase
  return signAccessToken(user.id, {
    role_id: role.id,
    username: user.username
  });
}

/**
 * Generate an expired token for testing
 * Note: This uses a workaround since we can't easily create expired tokens
 * @returns {string} Invalid token that will fail verification
 */
function generateExpiredToken() {
  return 'expired.token.here';
}

/**
 * Generate an invalid token (wrong secret)
 * @returns {string} Invalid JWT token
 */
function generateInvalidToken() {
  return 'invalid.token.here';
}

/**
 * Create an admin user (convenience function)
 * @param {object} overrides - Optional field overrides
 * @returns {object} User data with authHeader and token
 */
async function createAdmin(overrides = {}) {
  return createUser('ADMIN', overrides);
}

/**
 * Create a dietitian user (convenience function)
 * @param {object} overrides - Optional field overrides
 * @returns {object} User data with authHeader and token
 */
async function createDietitian(overrides = {}) {
  return createUser('DIETITIAN', overrides);
}

/**
 * Create an assistant user (convenience function)
 * @param {object} overrides - Optional field overrides
 * @returns {object} User data with authHeader and token
 */
async function createAssistant(overrides = {}) {
  return createUser('ASSISTANT', overrides);
}

/**
 * Reset the user counter (useful between test files)
 */
function resetCounter() {
  userCounter = 0;
}

/**
 * Create multiple users of different roles
 * @returns {object} Object containing admin, dietitian, and assistant users
 */
async function createAllRoleUsers() {
  const admin = await createAdmin();
  const dietitian = await createDietitian();
  const assistant = await createAssistant();

  return { admin, dietitian, assistant };
}

module.exports = {
  createUser,
  createAdmin,
  createDietitian,
  createAssistant,
  createAllRoleUsers,
  generateToken,
  generateExpiredToken,
  generateInvalidToken,
  generateUniqueEmail,
  resetCounter
};
