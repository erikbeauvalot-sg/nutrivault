const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../../models');
const { generateTokenPair } = require('../auth/jwt');
const auditService = require('./audit.service');

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;

class AuthService {
  /**
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @param {boolean} rememberMe - If true, extend token validity to 24h
   * @returns {Object} User object with tokens
   */
  async login(username, password, rememberMe = false) {
    try {
      // Find user by username, or by email (for patient portal login)
      let user = await db.User.findOne({
        where: { username },
        include: [
          {
            model: db.Role,
            as: 'role',
            include: [
              {
                model: db.Permission,
                as: 'permissions',
                through: { attributes: [] }
              }
            ]
          }
        ]
      });

      // If not found by username, try by email for PATIENT users only
      // (dietitians/admins log in with username, patients log in with email)
      if (!user) {
        const patientRole = await db.Role.findOne({ where: { name: 'PATIENT' } });
        if (patientRole) {
          user = await db.User.findOne({
            where: {
              email: username.trim().toLowerCase(),
              role_id: patientRole.id
            },
            include: [
              {
                model: db.Role,
                as: 'role',
                include: [
                  {
                    model: db.Permission,
                    as: 'permissions',
                    through: { attributes: [] }
                  }
                ]
              }
            ]
          });
        }
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if account is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutesRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        throw new Error(`Account is locked. Try again in ${minutesRemaining} minutes`);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        // Increment failed login attempts
        await this.incrementFailedAttempts(user.id);
        throw new Error('Invalid credentials');
      }


      // Reset failed login attempts on successful login
      await this.resetFailedAttempts(user.id);

      // Update last login
      await user.update({ last_login: new Date() });

      // Audit login event
      auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'LOGIN',
        resource_type: 'users',
        resource_id: user.id
      }).catch(() => {});

      // Generate token pair
      const tokens = generateTokenPair(user, rememberMe);

