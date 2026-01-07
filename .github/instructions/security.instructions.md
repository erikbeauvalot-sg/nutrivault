---
applyTo: '**/*.js, **/*.jsx, **/*.ts, **/*.tsx'
description: 'Security Best Practices for NutriVault Application'
---

# Security Best Practices

## Authentication & Authorization

### 1. JWT Token Management

**Never expose tokens in URLs or localStorage if handling sensitive data:**

```javascript
// ❌ BAD: Token in URL
fetch(`/api/data?token=${token}`);

// ✅ GOOD: Token in Authorization header
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Token Storage:**

```javascript
// ✅ GOOD: Use httpOnly cookies for refresh tokens (server-side)
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// ✅ ACCEPTABLE: sessionStorage for access tokens (client-side)
// Better than localStorage due to automatic cleanup on tab close
sessionStorage.setItem('accessToken', token);
```

**Token Validation:**

```javascript
// ✅ GOOD: Always verify token signature and expiration
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Specify allowed algorithms
      issuer: 'nutrivault',
      maxAge: '30m'
    });
    return decoded;
  } catch (error) {
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }
}
```

### 2. Password Security

**Password Hashing:**

```javascript
// ✅ GOOD: Use bcrypt with appropriate cost factor
const BCRYPT_ROUNDS = 12; // 10-12 recommended for production

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

// ✅ GOOD: Timing-safe password comparison
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

**Password Requirements:**

```javascript
// ✅ GOOD: Strong password validation
function validatePasswordStrength(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const isValid = Object.values(requirements).every(Boolean);
  return { isValid, requirements };
}
```

### 3. Role-Based Access Control (RBAC)

**Middleware Pattern:**

```javascript
// ✅ GOOD: Permission checking middleware
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = await checkUserPermission(req.user.id, permission);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
router.get('/patients', 
  authenticate, 
  requirePermission('patients:read'), 
  getPatients
);
```

## Input Validation & Sanitization

### 1. Express Validator

**Always validate and sanitize user input:**

```javascript
// ✅ GOOD: Comprehensive validation
const createPatientValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name too long')
    .matches(/^[a-zA-Z\s-']+$/).withMessage('Invalid characters in name'),
  
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Invalid email format')
    .custom(async (email) => {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        throw new Error('Email already registered');
      }
    }),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/).withMessage('Invalid phone format'),
  
  body('date_of_birth')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const age = new Date().getFullYear() - new Date(value).getFullYear();
      if (age < 0 || age > 150) {
        throw new Error('Invalid age');
      }
      return true;
    })
];

router.post('/patients', 
  authenticate, 
  createPatientValidation, 
  handleValidationErrors,
  createPatient
);
```

### 2. SQL Injection Prevention

**Use parameterized queries:**

```javascript
// ❌ BAD: SQL injection vulnerable
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD: Parameterized query (Sequelize handles this automatically)
const user = await User.findOne({ where: { email } });

// ✅ GOOD: Raw query with parameters
const [results] = await sequelize.query(
  'SELECT * FROM users WHERE email = :email',
  {
    replacements: { email },
    type: QueryTypes.SELECT
  }
);
```

### 3. XSS Prevention

**Sanitize HTML content:**

```javascript
// ✅ GOOD: Escape HTML in React (automatic)
function UserProfile({ userData }) {
  return <div>{userData.name}</div>; // Automatically escaped
}

// ⚠️ CAUTION: Only use dangerouslySetInnerHTML with sanitized content
import DOMPurify from 'dompurify';

function SafeHTML({ htmlContent }) {
  const sanitized = DOMPurify.sanitize(htmlContent);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

## Security Headers

### 1. Helmet.js Configuration

**Production-ready security headers:**

```javascript
// ✅ GOOD: Environment-aware Helmet configuration
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline if possible
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  } : false,
  hsts: NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

### 2. CORS Configuration

**Restrictive CORS policy:**

```javascript
// ✅ GOOD: Whitelist-based CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 600 // 10 minutes
}));
```

## Rate Limiting

**Protect against brute force:**

```javascript
// ✅ GOOD: Rate limiting configuration
const rateLimit = require('express-rate-limit');

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per window
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
```

## File Upload Security

**Validate and sanitize file uploads:**

```javascript
// ✅ GOOD: Secure file upload configuration
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './data/uploads');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

## Error Handling

**Don't leak sensitive information:**

```javascript
// ❌ BAD: Exposing internal errors
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });
});

// ✅ GOOD: Safe error handling
app.use((err, req, res, next) => {
  console.error('Error:', err); // Log for debugging

  const statusCode = err.statusCode || 500;
  const message = NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR'
    // Don't include stack traces in production
  });
});
```

## Environment Variables

**Never commit secrets:**

```javascript
// ✅ GOOD: Use environment variables
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

// ✅ GOOD: Validate required env vars on startup
function validateEnvVars() {
  const required = ['JWT_SECRET', 'DATABASE_URL', 'NODE_ENV'];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Validate JWT secret length
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}

validateEnvVars();
```

## Audit Logging

**Log security-relevant events:**

```javascript
// ✅ GOOD: Comprehensive audit logging
async function logAuditEvent(req, action, resourceType, resourceId, details = {}) {
  await AuditLog.create({
    user_id: req.user?.id,
    action, // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    details: JSON.stringify(details),
    timestamp: new Date()
  });
}

// Usage
router.delete('/patients/:id', authenticate, async (req, res) => {
  const patient = await Patient.findByPk(req.params.id);
  await patient.destroy();
  
  await logAuditEvent(req, 'DELETE', 'patient', req.params.id, {
    patient_name: `${patient.first_name} ${patient.last_name}`
  });
  
  res.status(204).send();
});
```

## Session Management

**Secure session handling:**

```javascript
// ✅ GOOD: Implement session timeout and renewal
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function checkSessionTimeout(req, res, next) {
  const lastActivity = req.user.last_activity;
  const now = Date.now();

  if (now - lastActivity > SESSION_TIMEOUT) {
    return res.status(401).json({ 
      error: 'Session expired',
      code: 'SESSION_TIMEOUT'
    });
  }

  // Update last activity
  req.user.last_activity = now;
  next();
}

// ✅ GOOD: Implement account lockout
async function handleFailedLogin(user) {
  user.failed_login_attempts += 1;

  if (user.failed_login_attempts >= 5) {
    user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }

  await user.save();
}
```

## Security Checklist

### Before Deployment:

- [ ] All environment variables documented in .env.example
- [ ] No secrets committed to version control
- [ ] All API endpoints require authentication
- [ ] RBAC implemented for sensitive operations
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled (if using forms)
- [ ] Rate limiting configured
- [ ] Security headers configured (Helmet)
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] File upload restrictions in place
- [ ] Audit logging implemented
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies updated and scanned for vulnerabilities

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)
