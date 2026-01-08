/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication endpoints
 */

const authService = require('../services/auth.service');
const { validatePasswordStrength } = require('../auth/password');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * Register new user (Admin only)
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password, first_name, last_name, role_id } = req.body;

  // Validate required fields
  if (!username || !email || !password || !first_name || !last_name || !role_id) {
    throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new AppError(
      'Password does not meet requirements',
      400,
      'WEAK_PASSWORD',
      { errors: passwordValidation.errors }
    );
  }

  // Create user
  const user = await authService.register(
    { username, email, password, first_name, last_name, role_id },
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user }
  });
});

/**
 * Login
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    throw new AppError('Username and password are required', 400, 'VALIDATION_ERROR');
  }

  // Get IP address and user agent
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Login
  const result = await authService.login(username, password, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  await authService.logout(refreshToken);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // Get IP address and user agent
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const result = await authService.refreshAccessToken(refreshToken, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: result
  });
});

/**
 * Create API key
 * POST /api/auth/api-keys
 */
const createApiKey = asyncHandler(async (req, res) => {
  const { name, expires_at } = req.body;

  const result = await authService.createApiKey(
    req.user.id,
    name,
    expires_at ? new Date(expires_at) : null
  );

  res.status(201).json({
    success: true,
    message: 'API key created successfully',
    data: result
  });
});

/**
 * List API keys
 * GET /api/auth/api-keys
 */
const listApiKeys = asyncHandler(async (req, res) => {
  const apiKeys = await authService.listApiKeys(req.user.id);

  res.json({
    success: true,
    data: {
      apiKeys,
      count: apiKeys.length
    }
  });
});

/**
 * Revoke API key
 * DELETE /api/auth/api-keys/:id
 */
const revokeApiKey = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await authService.revokeApiKey(id, req.user.id);

  res.json({
    success: true,
    message: 'API key revoked successfully'
  });
});

/**
 * Get current user info
 * GET /api/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user.toJSON();
  delete user.password_hash;
  delete user.failed_login_attempts;
  delete user.locked_until;

  res.json({
    success: true,
    data: { user }
  });
});

module.exports = {
  register,
  login,
  logout,
  refresh,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getCurrentUser
};
