/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and API keys
 */

const { verifyAccessToken, hashToken } = require('../auth/jwt');
const db = require('../../../models');
const { AppError } = require('./errorHandler');

/**
 * Extract token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Extract API key from header
 */
function extractApiKey(req) {
  return req.headers['x-api-key'] || req.headers['api-key'];
}

/**
 * Authenticate user with JWT token
 */
async function authenticate(req, res, next) {
  try {
    // Try JWT token first
    const token = extractToken(req);

    if (token) {
      try {
        // Verify JWT token
        const decoded = verifyAccessToken(token);

        // Get user from database
        const user = await db.User.findByPk(decoded.id, {
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
          throw new AppError('User not found', 401, 'USER_NOT_FOUND');
        }

        if (!user.is_active) {
          throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
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

        // Attach user to request
        req.user = user;
        req.authMethod = 'jwt';

        return next();
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
      }
    }

    // Try API key authentication
    const apiKey = extractApiKey(req);

    if (apiKey) {
      return authenticateApiKey(req, res, next);
    }

    // No authentication provided
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');

  } catch (error) {
    next(error);
  }
}

/**
 * Authenticate with API key
 */
async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      throw new AppError('API key required', 401, 'API_KEY_REQUIRED');
    }

    // Hash the API key
    const keyHash = hashToken(apiKey);

    // Find API key in database
    const apiKeyRecord = await db.ApiKey.findOne({
      where: { key_hash: keyHash, is_active: true },
      include: [{
        model: db.User,
        as: 'user',
        include: [{
          model: db.Role,
          as: 'role',
          include: [{
            model: db.Permission,
            as: 'permissions',
            through: { attributes: [] }
          }]
        }]
      }]
    });

    if (!apiKeyRecord) {
      throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
    }

    // Check expiration
    if (apiKeyRecord.expires_at && new Date() > new Date(apiKeyRecord.expires_at)) {
      throw new AppError('API key expired', 401, 'API_KEY_EXPIRED');
    }

    // Check if user is active
    if (!apiKeyRecord.user.is_active) {
      throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Update last used timestamp
    await apiKeyRecord.update({
      last_used_at: new Date()
    });

    // Attach user to request
    req.user = apiKeyRecord.user;
    req.apiKey = apiKeyRecord;
    req.authMethod = 'api-key';

    next();

  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication
 * Attaches user to request if authenticated, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    await authenticate(req, res, () => {
      next();
    });
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Get user permissions
 */
function getUserPermissions(user) {
  if (!user || !user.role || !user.role.permissions) {
    return [];
  }

  return user.role.permissions.map(p => p.name);
}

module.exports = {
  authenticate,
  authenticateApiKey,
  optionalAuth,
  getUserPermissions
};
