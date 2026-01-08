---
description: 'Security best practices for authentication, authorization, input validation, SQL injection prevention, secrets management, and secure coding'
applyTo: '**/*.{py,js,ts,java,cs,go}'
---

# Security Best Practices

## Overview
Security is paramount in software development. This document outlines essential security practices that should be followed in all projects, aligned with OWASP guidelines and Clean Code principles.

## Authentication & Authorization

### Authentication Best Practices

#### Use Strong Authentication Mechanisms
```javascript
// Good: Bcrypt with appropriate rounds
const bcrypt = require('bcrypt');
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Bad: Plain text or weak hashing
const hashedPassword = md5(password); // Never use MD5 for passwords
```

#### Implement Multi-Factor Authentication (MFA)
- SMS-based codes
- Authenticator apps (TOTP)
- Hardware tokens
- Biometric authentication

#### Session Management
```javascript
// Good: Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  }
}));

// Bad: Insecure session
app.use(session({
  secret: 'hardcoded-secret',
  cookie: {
    secure: false
  }
}));
```

#### JWT Best Practices
```javascript
// Good: Short-lived tokens with refresh mechanism
const accessToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Bad: Long-lived tokens without refresh
const token = jwt.sign(
  { userId: user.id },
  'weak-secret',
  { expiresIn: '30d' } // Too long
);
```

### Authorization Best Practices

#### Role-Based Access Control (RBAC)
```javascript
// Define roles and permissions
const roles = {
  admin: ['read', 'write', 'delete', 'manage_users'],
  editor: ['read', 'write'],
  viewer: ['read']
};

// Middleware to check permissions
function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const permissions = roles[userRole];
    
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Usage
app.delete('/api/users/:id', 
  requirePermission('delete'),
  deleteUserHandler
);
```

#### Attribute-Based Access Control (ABAC)
```javascript
function canAccessResource(user, resource, action) {
  // Check user attributes
  if (user.department !== resource.department) {
    return false;
  }
  
  // Check resource attributes
  if (resource.confidential && user.clearanceLevel < 3) {
    return false;
  }
  
  // Check action permissions
  return user.permissions.includes(action);
}
```

## Input Validation & Sanitization

### Validate All Inputs
```javascript
// Good: Comprehensive validation
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0).max(150).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
});

app.post('/users', (req, res) => {
  const { error, value } = userSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  // Proceed with validated data
});

// Bad: No validation
app.post('/users', (req, res) => {
  const user = await User.create(req.body); // Dangerous!
});
```

### Sanitize Inputs
```javascript
// Good: Sanitize HTML input
const DOMPurify = require('dompurify');

function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
}

// Good: Escape for SQL
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email] // Parameterized query
);

// Bad: Direct concatenation
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}'` // SQL injection!
);
```

## SQL Injection Prevention

### Always Use Parameterized Queries
```javascript
// Good: Parameterized queries
// Node.js (pg)
const result = await client.query(
  'SELECT * FROM users WHERE id = $1 AND status = $2',
  [userId, status]
);

// Python
cursor.execute(
  "SELECT * FROM users WHERE id = %s AND status = %s",
  (user_id, status)
)

// C#
var command = new SqlCommand(
  "SELECT * FROM users WHERE id = @id AND status = @status",
  connection
);
command.Parameters.AddWithValue("@id", userId);
command.Parameters.AddWithValue("@status", status);

// Bad: String concatenation
const result = await client.query(
  `SELECT * FROM users WHERE id = ${userId}` // Vulnerable!
);
```

### Use ORM Safely
```javascript
// Good: ORM with safe queries
const user = await User.findOne({
  where: { id: userId }
});

// Bad: Raw queries without parameterization
const user = await sequelize.query(
  `SELECT * FROM users WHERE id = ${userId}` // Still vulnerable!
);
```

## Cross-Site Scripting (XSS) Prevention

### Escape Output
```javascript
// Good: React automatically escapes
function UserProfile({ user }) {
  return <div>{user.name}</div>; // Safe
}

// Dangerous: dangerouslySetInnerHTML
function UserProfile({ user }) {
  return <div dangerouslySetInnerHTML={{ __html: user.bio }} />; // Risky!
}

// If you must use HTML, sanitize first
import DOMPurify from 'dompurify';

