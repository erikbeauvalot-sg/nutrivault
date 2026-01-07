# Security & Best Practices Upgrade Plan

**Date:** January 7, 2026  
**Status:** In Progress  
**Priority:** High

## Executive Summary

This plan addresses critical security vulnerabilities, dependency updates, and code quality improvements identified in the Context7 code review. The implementation is divided into 4 phases prioritized by security impact and implementation complexity.

---

## Phase 1: Critical Security Fixes (IMMEDIATE - This Week)

### 🔴 Priority: CRITICAL

#### 1.1 Dependency Security Updates

**Backend Dependencies:**
```json
{
  "express": "^4.18.2" → "^4.21.2",  // Security patches
  "sequelize": "^6.35.0" → "^6.37.7",  // Bug fixes
  "bcrypt": "^5.1.1" (standardize)  // Consistency
}
```

**Frontend Dependencies:**
```json
{
  "axios": "^1.6.0" → "^1.7.9",  // CVE-2024-39338 SSRF fix
  "vite": "^5.0.0" → "^5.4.11",  // Security & performance
  "react": "^18.2.0" → "^18.3.1",  // Latest stable
  "react-router-dom": "^6.20.0" → "^6.28.0",  // Bug fixes
  "bootstrap": "^5.3.2" → "^5.3.3"  // Minor update
}
```

**Root Dependencies:**
```json
{
  "bcrypt": "^6.0.0" → "^5.1.1"  // Standardize with backend
}
```

**Implementation:**
- File: `package.json` (root)
- File: `backend/package.json`
- File: `frontend/package.json`
- Action: Update version numbers, run npm install

---

#### 1.2 Fix React Hook Issues

**Issue:** AuthProvider.jsx has infinite loop potential in useCallback dependency array

**Current Code (Lines 16-47):**
```jsx
const [refreshTimer, setRefreshTimer] = useState(null);

const scheduleTokenRefresh = useCallback(() => {
  // ... code
}, [refreshTimer]); // ❌ Creates infinite loop
```

**Fixed Code:**
```jsx
const refreshTimerRef = useRef(null);

const scheduleTokenRefresh = useCallback(() => {
  const token = tokenManager.getAccessToken();
  if (!token) return;

  const decoded = tokenManager.decodeToken(token);
  if (!decoded || !decoded.exp) return;

  const expiresIn = decoded.exp * 1000 - Date.now();
  const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 0);

  if (refreshTimerRef.current) {
    clearTimeout(refreshTimerRef.current);
  }

  refreshTimerRef.current = setTimeout(async () => {
    try {
      await authService.refreshToken();
      console.log('Token refreshed automatically');
      scheduleTokenRefresh();
    } catch (err) {
      console.error('Auto token refresh failed:', err);
    }
  }, refreshIn);
}, []); // ✅ Empty dependency array with ref
```

**Implementation:**
- File: `frontend/src/contexts/AuthProvider.jsx`
- Lines: 6-47
- Action: Replace useState with useRef, update useCallback dependencies

---

#### 1.3 Enhanced Security Headers

**Issue:** Helmet CSP is too restrictive for development and missing production optimizations

**Current Code (Lines 46-58):**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Fixed Code:**
```javascript
// Environment-aware security configuration
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    },
  } : false,
  crossOriginEmbedderPolicy: NODE_ENV === 'production',
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true
}));
```

**Implementation:**
- File: `backend/src/server.js`
- Lines: 46-58
- Action: Replace helmet configuration with environment-aware version

---

#### 1.4 Environment Configuration Documentation

**Create: `backend/.env.example`**
```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nutrivault
DB_USER=postgres
DB_PASSWORD=your_password_here

# For SQLite (development)
# DB_DIALECT=sqlite
# DB_STORAGE=./data/nutrivault.db

# JWT Configuration
JWT_SECRET=your-super-secret-min-32-characters-long-change-in-production
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-characters-change-in-production
REFRESH_TOKEN_EXPIRES_IN=7d

# Bcrypt Configuration
BCRYPT_ROUNDS=12

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Session
SESSION_SECRET=your-session-secret-min-32-characters-change-in-production

# Email (if implemented)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-app-password

# External APIs (if needed)
# API_KEY=your-api-key-here
```

