/**
 * JWT Authentication Utilities
 *
 * Handles JWT token generation, verification, and refresh token management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-in-production';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * Generate access token (JWT)
 */
function generateAccessToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role_id: user.role_id,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'nutrivault',
    subject: user.id
  });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    type: 'refresh',
    jti: crypto.randomBytes(16).toString('hex') // Unique token ID
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'nutrivault',
    subject: user.id
  });
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'nutrivault'
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'nutrivault'
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
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Hash token for storage (one-way hash)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate API key
 */
function generateApiKey() {
  // Format: nutri_ak_<32 random characters>
  const randomPart = crypto.randomBytes(24).toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 32);

  return `nutri_ak_${randomPart}`;
}

/**
 * Get API key prefix (first 12 characters for identification)
 */
function getApiKeyPrefix(apiKey) {
  return apiKey.substring(0, 12);
}

/**
 * Calculate token expiration date
 */
function calculateTokenExpiration(expiresIn) {
  // Parse expiry string (e.g., '7d', '30m', '24h')
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid expiration format');
  }

  const value = parseInt(match[1]);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case 's': // seconds
      return new Date(now.getTime() + value * 1000);
    case 'm': // minutes
      return new Date(now.getTime() + value * 60 * 1000);
    case 'h': // hours
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd': // days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error('Invalid expiration unit');
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  hashToken,
  generateApiKey,
  getApiKeyPrefix,
  calculateTokenExpiration,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};