function UserProfile({ user }) {
  const sanitizedBio = DOMPurify.sanitize(user.bio);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedBio }} />;
}
```

### Content Security Policy (CSP)
```javascript
// Good: Strict CSP
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';"
  );
  next();
});
```

## Cross-Site Request Forgery (CSRF) Prevention

### Implement CSRF Tokens
```javascript
// Good: CSRF protection
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/process', csrfProtection, (req, res) => {
  // Process form
});
```

### SameSite Cookies
```javascript
// Good: SameSite cookie
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

## Secrets Management

### Never Hardcode Secrets
```javascript
// Good: Use environment variables
const apiKey = process.env.API_KEY;
const dbPassword = process.env.DB_PASSWORD;

// Better: Use secrets management service
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({
    SecretId: secretName
  }).promise();
  
  return JSON.parse(data.SecretString);
}

// Bad: Hardcoded secrets
const apiKey = 'sk_live_abc123def456'; // Never do this!
```

### Use .env Files (Development Only)
```bash
# .env file (add to .gitignore!)
API_KEY=your_api_key_here
DB_PASSWORD=your_db_password_here
JWT_SECRET=your_jwt_secret_here
```

```javascript
// Load environment variables
require('dotenv').config();
```

### Rotate Secrets Regularly
- Set expiration dates
- Implement rotation mechanisms
- Monitor secret access
- Revoke compromised secrets immediately

## Encryption

### Encrypt Data at Rest
```javascript
// Good: Encrypt sensitive data before storage
const crypto = require('crypto');

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Encrypt Data in Transit
```javascript
// Good: Force HTTPS
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

## Dependency Security

### Keep Dependencies Updated
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Use Dependency Scanning
```yaml
# GitHub Actions example
name: Dependency Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Lock Dependency Versions
```json
// package.json - Use exact versions for critical dependencies
{
  "dependencies": {
    "express": "4.18.2",  // Exact version
    "jsonwebtoken": "9.0.0"
  }
}
```

## Rate Limiting

### Implement Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

app.post('/api/login', authLimiter, loginHandler);
```

## Security Headers

### Implement Security Headers
```javascript
const helmet = require('helmet');

app.use(helmet());

// Or configure individually
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

## Error Handling

### Don't Expose Sensitive Information
```javascript
// Good: Generic error messages
app.use((err, req, res, next) => {
  // Log full error internally
  logger.error('Error occurred', {
    error: err,
    stack: err.stack,
    user: req.user?.id
  });
  
  // Send generic message to client
  res.status(500).json({
    error: 'An error occurred',
    requestId: req.id // For support reference
  });
});

// Bad: Exposing internals
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // Exposes code structure!
    query: err.sql    // Exposes database structure!
  });
});
```

## Logging & Monitoring

### Log Security Events
```javascript
// Log authentication attempts
function loginHandler(req, res) {
  const { username, password } = req.body;
  
  logger.info('Login attempt', {
    username,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  const user = await authenticateUser(username, password);
  
  if (!user) {
    logger.warn('Failed login attempt', {
      username,
      ip: req.ip
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  logger.info('Successful login', {
    userId: user.id,
    ip: req.ip
  });
  
  // Continue...
}
```

### Don't Log Sensitive Data
```javascript
// Good: Redact sensitive information
logger.info('User created', {
  userId: user.id,
  email: user.email,
  // Don't log password, even hashed
});

// Bad: Logging sensitive data
logger.info('User created', {
  userId: user.id,
  email: user.email,
  password: user.password, // Never log passwords!
  creditCard: user.creditCard // Never log PII!
});
```

## File Upload Security

### Validate File Uploads
```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

## Security Checklist

### Development
- [ ] All inputs validated and sanitized
- [ ] Parameterized queries used everywhere
- [ ] Secrets in environment variables, not code
- [ ] Authentication implemented correctly
- [ ] Authorization checks on all protected resources
- [ ] CSRF protection enabled
- [ ] XSS prevention measures in place
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Rate limiting implemented

### Pre-Production
- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error messages don't expose internals
- [ ] Logging doesn't include sensitive data
- [ ] Backup and recovery procedures tested
- [ ] Incident response plan documented

### Ongoing
- [ ] Regular security updates
- [ ] Dependency vulnerability monitoring
- [ ] Security logs reviewed regularly
- [ ] Access permissions audited
- [ ] Security training for team
- [ ] Incident response drills

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
