# Agent 4: AUTHENTICATION & SECURITY SPECIALIST

## Role
Security implementation, authentication, and authorization

## Current Phase
Phase 2: Backend Core (Standby)

## Responsibilities
- Implement JWT authentication system
- Build refresh token mechanism
- Create API key authentication
- Implement RBAC (Role-Based Access Control)
- Build permission checking middleware
- Implement password hashing and validation
- Add rate limiting and DDoS protection
- Implement security headers (CORS, CSP, etc.)
- Conduct security audits
- Handle input sanitization and validation

## Phase 2 Deliverables (Weeks 2-4)
- [ ] JWT authentication system
- [ ] Refresh token mechanism
- [ ] Password hashing with bcrypt
- [ ] Login endpoint with account lockout
- [ ] Authentication middleware
- [ ] RBAC middleware
- [ ] Password validation rules
- [ ] Rate limiting configuration
- [ ] CORS configuration
- [ ] Security headers middleware

## Phase 3 Deliverables (Weeks 4-6)
- [ ] API key authentication system
- [ ] API key generation and management
- [ ] Advanced permission checking
- [ ] Security audit and penetration testing
- [ ] Input sanitization middleware
- [ ] XSS and CSRF protection

## Directory Structure
```
backend/src/
├── auth/
│   ├── jwt.js              # JWT utilities
│   ├── apiKey.js           # API key utilities
│   ├── passwordHash.js     # Bcrypt utilities
│   └── tokenService.js     # Token management
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── rbac.js             # Authorization middleware
│   ├── rateLimit.js        # Rate limiting
│   └── security.js         # Security headers
└── utils/
    ├── security.js         # Security utilities
    └── validation.js       # Input validation
```

## JWT Implementation

```javascript
// auth/jwt.js
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role_id: user.role_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken
};
```

## Authentication Middleware

```javascript
// middleware/auth.js
const { verifyAccessToken } = require('../auth/jwt');
const { verifyApiKey } = require('../auth/apiKey');

const authenticate = async (req, res, next) => {
  try {
    // Check for API key first
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const user = await verifyApiKey(apiKey);
      if (user) {
        req.user = user;
        req.authMethod = 'api_key';
        return next();
      }
    }

    // Check for JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_AUTH', message: 'No authentication provided' }
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    // Fetch user from database
    const user = await User.findByPk(decoded.id, {
      include: ['Role']
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_USER', message: 'User not found or inactive' }
      });
    }

    req.user = user;
    req.authMethod = 'jwt';
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'Authentication failed' }
    });
  }
};

module.exports = { authenticate };
```

## RBAC Middleware

```javascript
// middleware/rbac.js
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
        });
      }

      // Fetch user permissions
      const permissions = await getUserPermissions(user.role_id);

      if (!permissions.includes(permission)) {
        // Log authorization failure
        await auditLogger.log({
          user_id: user.id,
          action: 'AUTHORIZATION_FAILURE',
          resource: permission,
          severity: 'WARNING',
          ip_address: req.ip
        });

        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const getUserPermissions = async (roleId) => {
  const role = await Role.findByPk(roleId, {
    include: [{
      model: Permission,
      through: { attributes: [] }
    }]
  });

  return role.Permissions.map(p => p.name);
};

module.exports = { requirePermission };
```

## Password Hashing

```javascript
// auth/passwordHash.js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  if (password.length < minLength) errors.push('Password must be at least 8 characters');
  if (!hasUpperCase) errors.push('Password must contain uppercase letter');
  if (!hasLowerCase) errors.push('Password must contain lowercase letter');
  if (!hasNumbers) errors.push('Password must contain number');
  if (!hasSpecialChar) errors.push('Password must contain special character');

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = { hashPassword, comparePassword, validatePasswordStrength };
```

## Rate Limiting

```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many login attempts, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please slow down'
    }
  }
});

module.exports = { loginLimiter, apiLimiter };
```

## Security Headers

```javascript
// middleware/security.js
const helmet = require('helmet');
const cors = require('cors');

const securityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = { securityHeaders, corsOptions };
```

## Login with Account Lockout

```javascript
// controllers/auth.controller.js
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
      });
    }

    // Check if account is locked
    if (user.locked_until && user.locked_until > new Date()) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked' }
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      // Increment failed attempts
      user.failed_login_attempts += 1;

      // Lock account after 5 failed attempts
      if (user.failed_login_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await user.save();

      await auditLogger.log({
        user_id: user.id,
        action: 'FAILED_LOGIN',
        severity: 'WARNING',
        ip_address: req.ip
      });

      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
      });
    }

    // Reset failed attempts on successful login
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login_at = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token hash
    await RefreshToken.create({
      token_hash: await hashRefreshToken(refreshToken),
      user_id: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    await auditLogger.log({
      user_id: user.id,
      action: 'LOGIN',
      severity: 'INFO',
      ip_address: req.ip
    });

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.Role.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
```

## Environment Variables Required

```
JWT_SECRET=<min-32-character-secret>
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=<min-32-character-secret>
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Dependencies with Other Agents
- **Database Specialist**: User, Role, Permission, RefreshToken, ApiKey models
- **Backend Developer**: Integration of auth middleware in routes
- **Audit Logger**: Log all authentication/authorization events

## Current Status
⏸️ Standby - Waiting for Phase 1 completion

## Blockers
- Need User, Role, Permission models from Database Specialist
- Need project structure from Project Architect
