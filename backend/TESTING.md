# Testing Documentation

## Overview

NutriVault backend has comprehensive test coverage for all service layer components. The test suite uses Jest as the testing framework with SQLite in-memory database for fast, isolated tests.

**Last Updated**: 2026-01-07  
**Total Tests**: 324 tests  
**Status**: ✅ All tests passing

## Test Coverage

Current test coverage (Phase 5 - January 2026):
- **Statements**: 86.75%+
- **Branches**: 81.71%+
- **Functions**: 91.35%+
- **Lines**: 87.03%+

All metrics exceed the 80% threshold required for quality assurance.

## Test Structure

```
backend/tests/
├── setup.js              # Test environment configuration
├── helpers.js            # Test utility functions
├── __mocks__/            # Manual mocks for dependencies
│   └── uuid.js           # Mock for uuid v13 ESM package
├── services/             # Service layer tests (6 files)
│   ├── auth.service.test.js
│   ├── user.service.test.js
│   ├── patient.service.test.js
│   ├── visit.service.test.js
│   ├── billing.service.test.js
│   └── audit.service.test.js
├── unit/                 # Unit tests
│   └── queryBuilder.test.js
└── integration/          # Integration tests (1 file - more coming in Phase 5)
    └── filtering.test.js
```

## Test Statistics

| Test Category | Files | Tests | Status |
|---------------|-------|-------|--------|
| Service Layer | 6 | 183 | ✅ Pass |
| Unit Tests | 1 | 75 | ✅ Pass |
| Integration Tests | 1 | 66 | ✅ Pass |
| **Total** | **8** | **324** | **✅ All Pass** |

## Running Tests

### All Tests
```bash
cd backend
npm test
```

### Specific Test File
```bash
npm test -- tests/services/auth.service.test.js
```

### Watch Mode (auto-run on file changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

This generates:
- Console summary
- HTML report in `backend/coverage/lcov-report/index.html`

## Test Configuration

### Jest Configuration (`backend/jest.config.js`)

```javascript
{
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000
}
```

### Coverage Thresholds

All metrics must meet or exceed **80%**:
- Branch coverage
- Function coverage
- Line coverage
- Statement coverage

Builds will fail if coverage drops below these thresholds.

## Test Environment

### Database Setup

Tests use an in-memory SQLite database that is:
- Created fresh for each test suite
- Automatically synchronized with models
- Cleaned between tests to ensure isolation

### Test Lifecycle

```javascript
beforeAll(async () => {
  // Sync database schema
  await db.sequelize.sync({ force: true });
});

afterEach(async () => {
  // Clear all tables after each test
  // Ensures clean state for next test
});

afterAll(async () => {
  // Close database connection
  await db.sequelize.close();
});
```

## Test Helpers

The `tests/helpers.js` file provides utility functions for creating test data:

### Available Helpers

**createRole(data)**
```javascript
const role = await createRole({ name: 'ADMIN' });
```

**createUser(data)**
```javascript
const user = await createUser({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test123!',
  role: adminRole
});
```

**createPatient(data)**
```javascript
const patient = await createPatient({
  first_name: 'John',
  last_name: 'Doe',
  email: 'patient@example.com',
  dietitian: dietitianUser
});
```

**createVisit(data)**
```javascript
const visit = await createVisit({
  patient: patient,
  dietitian: dietitian,
  visit_date: new Date(),
  visit_type: 'Initial Consultation'
});
```

**createBilling(data)**
```javascript
const billing = await createBilling({
  patient: patient,
  visit: visit,
  amount: 150.00,
  tax_amount: 15.00,
  status: 'PENDING'
});
```

### Helper Features

- **Auto-relationships**: Helpers automatically create required related records
- **Unique values**: Invoice numbers, emails use timestamps/random strings to avoid conflicts
- **Sensible defaults**: All fields have default values; only specify what's unique to your test
- **Auto-calculation**: Billing totals calculated automatically from amount + tax

## Writing New Tests

### Test Structure Pattern

