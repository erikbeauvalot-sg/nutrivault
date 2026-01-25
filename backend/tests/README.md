# NutriVault Backend Tests

## Overview

This test suite provides comprehensive automated testing for the NutriVault backend API. It uses **Jest** as the test runner and **Supertest** for HTTP assertions.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only integration tests
npm run test:integration
```

## Test Structure

```
backend/tests/
├── setup/                    # Test infrastructure
│   ├── testDb.js            # Database lifecycle management
│   ├── testAuth.js          # Authentication helpers
│   ├── testServer.js        # Express app for testing
│   └── jest.setup.js        # Global Jest configuration
├── fixtures/                 # Test data
│   ├── index.js             # Central fixture export
│   ├── users.fixture.js     # User test data
│   ├── patients.fixture.js  # Patient test data
│   ├── visits.fixture.js    # Visit test data
│   ├── billing.fixture.js   # Invoice test data
│   ├── measures.fixture.js  # Measure definitions
│   ├── customFields.fixture.js
│   ├── emailTemplates.fixture.js
│   ├── billingTemplates.fixture.js
│   ├── invoiceCustomizations.fixture.js
│   └── roles.fixture.js
├── integration/              # API integration tests
│   ├── auth.integration.test.js
│   ├── patients.integration.test.js
│   ├── visits.integration.test.js
│   ├── billing.integration.test.js
│   ├── measures.integration.test.js
│   ├── customFields.integration.test.js
│   ├── emailTemplates.integration.test.js
│   ├── billingTemplates.integration.test.js
│   ├── invoiceCustomizations.integration.test.js
│   └── roles.integration.test.js
├── services/                 # Service unit tests
│   └── trendAnalysis.service.test.js
├── performance/              # Performance tests
│   └── measures.performance.test.js
└── *.test.js                # Other tests (formula engine, etc.)
```

## Test Infrastructure

### Database (testDb.js)

The test database uses SQLite in-memory for fast, isolated testing.

```javascript
const testDb = require('./setup/testDb');

// Initialize database (creates tables)
await testDb.init();

// Seed base data (roles, permissions)
await testDb.seedBaseData();

// Reset all data between tests
await testDb.reset();

// Close connection
await testDb.close();

// Get database instance
const db = testDb.getDb();
```

### Authentication (testAuth.js)

Create authenticated users for testing with proper JWT tokens.

```javascript
const testAuth = require('./setup/testAuth');

// Create users by role
const adminAuth = await testAuth.createAdmin();
const dietitianAuth = await testAuth.createDietitian();
const assistantAuth = await testAuth.createAssistant();

// Use in requests
const res = await request(app)
  .get('/api/patients')
  .set('Authorization', adminAuth.authHeader);

// Access user data
console.log(adminAuth.user.id);
console.log(adminAuth.token);
console.log(adminAuth.password); // Plain password for login tests
```

### Test Server (testServer.js)

Provides the Express app instance for Supertest.

```javascript
const app = require('./setup/testServer').getApp();

// Reset app (clears require cache)
const freshApp = require('./setup/testServer').resetApp();
```

## Writing Tests

### Standard Test Pattern

```javascript
const request = require('supertest');
const testDb = require('../setup/testDb');
const testAuth = require('../setup/testAuth');
const { patients: patientFixtures } = require('../fixtures');

let app;

