# Security Policy

**NutriVault Security Guidelines**

This document outlines security best practices, vulnerability reporting procedures, and security configurations for the NutriVault application.

## Table of Contents

1. [Supported Versions](#supported-versions)
2. [Reporting a Vulnerability](#reporting-a-vulnerability)
3. [Security Best Practices](#security-best-practices)
4. [Authentication & Authorization](#authentication--authorization)
5. [Data Protection](#data-protection)
6. [Dependency Management](#dependency-management)
7. [Production Security Checklist](#production-security-checklist)
8. [Known Security Considerations](#known-security-considerations)

---

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please email us at:

📧 **security@nutrivault.com** (replace with your actual email)

Include the following information:
- Type of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

**Response Timeline:**
- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity (critical: 7 days, high: 14 days, medium: 30 days)

---

## Security Best Practices

### 1. Environment Variables

**❌ Never commit secrets to version control**

```bash
# Bad - Don't do this
JWT_SECRET=mysecret123

# Good - Use strong, randomly generated secrets
JWT_SECRET=$(openssl rand -base64 32)
```

**Required Environment Variables:**
- `JWT_SECRET` - Minimum 32 characters, cryptographically random
- `JWT_REFRESH_SECRET` - Different from JWT_SECRET, minimum 32 characters
- `SESSION_SECRET` - Minimum 32 characters
- `DB_PASSWORD` - Strong password for production database

**Generate Secure Secrets:**

```bash
# Generate a secure 32-byte secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Password Security

**Current Implementation:**
- bcrypt hashing with configurable rounds (default: 10)
- Minimum password length: 8 characters (enforced by backend)
- Password strength validation on frontend

**Recommendations:**
- Development: `BCRYPT_ROUNDS=10` (faster for testing)
- Production: `BCRYPT_ROUNDS=12` or higher (more secure)

**Code Example:**

```javascript
const bcrypt = require('bcrypt');

// Hashing
const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 10));

// Verification
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 3. Input Validation

**Always validate and sanitize user input:**

```javascript
// Backend - Use express-validator
const { body, validationResult } = require('express-validator');

router.post('/patients',
  body('email').isEmail().normalizeEmail(),
  body('name').trim().escape(),
  body('phone').matches(/^[0-9-+()]*$/),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request...
  }
);
```

```jsx
// Frontend - Use Yup validation
import * as Yup from 'yup';

const patientSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Required'),
  name: Yup.string().trim().required('Required'),
  phone: Yup.string().matches(/^[0-9-+()]*$/, 'Invalid phone number')
});
```

### 4. SQL Injection Prevention

**✅ Always use parameterized queries (Sequelize ORM)**

```javascript
// Safe - Sequelize automatically parameterizes
const patient = await Patient.findOne({ where: { email: userInput } });

// Safe - Named parameters
const patients = await sequelize.query(
  'SELECT * FROM patients WHERE email = :email',
  { replacements: { email: userInput }, type: QueryTypes.SELECT }
);

// ❌ Unsafe - Never do this
const query = `SELECT * FROM patients WHERE email = '${userInput}'`;
```

### 5. Cross-Site Scripting (XSS) Prevention

**Frontend:**
- React automatically escapes JSX content
- Sanitize user-generated HTML with DOMPurify
- Avoid `dangerouslySetInnerHTML` unless necessary

```jsx
import DOMPurify from 'dompurify';

// Safe rendering
<div>{user.name}</div>

// If you must render HTML, sanitize it
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(user.bio) 
}} />
```

**Backend:**
- Set Content Security Policy (CSP) headers
- Use Helmet.js middleware

### 6. Cross-Site Request Forgery (CSRF) Protection

**Current Implementation:**
- CORS configured to only allow specific origins
- JWT tokens in Authorization header (not cookies)

**Configuration:**

```javascript
// backend/src/server.js
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Authentication & Authorization

### JWT Token Security

**Access Tokens:**
- Short-lived (default: 15 minutes)
- Stored in memory (React state/context)
- Sent in Authorization header: `Bearer <token>`

**Refresh Tokens:**
- Long-lived (default: 7 days)
- Stored in httpOnly cookies (recommended) or secure localStorage
- Used to obtain new access tokens
- Can be revoked server-side

**Token Refresh Flow:**

```javascript
// frontend/src/services/api.js
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt token refresh
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken: getRefreshToken()
        });
        
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Role-Based Access Control (RBAC)

**Permission Checking:**

```javascript
// Backend middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    const hasPermission = await req.user.hasPermission(permission);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage
router.delete('/patients/:id', 
  authenticateToken,
  requirePermission('delete:patient'),
  patientController.deletePatient
);
```

```jsx
// Frontend permission checking
import { useAuth } from '../contexts/AuthProvider';

function PatientList() {
  const { hasPermission } = useAuth();
  
  return (
    <div>
      {hasPermission('delete:patient') && (
        <button onClick={handleDelete}>Delete</button>
      )}
    </div>
  );
}
```

---

## Data Protection

### Sensitive Data Handling

**Patient Health Information (PHI):**
- Always encrypt in transit (HTTPS)
- Encrypt at rest in production (database encryption)
- Log access in audit logs
- Implement data retention policies

**Audit Logging:**

```javascript
// Log all access to sensitive data
await AuditLog.create({
  userId: req.user.id,
  action: 'VIEW_PATIENT',
  resourceType: 'Patient',
  resourceId: patient.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  metadata: { fields: ['name', 'email', 'medical_notes'] }
});
```

### Database Security

**Connection Security:**
```javascript
// Production PostgreSQL with SSL
{
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true
    }
  }
}
```

**Data Encryption:**
- Use PostgreSQL `pgcrypto` extension for field-level encryption
- Encrypt backups
- Secure database credentials in environment variables

---

## Dependency Management

### Regular Updates

**Check for vulnerabilities:**

```bash
# Backend
cd backend
npm audit
npm audit fix

# Frontend
cd frontend
npm audit
npm audit fix
```

**Automated Scanning:**
- Enable GitHub Dependabot alerts
- Use Snyk or similar for continuous monitoring

### Known Vulnerabilities

**CVE-2024-39338 (Axios SSRF):**
- **Status**: Fixed in axios ^1.7.9
- **Current Version**: 1.7.9 ✅
- **Action**: No action required

### Dependency Pinning

**For production:**
```json
{
  "dependencies": {
    "express": "4.21.2",      // Pin exact version
    "bcrypt": "5.1.1"
  }
}
```

**Benefits:**
- Predictable builds
- Prevents unexpected breaking changes
- Controlled update process

---

## Production Security Checklist

### Pre-Deployment

- [ ] All environment variables use strong, random secrets
- [ ] `NODE_ENV=production` is set
- [ ] Database uses PostgreSQL (not SQLite)
- [ ] Database credentials are secure
- [ ] `BCRYPT_ROUNDS` set to 12 or higher
- [ ] CORS configured for production domain only
- [ ] API documentation disabled (`API_DOCS_ENABLED=false`)
- [ ] Rate limiting configured appropriately
- [ ] HTTPS/TLS enabled
- [ ] Security headers configured (Helmet.js)
- [ ] File upload limits set
- [ ] Logging configured (not console.log)
- [ ] Error messages don't leak sensitive information
- [ ] Default admin password changed
- [ ] Database backups configured
- [ ] Audit logging enabled

### Infrastructure

- [ ] Firewall configured
- [ ] Database not publicly accessible
- [ ] SSH access restricted
- [ ] Security updates automated
- [ ] Monitoring and alerting set up
- [ ] Intrusion detection configured
- [ ] Regular security audits scheduled

### Helmet.js Configuration

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Restrict in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

## Known Security Considerations

### Current Limitations

1. **Session Management**: Refresh tokens stored in localStorage (consider httpOnly cookies)
2. **Rate Limiting**: Basic implementation (consider Redis-based for distributed systems)
3. **File Upload**: Limited validation (implement virus scanning for production)
4. **Audit Log Retention**: No automatic cleanup (implement retention policies)

### Future Enhancements

- [ ] Implement OAuth2/OIDC integration
- [ ] Add two-factor authentication (2FA)
- [ ] Implement API rate limiting with Redis
- [ ] Add Web Application Firewall (WAF)
- [ ] Implement database field-level encryption
- [ ] Add automated security testing (SAST/DAST)
- [ ] Implement Content Delivery Network (CDN)
- [ ] Add distributed tracing
- [ ] Implement anomaly detection

---

## Security Resources

### Internal Documentation
- [Authentication Complete](./AUTHENTICATION_COMPLETE.md)
- [RBAC Complete](./RBAC_COMPLETE.md)
- [Database Setup](./DATABASE_SETUP_SUMMARY.md)

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Check for vulnerabilities
- [Snyk](https://snyk.io/) - Continuous security monitoring
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [Burp Suite](https://portswigger.net/burp) - Web vulnerability scanner

---

## Contact

For security concerns or questions:
- **Email**: security@nutrivault.com
- **Bug Reports**: See "Reporting a Vulnerability" section above

---

**Last Updated**: 2026-01-07  
**Version**: 1.0  
**Maintained By**: NutriVault Development Team