**Create: `frontend/.env.example`**
```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_API_TIMEOUT=10000

# Environment
VITE_ENV=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false

# Application
VITE_APP_NAME=NutriVault
VITE_APP_VERSION=1.0.0
```

**Implementation:**
- Create both files
- Add to .gitignore if not already present
- Document in README.md

---

## Phase 2: Code Quality Improvements (This Week)

### 🟡 Priority: HIGH

#### 2.1 Create Instruction Files for AI Assistants

**Create: `.github/instructions/react-hooks.instructions.md`**
- Best practices for useState, useEffect, useCallback, useMemo
- Dependency array guidelines
- Cleanup patterns
- Common pitfalls to avoid

**Create: `.github/instructions/security.instructions.md`**
- Input validation requirements
- Authentication patterns
- Authorization checks
- SQL injection prevention
- XSS prevention
- CSRF protection
- Secure error handling

**Create: `.github/instructions/testing-memory.instructions.md`**
- Update with current testing standards
- Jest configuration
- Test coverage requirements
- Mock patterns

---

#### 2.2 Error Boundary Implementation

**Create: `frontend/src/components/ErrorBoundary.jsx`**
```jsx
import { Component } from 'react';
import { Alert, Container, Button } from 'react-bootstrap';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service (Sentry, LogRocket, etc.)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Something went wrong</Alert.Heading>
            <p>We're sorry for the inconvenience. Please try refreshing the page.</p>
            <Button onClick={this.handleReset}>Try Again</Button>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Update: `frontend/src/App.jsx`**
- Wrap Routes with ErrorBoundary
- Add granular error boundaries for major sections

---

#### 2.3 Improve JWT Token Management

**Update: `backend/src/auth/jwt.js`**
- Add token blacklist/whitelist support
- Implement token family tracking for refresh tokens
- Add token rotation on suspicious activity
- Improve error messages

---

## Phase 3: Testing & Documentation (This Month)

### 🟢 Priority: MEDIUM

#### 3.1 Comprehensive Testing

**Backend Testing:**
- [ ] Unit tests for all auth functions
- [ ] Integration tests for API endpoints
- [ ] Security tests (injection, XSS, CSRF)
- [ ] Rate limiting tests
- [ ] RBAC permission tests

**Frontend Testing:**
- [ ] Component unit tests
- [ ] Hook tests (useAuth, custom hooks)
- [ ] Integration tests for forms
- [ ] Accessibility tests (axe-core)

**E2E Testing:**
- [ ] Set up Playwright or Cypress
- [ ] Critical user flow tests
- [ ] Authentication flow tests
- [ ] CRUD operation tests

---

#### 3.2 API Documentation

**Create: OpenAPI/Swagger Documentation**
- Document all endpoints
- Request/response schemas
- Authentication requirements
- Error responses
- Rate limiting information

**Update: `backend/src/config/swagger.js`**
- Expand API documentation
- Add security schemes
- Add response examples
- Add request examples

---

#### 3.3 Security Documentation

**Create: `SECURITY.md`**
- Security policy
- Vulnerability reporting process
- Security features overview
- Compliance information
- Security best practices for contributors

**Create: `docs/DEPLOYMENT.md`**
- Production deployment checklist
- Environment setup
- Security configuration
- Monitoring setup
- Backup procedures

---

## Phase 4: Major Upgrades & Enhancements (Next Quarter)

### 🔵 Priority: LOW (Strategic)

#### 4.1 Express 5.x Migration

**Breaking Changes to Consider:**
- Route parameter handling changes
- Middleware error handling updates
- Promise rejection handling
- Response method changes

**Migration Steps:**
1. Review Express 5 migration guide
2. Update middleware to new API
3. Test all routes thoroughly
4. Update documentation

---

#### 4.2 Helmet 8.x Migration

**Changes:**
- Review new CSP directives
- Update configuration
- Test with production build
- Verify compatibility with Express 5

---

#### 4.3 TypeScript Migration (Optional)

**Benefits:**
- Type safety across the codebase
- Better IDE support
- Reduced runtime errors
- Improved maintainability

**Migration Approach:**
1. Start with new files in TypeScript
2. Gradually convert existing files
3. Enable strict mode incrementally
4. Add type definitions for all APIs

**Files to Prioritize:**
- Auth utilities (jwt.js, password.js)
- API services (frontend)
- Controllers (backend)
- Middleware (backend)

---

#### 4.4 Monitoring & Observability

**Frontend Monitoring:**
- Implement Sentry or LogRocket
- Track user interactions
- Monitor performance metrics
- Track error rates

**Backend Monitoring:**
- Implement Winston for structured logging
- Add Prometheus metrics
- Set up health check endpoints
- Monitor database performance

---

#### 4.5 Performance Optimization

**Frontend:**
- Implement React Query for data fetching
- Add service worker for caching
- Optimize bundle size
- Implement virtual scrolling for large lists
- Image optimization

**Backend:**
- Database query optimization
- Add Redis for caching
- Implement connection pooling
- Add database indexes
- Optimize middleware chain

---

## Implementation Checklist

### Phase 1 (Immediate)
- [ ] Update all package.json files
- [ ] Run npm install in all directories
- [ ] Fix AuthProvider.jsx
- [ ] Update server.js Helmet configuration
- [ ] Create .env.example files
- [ ] Test authentication flow
- [ ] Test all CRUD operations
- [ ] Verify no breaking changes

### Phase 2 (This Week)
- [ ] Create instruction files
- [ ] Implement ErrorBoundary
- [ ] Update README.md
- [ ] Add pre-commit hooks
- [ ] Code review session

### Phase 3 (This Month)
- [ ] Write unit tests
- [ ] Set up E2E testing
- [ ] Complete API documentation
- [ ] Create SECURITY.md
- [ ] Performance testing

### Phase 4 (Next Quarter)
- [ ] Plan Express 5 migration
- [ ] Evaluate TypeScript migration
- [ ] Set up monitoring
- [ ] Performance optimization
- [ ] Security audit

---

## Testing Strategy

### After Phase 1
```bash
# Backend
cd backend
npm test
npm run lint

