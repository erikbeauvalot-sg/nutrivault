# E2E Testing with Playwright

This directory contains end-to-end (E2E) tests for the NutriVault application using Playwright.

## 📁 Structure

```
tests/e2e/
├── fixtures/          # Test data and global setup
│   ├── testData.js    # Test users, patients, visits, etc.
│   └── globalSetup.js # Pre-test global setup
├── helpers/           # Reusable helper functions
│   ├── auth.js        # Authentication helpers
│   └── cleanup.js     # Test data cleanup utilities
├── pages/             # Page Object Models
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── PatientsPage.js
│   ├── VisitsPage.js
│   ├── BillingPage.js
│   ├── UsersPage.js
│   └── AuditLogPage.js
└── specs/             # Test specifications
    ├── auth.spec.js
    ├── patients.spec.js
    ├── visits.spec.js
    ├── billing.spec.js
    ├── users.spec.js
    └── audit.spec.js
```

## 🚀 Prerequisites

Before running E2E tests, ensure:

1. **Backend is running** on `http://localhost:5000`
   ```bash
   cd backend && npm start
   ```

2. **Frontend is running** on `http://localhost:5173`
   ```bash
   cd frontend && npm run dev
   ```

3. **Test users exist** in the database:
   - `admin` / `admin123` (admin role)
   - `nutritionist` / `nutri123` (nutritionist role)
   - `staff` / `staff123` (staff role)

## 🧪 Running Tests

### Run all tests (headless mode)
```bash
npm run test:e2e
```

### Run tests with visible browser
```bash
npm run test:e2e:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Run specific test file
```bash
npx playwright test specs/auth.spec.js
```

### Run specific test
```bash
npx playwright test specs/auth.spec.js -g "should login successfully"
```

## 📊 View Test Reports

After tests complete, view the HTML report:
```bash
npm run test:e2e:report
```

## 🎯 Test Coverage

### Authentication Tests (`auth.spec.js`)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Form validation
- ✅ Remember me functionality
- ✅ Logout
- ✅ Protected route access
- ✅ RBAC enforcement

### Patient Management Tests (`patients.spec.js`)
- ✅ Create patient
- ✅ Search patients
- ✅ View patient details
- ✅ Update patient
- ✅ Delete patient
- ✅ Form validation
- ✅ Duplicate email prevention

### Visit Management Tests (`visits.spec.js`)
- ✅ Create visit
- ✅ Add measurements
- ✅ Update visit status
- ✅ Form validation

### Billing Tests (`billing.spec.js`)
- ✅ Create invoice
- ✅ Record payment
- ✅ Filter by status
- ✅ Form validation

### User Management Tests (`users.spec.js`)
- ✅ Create user (admin only)
- ✅ Change user role
- ✅ Deactivate user
- ✅ Password validation
- ✅ RBAC enforcement

### Audit Log Tests (`audit.spec.js`)
- ✅ View audit logs (admin only)
- ✅ Filter by action type
- ✅ Filter by date range
- ✅ Clear filters
- ✅ Export logs
- ✅ Pagination

## 🔧 Configuration

Test configuration is in `playwright.config.js` at the project root:
- Base URL: `http://localhost:5173`
- Timeout: 30 seconds per test
- Retries: 2 (in CI), 0 (local)
- Browsers: Chromium, Firefox, WebKit
- Parallel execution enabled
- Screenshots and videos on failure

## 📝 Writing New Tests

### Using Page Object Model

```javascript
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { PatientsPage } from '../pages/PatientsPage.js';

test.describe('Patient Feature', () => {
  let patientsPage;

  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    patientsPage = new PatientsPage(page);
    await patientsPage.goto();
  });

  test('should do something', async ({ page }) => {
    // Your test logic
  });
});
```

### Best Practices

1. **Use Page Objects** - Encapsulate page interactions
2. **Use Helpers** - Reuse authentication and cleanup logic
3. **Use Fixtures** - Use test data from `testData.js`
4. **Clean Up** - Remove test data after tests
5. **Wait Properly** - Use `waitForURL`, `waitFor` instead of `waitForTimeout`
6. **Descriptive Names** - Use clear test names: "should do X when Y"

## 🐛 Debugging

### Debug a specific test
```bash
npx playwright test specs/auth.spec.js --debug
```

### Generate trace
```bash
npx playwright test --trace on
```

### View trace
```bash
npx playwright show-trace trace.zip
```

## 📈 Success Metrics

- **Coverage**: 80% critical user flows
- **Speed**: All tests < 5 minutes
- **Reliability**: Zero flaky tests
- **Scenarios**: 30+ E2E test scenarios

## 🔗 Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Phase 5 Testing Plan](../../plan/phase5-testing-quality.md)
- [E2E Testing Setup Plan](../../plan/e2e-testing-setup.md)

---

**Last Updated**: 2026-01-07  
**Status**: ✅ Implementation Complete
