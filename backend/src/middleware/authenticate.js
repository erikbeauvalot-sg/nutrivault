const { verifyAccessToken } = require('../auth/jwt');
const authService = require('../services/auth.service');
const db = require('../../../models');

/**
 * Authentication middleware - supports both JWT and API key authentication
 * Attaches req.user with full user object including role and permissions
 */
async function authenticate(req, res, next) {
  try {
    // Check for Bearer token first
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Verify JWT token
        const decoded = verifyAccessToken(token);

        // Load user with role and permissions
        const user = await db.User.findByPk(decoded.sub, {
          include: [
            {
              model: db.Role,
              include: [
                {
                  model: db.Permission,
                  through: { attributes: [] }
                }
              ]
            }
          ]
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }

        // Check if account is active
        if (!user.is_active) {
          return res.status(403).json({
            success: false,
            error: 'Account is deactivated'
          });
        }

        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          const minutesRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
          return res.status(403).json({
            success: false,
            error: `Account is locked. Try again in ${minutesRemaining} minutes`
          });
        }

        // Attach user to request
        req.user = user;
        return next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: error.message || 'Invalid or expired token'
        });
      }
    }

    // Check for API key if no Bearer token
    const apiKey = req.headers['x-api-key'] || req.headers['api-key'];

    if (apiKey) {
      try {
        // Validate API key
        const user = await authService.validateApiKey(apiKey);

        // Check if account is active (already checked in validateApiKey, but double-check)
        if (!user.is_active) {
          return res.status(403).json({
            success: false,
            error: 'Account is deactivated'
          });
        }

        // Attach user to request
        req.user = user;
        return next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: error.message || 'Invalid API key'
        });
      }
    }

    // No authentication provided
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide Bearer token or API key'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

module.exports = { authenticate };