      // Store refresh token in database (hashed)
      const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      await db.RefreshToken.create({
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: expiresAt
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role.name,
          permissions: user.role.permissions.map(p => p.code),
          theme_id: user.theme_id || null
        },
        ...tokens
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user by revoking refresh token
   * @param {string} refreshToken - Refresh token to revoke
   * @param {string} userId - User ID
   */
  async logout(refreshToken, userId) {
    // Find all refresh tokens for this user
    const tokens = await db.RefreshToken.findAll({
      where: {
        user_id: userId,
        is_revoked: false
      }
    });

    // Check each token hash
    for (const tokenRecord of tokens) {
      const matches = await bcrypt.compare(refreshToken, tokenRecord.token_hash);
      if (matches) {
        await tokenRecord.update({
          is_revoked: true,
          revoked_at: new Date()
        });
        return true;
      }
    }

    // Token not found - throw error for consistency
    throw new Error('Invalid refresh token');
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New token pair
   */
  async refreshTokens(refreshToken) {
    const { verifyRefreshToken } = require('../auth/jwt');

    // Verify refresh token structure
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await db.User.findByPk(decoded.sub, {
      include: [
        {
          model: db.Role,
          as: 'role',
          include: [
            {
              model: db.Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    // Find refresh token in database and validate
    const tokens = await db.RefreshToken.findAll({
      where: {
        user_id: user.id,
        is_revoked: false
      }
    });

    let validToken = null;
    for (const tokenRecord of tokens) {
      const matches = await bcrypt.compare(refreshToken, tokenRecord.token_hash);
      if (matches) {
        // Check if expired
        if (new Date(tokenRecord.expires_at) < new Date()) {
          throw new Error('Refresh token expired');
        }
        validToken = tokenRecord;
        break;
      }
    }

    if (!validToken) {
      throw new Error('Invalid refresh token');
    }

    // Revoke old refresh token (token rotation)
    await validToken.update({
      is_revoked: true,
      revoked_at: new Date()
    });

    // Generate new token pair
    const newTokens = generateTokenPair(user);

    // Store new refresh token
    const refreshTokenHash = await bcrypt.hash(newTokens.refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.RefreshToken.create({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: expiresAt
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map(p => p.code),
        theme_id: user.theme_id || null
      },
      ...newTokens
    };
  }

  /**
   * Generate API key for user
   * @param {string} userId - User ID
   * @param {string} keyName - Human-readable name for the key
   * @param {Date} expiresAt - Optional expiration date
   * @returns {Object} API key object with plain key (only returned once)
   */
  async generateApiKey(userId, keyName, expiresAt = null) {
    // Generate random API key with prefix
    const randomKey = crypto.randomBytes(32).toString('hex');
    const apiKey = `diet_ak_${randomKey}`;

    // Hash the key before storing
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Create API key record
    const apiKeyRecord = await db.ApiKey.create({
      user_id: userId,
      key_name: keyName,
      key_hash: keyHash,
      expires_at: expiresAt,
      is_active: true
    });

    // Return the plain API key (only time it's visible)
    return {
      id: apiKeyRecord.id,
      key_name: keyName,
      api_key: apiKey, // Plain key - only shown once
      expires_at: expiresAt,
      created_at: apiKeyRecord.created_at
    };
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @returns {Object} User object if valid
   */
  async validateApiKey(apiKey) {
    // Find all active API keys
    const apiKeys = await db.ApiKey.findAll({
      where: { is_active: true },
      include: [
        {
          model: db.User,
          include: [
            {
              model: db.Role,
              as: 'role',
              include: [
                {
                  model: db.Permission,
                  as: 'permissions',
                  through: { attributes: [] }
                }
              ]
            }
          ]
        }
      ]
    });

    // Check each key hash
    for (const keyRecord of apiKeys) {
      const matches = await bcrypt.compare(apiKey, keyRecord.key_hash);
      if (matches) {
        // Check if expired
        if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
          throw new Error('API key expired');
        }

        // Check if user is active
        if (!keyRecord.User.is_active) {
          throw new Error('User account is inactive');
        }

        // Update usage tracking
        await keyRecord.update({
          last_used_at: new Date(),
          usage_count: keyRecord.usage_count + 1
        });

        return keyRecord.User;
      }
    }

    throw new Error('Invalid API key');
  }

  /**
   * Revoke API key
   * @param {string} apiKeyId - API key ID
   * @param {string} userId - User ID (for authorization)
   */
  async revokeApiKey(apiKeyId, userId) {
    const apiKey = await db.ApiKey.findOne({
      where: {
        id: apiKeyId,
        user_id: userId
      }
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await apiKey.update({ is_active: false });
    return true;
  }

  /**
   * Increment failed login attempts and lock account if necessary
   * @param {string} userId - User ID
   */
  async incrementFailedAttempts(userId) {
    const user = await db.User.findByPk(userId);

    const newAttempts = user.failed_login_attempts + 1;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Lock the account
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);

      await user.update({
        failed_login_attempts: newAttempts,
        locked_until: lockedUntil
      });
    } else {
      await user.update({
        failed_login_attempts: newAttempts
      });
    }
  }

  /**
   * Reset failed login attempts
   * @param {string} userId - User ID
   */
  async resetFailedAttempts(userId) {
    await db.User.update(
      {
        failed_login_attempts: 0,
        locked_until: null
      },
      { where: { id: userId } }
    );
  }

  /**
   * List user's API keys
   * @param {string} userId - User ID
   * @returns {Array} List of API keys (without plain keys)
   */
  async listApiKeys(userId) {
    const apiKeys = await db.ApiKey.findAll({
      where: { user_id: userId },
      attributes: ['id', 'key_name', 'expires_at', 'last_used_at', 'usage_count', 'is_active', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    return apiKeys;
  }

  /**
   * Register a new dietitian user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Plain text password
   * @param {string} userData.firstName - First name
   * @param {string} userData.lastName - Last name
   * @param {string} userData.phone - Phone number (optional)
   * @returns {Object} Created user object with tokens
   */
  async register(userData) {
    const { username, email, password, firstName, lastName, phone } = userData;

    try {

      // Check if username already exists
      const existingUsername = await db.User.findOne({
        where: { username }
      });

      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // Check if email already exists among non-PATIENT users
      // (patients and dietitians can share the same email)
      const patientRole = await db.Role.findOne({ where: { name: 'PATIENT' } });
      const emailWhere = { email };
      if (patientRole) {
        emailWhere.role_id = { [db.Sequelize.Op.ne]: patientRole.id };
      }
      const existingEmail = await db.User.findOne({ where: emailWhere });

      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Get DIETITIAN role
      const dietitianRole = await db.Role.findOne({
        where: { name: 'DIETITIAN' }
      });

      if (!dietitianRole) {
        throw new Error('DIETITIAN role not found. Please run database seeders first.');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await db.User.create({
        username,
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role_id: dietitianRole.id,
        is_active: true,
        failed_login_attempts: 0,
        locked_until: null,
        last_login: null
      });

      // Generate tokens for immediate login
      const tokens = await generateTokenPair(newUser);

      // Fetch user with role and permissions for response
      const userWithRole = await db.User.findOne({
        where: { id: newUser.id },
        include: [
          {
            model: db.Role,
            as: 'role',
            include: [
              {
                model: db.Permission,
                as: 'permissions',
                through: { attributes: [] }
              }
            ]
          }
        ]
      });

      return {
        user: userWithRole,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
