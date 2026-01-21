const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '30m';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '30d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'nutrivault';

// Validate required environment variables (deferred validation)
function validateEnvironment() {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be defined and at least 32 characters long');
  }

  if (!REFRESH_TOKEN_SECRET || REFRESH_TOKEN_SECRET.length < 32) {
    throw new Error('REFRESH_TOKEN_SECRET must be defined and at least 32 characters long');
  }
}

/**
 * Sign an access token with user information
 * @param {string} userId - User's UUID
 * @param {Object} userData - Additional user data (role_id, username, etc.)
 * @returns {string} Signed JWT access token
 */
function signAccessToken(userId, userData = {}) {
  const payload = {
    sub: userId,
    type: 'access',
    ...userData
  };

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_ACCESS_EXPIRATION,
    issuer: JWT_ISSUER,
    audience: JWT_ISSUER
  });
}

/**
 * Sign a refresh token
 * @param {string} userId - User's UUID
 * @returns {string} Signed JWT refresh token
 */
function signRefreshToken(userId) {
  const payload = {
    sub: userId,
    type: 'refresh'
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_REFRESH_EXPIRATION,
    issuer: JWT_ISSUER,
    audience: JWT_ISSUER
  });
}

/**
 * Verify an access token
 * @param {string} token - JWT access token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_ISSUER
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify a refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_ISSUER
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Generate a complete token pair (access + refresh)
 * @param {Object} user - User object with id, role_id, username
 * @returns {Object} Object containing accessToken and refreshToken
 */
function generateTokenPair(user) {
  // Validate environment variables on first use
  validateEnvironment();

  const accessToken = signAccessToken(user.id, {
    role_id: user.role_id,
    username: user.username
  });

  const refreshToken = signRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    expiresIn: getExpirationSeconds(JWT_ACCESS_EXPIRATION)
  };
}

/**
 * Convert expiration string to seconds
 * @param {string} expiration - Expiration string (e.g., '30m', '7d')
 * @returns {number} Expiration time in seconds
 */
function getExpirationSeconds(expiration) {
  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) return 1800; // Default 30 minutes

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };

  return value * (multipliers[unit] || 60);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair
};
