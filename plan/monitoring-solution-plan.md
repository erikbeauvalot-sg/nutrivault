---
goal: 'Monitoring Solution Implementation Plan'
version: '1.0'
date_created: '2026-01-07'
owner: 'DevOps Team'
status: 'Planned'
tags: ['monitoring', 'sentry', 'observability', 'devops']
related_task: 'TASK-025'
---

# Monitoring Solution Implementation

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

## Solution Comparison

### Error Monitoring

| Feature | Sentry | Rollbar | Bugsnag |
|---------|--------|---------|---------|
| Error Tracking | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Source Maps | ✅ Excellent | ✅ Good | ✅ Good |
| React Support | ✅ Native | ✅ Good | ✅ Good |
| Node.js Support | ✅ Excellent | ✅ Good | ✅ Good |
| Free Tier | 5K errors/mo | 5K errors/mo | 7.5K errors/mo |
| Performance | ✅ Traces | ❌ No | ⚠️ Limited |
| Pricing | $$ | $$ | $$ |

**Recommendation**: Sentry (best overall, performance monitoring included)

### Session Replay

| Feature | LogRocket | FullStory | Hotjar |
|---------|-----------|-----------|--------|
| Session Replay | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Error Integration | ✅ Excellent | ✅ Good | ❌ None |
| Performance | ✅ Network logs | ✅ Good | ⚠️ Basic |
| Privacy | ✅ PII redaction | ✅ Good | ✅ Good |
| Free Tier | 1K sessions/mo | ❌ No | 35 daily |
| HIPAA | ⚠️ BAA required | ⚠️ BAA required | ❌ No |

**Recommendation**: LogRocket (best for debugging, integrates with Sentry)

## Recommended Stack

**For NutriVault**: Sentry + Optional LogRocket

### Why Sentry
- Comprehensive error tracking
- Performance monitoring included
- React and Node.js first-class support
- Source map support for production debugging
- Breadcrumb trail for error context
- Release tracking
- Free tier suitable for development

### Why LogRocket (Optional)
- Visual debugging of user sessions
- See exactly what user saw when error occurred
- Network request/response inspection
- Console logs captured
- Integrates with Sentry
- **Note**: Consider HIPAA implications for healthcare data

## Implementation Plan

### Phase 1: Sentry Setup (1-2 days)

#### Backend Setup

```bash
cd backend
npm install @sentry/node @sentry/profiling-node
```

```javascript
// backend/src/server.js
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 0.1, // 10% of requests
  profilesSampleRate: 0.1,
});

// Request handler must be first middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// All your routes...

// Error handler must be last middleware
app.use(Sentry.Handlers.errorHandler());
```

#### Frontend Setup

```bash
cd frontend
npm install @sentry/react
```

```javascript
// frontend/src/main.jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true, // HIPAA compliance
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Phase 2: Error Boundaries (1 day)

```javascript
// frontend/src/components/ErrorBoundary.jsx
import { Component } from 'react';
import * as Sentry from '@sentry/react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>We've been notified and will fix it soon.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default Sentry.withErrorBoundary(ErrorBoundary);
```

### Phase 3: Custom Error Context (2 days)

```javascript
// Add user context
Sentry.setUser({
  id: user.id,
  username: user.username,
  role: user.role,
});

// Add breadcrumbs
Sentry.addBreadcrumb({
  category: 'patient',
  message: 'Viewed patient details',
  level: 'info',
  data: { patientId: patient.id },
});

// Custom error logging
try {
  await updatePatient(id, data);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'patient-management',
      action: 'update',
    },
    extra: {
      patientId: id,
      updateData: data,
    },
  });
  throw error;
}
```

### Phase 4: Performance Monitoring (1-2 days)

```javascript
// Track specific operations
const transaction = Sentry.startTransaction({
  name: 'Load Patient List',
  op: 'http.server',
});

try {
  const patients = await fetchPatients();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

### Phase 5: Release Tracking (1 day)

```javascript
// Set release version
Sentry.init({
  release: process.env.npm_package_version,
});

// In CI/CD, create release and upload source maps
sentry-cli releases new $VERSION
sentry-cli releases set-commits $VERSION --auto
sentry-cli releases finalize $VERSION
```

## Environment Configuration

```bash
# backend/.env
SENTRY_DSN=https://xxxxx@o000000.ingest.sentry.io/0000000
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# frontend/.env
VITE_SENTRY_DSN=https://xxxxx@o000000.ingest.sentry.io/0000001
VITE_ENVIRONMENT=production
```

## HIPAA Compliance Considerations

### Data Sanitization

```javascript
Sentry.init({
  beforeSend(event, hint) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers.Authorization;
      }
    }

    // Sanitize user data
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }

    return event;
  },
});
```

### PII Redaction

- Mask all text in session replays
- Block all media
- Remove sensitive headers
- Sanitize breadcrumbs
- Consider BAA (Business Associate Agreement) with Sentry

## Success Metrics

- [ ] All errors captured in Sentry
- [ ] Source maps working for stack traces
- [ ] Performance metrics collected
- [ ] Alerts configured for critical errors
- [ ] Release tracking operational

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Sentry Setup | 1-2 days | Backend + Frontend monitoring |
| Error Boundaries | 1 day | Graceful error handling |
| Custom Context | 2 days | Rich error context |
| Performance | 1-2 days | Transaction tracking |
| Release Tracking | 1 day | CI/CD integration |
| **Total** | **1 week** | Production monitoring |

## Costs

### Sentry Pricing
- **Free**: 5K errors/month, 10K performance events
- **Team** ($26/mo): 50K errors, 100K performance
- **Business** ($80/mo): 150K errors, 500K performance

**Recommendation**: Start with Free, upgrade to Team if needed

## Recommendation

**When**: Q2 2026 (after E2E testing)  
**Priority**: High  
**Start with**: Sentry only  
**Add later**: LogRocket if debugging needs arise  

---

**Last Updated**: 2026-01-07
