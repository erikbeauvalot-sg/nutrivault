/**
 * Authentication Service
 *
 * Business logic for authentication operations
 */

const db = require('../../../models');
const { hashPassword, verifyPassword } = require('../auth/password');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateApiKey,
  getApiKeyPrefix,
  calculateTokenExpiration,
  REFRESH_TOKEN_EXPIRES_IN
} = require('../auth/jwt');
const { AppError } = require('../middleware/errorHandler');
const { logAuthEvent } = require('./audit.service');

// Account lockout configuration
const MAX_FAILED_LOGIN_ATTEMPTS = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5');
const ACCOUNT_LOCKOUT_DURATION = process.env.ACCOUNT_LOCKOUT_DURATION || '30m';

/**
 * Register new user (Admin only)
 */
async function register(userData, createdBy) {
  const { username, email, password, first_name, last_name, role_id } = userData;

  // Check if username already exists
  const existingUser = await db.User.findOne({
    where: { username }
  });

  if (existingUser) {
    throw new AppError('Username already exists', 409, 'USERNAME_EXISTS');
  }

  // Check if email already exists
  const existingEmail = await db.User.findOne({
    where: { email }
  });

  if (existingEmail) {
    throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const user = await db.User.create({
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role_id,
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy
  });

  // Remove password hash from response
  const userResponse = user.toJSON();
  delete userResponse.password_hash;

  return userResponse;
}

/**
 * Login user
 */
async function login(username, password, ipAddress, userAgent) {
  // Find user by username
  const user = await db.User.findOne({
    where: { username },
    include: [{
      model: db.Role,
      as: 'role',
      include: [{
        model: db.Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    }]
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Check if account is locked
  if (user.locked_until && new Date() < new Date(user.locked_until)) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw new AppError(
      `Account is locked. Try again in ${minutesLeft} minutes`,
      401,
      'ACCOUNT_LOCKED'
    );
  }

  // Check if account is active
  if (!user.is_active) {
    throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password_hash);

  if (!isPasswordValid) {
    // Increment failed login attempts
    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    const updateData = {
      failed_login_attempts: failedAttempts
    };

    // Lock account if max attempts reached
    if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockoutExpiry = calculateTokenExpiration(ACCOUNT_LOCKOUT_DURATION);
      updateData.locked_until = lockoutExpiry;
    }

    await user.update(updateData);

    // Log failed login attempt
    await logAuthEvent({
      user_id: user.id,
      username: user.username,
      action: 'FAILED_LOGIN',
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'FAILURE',
      error_message: 'Invalid password'
    });

    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Reset failed login attempts on successful login
  if (user.failed_login_attempts > 0 || user.locked_until) {
    await user.update({
      failed_login_attempts: 0,
      locked_until: null
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refresh token in database
  const refreshTokenExpiry = calculateTokenExpiration(REFRESH_TOKEN_EXPIRES_IN);
  await db.RefreshToken.create({
    token_hash: hashToken(refreshToken),
    user_id: user.id,
    expires_at: refreshTokenExpiry,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  // Update last login timestamp
  await user.update({
    last_login_at: new Date()
  });

  // Log successful login
  await logAuthEvent({
    user_id: user.id,
    username: user.username,
    action: 'LOGIN',
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'SUCCESS'
  });

  // Remove sensitive data from response
  const userResponse = user.toJSON();
  delete userResponse.password_hash;
  delete userResponse.failed_login_attempts;
  delete userResponse.locked_until;

  return {
    user: userResponse,
    accessToken,
    refreshToken
  };
}

/**
 * Logout user (invalidate refresh token)
 */
async function logout(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token required', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  const tokenHash = hashToken(refreshToken);

  // Find and revoke refresh token
  const token = await db.RefreshToken.findOne({
    where: { token_hash: tokenHash }
  });

  if (token) {
    await token.update({
      revoked_at: new Date()
    });

    // Log logout
    await logAuthEvent({
      user_id: token.user_id,
      username: null,
      action: 'LOGOUT',
      ip_address: null,
      user_agent: null,
      status: 'SUCCESS'
    });
  }

  return { message: 'Logged out successfully' };
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken, ipAddress, userAgent) {
  if (!refreshToken) {
    throw new AppError('Refresh token required', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Check if token exists in database
  const tokenHash = hashToken(refreshToken);
  const storedToken = await db.RefreshToken.findOne({
    where: { token_hash: tokenHash },
    include: [{
      model: db.User,
      as: 'user',
      include: [{
        model: db.Role,
        as: 'role'
      }]
    }]
  });

  if (!storedToken) {
    throw new AppError('Refresh token not found', 401, 'REFRESH_TOKEN_NOT_FOUND');
  }

  // Check if token is revoked
  if (storedToken.revoked_at) {
    throw new AppError('Refresh token has been revoked', 401, 'REFRESH_TOKEN_REVOKED');
  }

  // Check if token is expired
  if (new Date() > new Date(storedToken.expires_at)) {
    throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
  }

  // Check if user is active
  if (!storedToken.user.is_active) {
    throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }

  // Generate new access token
  const accessToken = generateAccessToken(storedToken.user);

  return { accessToken };
}

/**
 * Create API key
 */
async function createApiKey(userId, name, expiresAt) {
  // Generate API key
  const apiKey = generateApiKey();
  const keyHash = hashToken(apiKey);
  const keyPrefix = getApiKeyPrefix(apiKey);

  // Create API key record
  const apiKeyRecord = await db.ApiKey.create({
    key_hash: keyHash,
    key_prefix: keyPrefix,
    user_id: userId,
    name: name || 'API Key',
    expires_at: expiresAt || null,
    is_active: true,
    created_by: userId
  });

  // Return the full API key (this is the only time it's available)
  return {
    id: apiKeyRecord.id,
    apiKey: apiKey, // Full key - show to user ONCE
    prefix: keyPrefix,
    name: apiKeyRecord.name,
    expires_at: apiKeyRecord.expires_at,
    created_at: apiKeyRecord.created_at,
    warning: 'Save this API key securely. It will not be shown again.'
  };
}

/**
 * List user's API keys
 */
async function listApiKeys(userId) {
  const apiKeys = await db.ApiKey.findAll({
    where: {
      user_id: userId,
      is_active: true
    },
    attributes: ['id', 'key_prefix', 'name', 'expires_at', 'last_used_at', 'created_at'],
    order: [['created_at', 'DESC']]
  });

  return apiKeys;
}

/**
 * Revoke API key
 */
async function revokeApiKey(apiKeyId, userId) {
  const apiKey = await db.ApiKey.findOne({
    where: {
      id: apiKeyId,
      user_id: userId
    }
  });

  if (!apiKey) {
    throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
  }

  await apiKey.update({
    is_active: false
  });

  return { message: 'API key revoked successfully' };
}

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  createApiKey,
  listApiKeys,
  revokeApiKey
};