```javascript
describe('ServiceName', () => {
  describe('methodName', () => {
    // Setup test data
    let user, patient;

    beforeEach(async () => {
      const role = await createRole({ name: 'ADMIN' });
      user = await createUser({ role });
      patient = await createPatient({ dietitian: user });
    });

    it('should perform expected operation', async () => {
      // Arrange - prepare test data
      const data = { ... };

      // Act - execute the function
      const result = await service.method(data, user.id);

      // Assert - verify expectations
      expect(result).toBeDefined();
      expect(result.field).toBe(expectedValue);
    });

    it('should throw error on invalid input', async () => {
      // Assert with expectation
      await expect(service.method(invalid, user.id))
        .rejects
        .toThrow('Expected error message');
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**: `should <expected behavior> when <condition>`
2. **One assertion per test**: Focus tests on single behavior
3. **Arrange-Act-Assert pattern**: Clear structure makes tests readable
4. **Clean data**: Use unique usernames, emails to avoid conflicts
5. **Test RBAC**: Verify both allowed and denied access paths
6. **Test error cases**: Cover validation errors and edge cases

## Common Test Patterns

### Testing RBAC (Role-Based Access Control)

```javascript
it('should allow admin to access all records', async () => {
  await admin.reload({ include: [{ model: db.Role, as: 'role' }] });
  const result = await service.getRecords({}, admin);
  expect(result.records.length).toBeGreaterThan(0);
});

it('should restrict dietitian to assigned records only', async () => {
  await dietitian.reload({ include: [{ model: db.Role, as: 'role' }] });
  const result = await service.getRecords({}, dietitian);
  expect(result.records.every(r => r.dietitian_id === dietitian.id)).toBe(true);
});

it('should deny access for non-assigned dietitian', async () => {
  await otherDietitian.reload({ include: [{ model: db.Role, as: 'role' }] });
  await expect(service.getRecord(record.id, otherDietitian.id, otherDietitian))
    .rejects
    .toThrow('Access denied');
});
```

### Testing Pagination

```javascript
it('should paginate results', async () => {
  const result = await service.getRecords({ limit: 2, offset: 0 });

  expect(result.records).toHaveLength(2);
  expect(result.limit).toBe(2);
  expect(result.offset).toBe(0);
  expect(result.total).toBeGreaterThanOrEqual(2);
});
```

### Testing Filtering

```javascript
it('should filter by status', async () => {
  const result = await service.getRecords({ status: 'ACTIVE' });

  expect(result.records.every(r => r.status === 'ACTIVE')).toBe(true);
});
```

### Testing Date Ranges

```javascript
it('should filter by date range', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await service.getRecords({
    from_date: yesterday,
    to_date: tomorrow
  });

  expect(result.records.length).toBeGreaterThan(0);
});
```

### Testing Decimal Values

```javascript
it('should handle decimal amounts correctly', async () => {
  const result = await service.create({ amount: 100.50, tax: 10.05 });

  expect(parseFloat(result.amount)).toBeCloseTo(100.50, 2);
  expect(parseFloat(result.tax)).toBeCloseTo(10.05, 2);
  expect(parseFloat(result.total)).toBeCloseTo(110.55, 2);
});
```

## Continuous Integration

Tests run automatically on:
- Pre-commit hooks (if configured)
- Pull request creation
- Merge to main branch

### CI Requirements

All tests must:
1. Pass with exit code 0
2. Meet 80% coverage thresholds
3. Complete within timeout limits (10s per test)

## Debugging Tests

### Run Single Test
```bash
npm test -- -t "test name pattern"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues & Solutions

### Database Constraint Violations

**Problem**: Tests fail with unique constraint errors

**Solution**: Ensure unique values for emails, usernames, invoice numbers
```javascript
const user = await createUser({
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`
});
```

### Role Conflicts

**Problem**: Multiple tests try to create same role name

**Solution**: Use unique role names per describe block
```javascript
const role = await createRole({ name: 'ADMIN_TEST_1' });
```

### Decimal Comparison Issues

**Problem**: `expect(result.amount).toBe('100.00')` fails

**Solution**: Use `toBeCloseTo()` for decimal comparisons
```javascript
expect(parseFloat(result.amount)).toBeCloseTo(100.00, 2);
```

### Async/Await Errors

**Problem**: Tests pass but operations aren't completing

**Solution**: Always use `await` for async operations
```javascript
// Wrong
const result = service.create(data);

// Correct
const result = await service.create(data);
```

## Future Improvements

Planned enhancements for test suite:
1. Integration tests for API endpoints (Express routes)
2. End-to-end tests for complete user workflows
3. Performance/load testing for concurrent operations
4. Security testing for authentication bypass attempts
5. Database migration testing

## References

- [Jest Documentation](https://jestjs.io/)
- [Sequelize Testing Guide](https://sequelize.org/docs/v6/other-topics/testing/)
- [Testing Best Practices](https://testingjavascript.com/)