describe('Feature API', () => {
  let adminAuth;
  let dietitianAuth;

  beforeAll(async () => {
    await testDb.init();
    await testDb.seedBaseData();
    app = require('../setup/testServer').resetApp();
  });

  beforeEach(async () => {
    await testDb.reset();
    await testDb.seedBaseData();
    testAuth.resetCounter();

    // Create test users
    adminAuth = await testAuth.createAdmin();
    dietitianAuth = await testAuth.createDietitian();
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('GET /api/feature', () => {
    it('should return list for authenticated user', async () => {
      const res = await request(app)
        .get('/api/feature')
        .set('Authorization', adminAuth.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/feature');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/feature', () => {
    it('should create with valid data', async () => {
      const res = await request(app)
        .post('/api/feature')
        .set('Authorization', adminAuth.authHeader)
        .send(featureFixtures.validFeature);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
    });

    it('should reject invalid data', async () => {
      const res = await request(app)
        .post('/api/feature')
        .set('Authorization', adminAuth.authHeader)
        .send(featureFixtures.invalidFeature);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
```

### Using Fixtures

Fixtures provide consistent test data:

```javascript
const {
  patients: patientFixtures,
  visits: visitFixtures,
  billing: billingFixtures
} = require('../fixtures');

// Use valid data for creation
const patient = await db.Patient.create({
  ...patientFixtures.validPatient,
  assigned_dietitian_id: dietitianAuth.user.id
});

// Use invalid data to test validation
const res = await request(app)
  .post('/api/patients')
  .send(patientFixtures.invalidPatients.missingEmail);

expect(res.status).toBe(400);
```

### Testing RBAC (Role-Based Access Control)

```javascript
describe('RBAC', () => {
  it('should allow admin full access', async () => {
    const res = await request(app)
      .delete(`/api/patients/${patient.id}`)
      .set('Authorization', adminAuth.authHeader);
    expect(res.status).toBe(200);
  });

  it('should restrict assistant access', async () => {
    const assistantAuth = await testAuth.createAssistant();
    const res = await request(app)
      .delete(`/api/patients/${patient.id}`)
      .set('Authorization', assistantAuth.authHeader);
    expect(res.status).toBe(403);
  });
});
```

## Fixtures Reference

### Users (users.fixture.js)

```javascript
{
  DEFAULT_PASSWORD: 'TestPassword123!',
  validUser: { username, email, firstName, lastName, password },
  adminUser: { ... },
  dietitianUser: { ... },
  assistantUser: { ... }
}
```

### Patients (patients.fixture.js)

```javascript
{
  validPatient: { first_name, last_name, email, phone, ... },
  minimalPatient: { first_name, last_name, email },
  invalidPatients: { missingEmail, invalidEmail, ... }
}
```

### Visits (visits.fixture.js)

```javascript
{
  validVisit: { visit_date, visit_type, status: 'SCHEDULED', ... },
  visitStatuses: { scheduled, completed, cancelled, noShow },
  visitUpdates: { reschedule, complete, cancel }
}
// Note: Status values must be uppercase (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW)
```

### Billing (billing.fixture.js)

```javascript
{
  validInvoice: { invoice_number, amount, total_amount, status: 'DRAFT', invoice_date, ... },
  invoiceStatuses: { draft, sent, paid, overdue, cancelled },
  payments: { fullPayment, partialPayment, ... }
}
// Note: Status values must be uppercase (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
```

### Measures (measures.fixture.js)

```javascript
{
  validMeasure: { code, name, display_name, unit, category, ... },
  systemMeasures: [ weight, height, bmi, ... ],
  patientMeasures: { weight: { value, measured_at }, ... }
}
```

### Custom Fields (customFields.fixture.js)

```javascript
{
  validCategory: { name, description, entity_type },
  fieldDefinitions: {
    textField: { field_name, field_label, field_type: 'text', ... },
    selectField: { field_name, field_label, field_type: 'select', options: [...] },
    numberField: { ... },
    booleanField: { ... },
    dateField: { ... }
  }
}
```

### Email Templates (emailTemplates.fixture.js)

```javascript
{
  validTemplate: { name, code, subject, body_html, category, language, ... },
  templateCategories: { appointment, invoice, followUp, ... }
}
```

### Billing Templates (billingTemplates.fixture.js)

```javascript
{
  validTemplate: {
    name,
    description,
    items: [{ item_name, quantity, unit_price }]
  },
  multiItemTemplate: { ... },
  templateWithTax: { ... }
}
```

## Test Coverage

Current test coverage by domain:

| Domain | Tests | Status |
|--------|-------|--------|
| Authentication | 24 | ✅ Passing |
| Patients | 36 | ✅ Passing |
| Visits | 28 | ✅ Passing |
| Billing Templates | 18 | ✅ Passing |
| Formula Engine | 35 | ✅ Passing |
| Trend Analysis | 28 | ✅ Passing |
| Calculated Fields | 47 | ✅ Passing |
| Performance | 7 | ✅ Passing |
| Billing | 33 | ⚠️ Partial |
| Email Templates | 28 | ⚠️ Partial |
| Measures | 25 | ⚠️ Partial |
| Custom Fields | 22 | ⚠️ Partial |
| Roles | 24 | ⚠️ Partial |
| Invoice Customizations | 18 | ⚠️ Partial |

**Total: 327/389 tests passing (84%)**

## Configuration

### Jest Configuration (jest.config.js)

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: { branches: 50, functions: 50, lines: 50, statements: 50 }
  }
};
```

### Environment Variables (.env.test)

```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=test-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
```

## Troubleshooting

### Common Issues

**1. Tests timing out**
- Increase timeout in jest.config.js: `testTimeout: 60000`
- Check for unresolved promises or open handles

**2. Database errors**
- Ensure `testDb.init()` is called in `beforeAll`
- Ensure `testDb.reset()` is called in `beforeEach`
- Check model field names match fixtures

**3. Authentication failures**
- Use `testAuth.resetCounter()` in `beforeEach`
- Verify user is created before making requests

**4. Status/enum validation errors**
- Use uppercase for status values: `SCHEDULED`, `COMPLETED`, `DRAFT`, etc.
- Check model validation constraints

**5. Missing required fields**
- Check model for `allowNull: false` fields
- Ensure fixtures include all required fields

### Debug Tips

```javascript
// Log response body on failure
console.log('Response:', res.body);

// Log database queries
process.env.DEBUG = 'sequelize:sql:*';

// Check what's in the database
const db = testDb.getDb();
const records = await db.Patient.findAll();
console.log('Patients:', JSON.stringify(records, null, 2));
```

## Contributing

When adding new tests:

1. Create fixtures in `tests/fixtures/` for your domain
2. Export from `tests/fixtures/index.js`
3. Create test file in `tests/integration/`
4. Follow the standard test pattern
5. Test all CRUD operations
6. Test authentication and authorization
7. Test validation (invalid data)
8. Run full test suite before committing