# Frontend
cd frontend
npm run build
npm run lint

# Integration
# Test all auth flows
# Test CRUD operations
# Verify security headers
```

### Security Verification
```bash
# Run security audit
npm audit

# Check for outdated packages
npm outdated

# Verify environment variables
# Check .env files are not committed
```

---

## Rollback Plan

If issues occur after Phase 1:
1. Revert package.json changes
2. Run `npm install` to restore old versions
3. Git revert code changes
4. Document issues for future reference

Keep backup branches:
```bash
git branch backup-before-upgrade
git push origin backup-before-upgrade
```

---

## Success Metrics

### Security
- [ ] 0 critical vulnerabilities in npm audit
- [ ] All recommended security headers present
- [ ] No exposed secrets or credentials
- [ ] All authentication flows working

### Performance
- [ ] Frontend build < 2MB
- [ ] API response time < 200ms (avg)
- [ ] No memory leaks
- [ ] No infinite loops

### Code Quality
- [ ] Test coverage > 80%
- [ ] 0 ESLint errors
- [ ] 0 console warnings in production
- [ ] All documentation up to date

---

## Resources

### Documentation
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [Helmet Documentation](https://helmetjs.github.io/)
- [axios Security](https://axios-http.com/docs/req_config)

### Tools
- npm audit - Security vulnerability scanning
- ESLint - Code quality
- Prettier - Code formatting
- Jest - Testing
- Playwright/Cypress - E2E testing

---

**Next Review:** After Phase 1 completion  
**Estimated Time:**  
- Phase 1: 2-3 hours
- Phase 2: 1 week
- Phase 3: 2-3 weeks
- Phase 4: 1-2 months
