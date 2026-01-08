---
description: 'Testing best practices for unit, integration, and E2E tests, test coverage (>=80% SGCP requirement), F.I.R.S.T. principles, and clean test code'
applyTo: '**/*.{test.js,test.ts,spec.js,spec.ts,test.py}'
---

# Testing Best Practices

## Overview
Comprehensive testing ensures code quality, prevents regressions, and facilitates refactoring. This document outlines best practices for different types of testing.

**SGCP Requirement**: Minimum 80% unit test coverage for all production code.

## Test Pyramid

```
        /\
       /  \
      / E2E \      <- Few, slow, expensive
     /______\
    /        \
   /Integration\ <- Some, moderate speed
  /____________\
 /              \
/  Unit Tests    \ <- Many, fast, cheap
/__________________\
```

### Distribution
- **70% Unit Tests**: Fast, isolated, test individual units
- **20% Integration Tests**: Test component interactions
- **10% E2E Tests**: Test complete user workflows

## Unit Testing

### Characteristics
- Fast execution (< 50ms per test)
- Isolated from external dependencies
- Test one thing at a time
- Deterministic results

### Best Practices

#### Test Structure (AAA Pattern)
```javascript
describe('calculateDiscount', () => {
  it('should apply 10% discount for orders over $100', () => {
    // Arrange
    const orderTotal = 150;
    const discountThreshold = 100;
    const discountRate = 0.1;
    
    // Act
    const result = calculateDiscount(orderTotal, discountThreshold, discountRate);
    
    // Assert
    expect(result).toBe(15);
  });
});
```

#### Descriptive Test Names
```javascript
// Good: Describes scenario and expected outcome
it('should throw ValidationError when email format is invalid', () => {});
it('should return empty array when no users match the filter', () => {});
it('should cache result after first API call', () => {});

// Bad: Vague or unclear
it('test email', () => {});
it('works correctly', () => {});
it('test1', () => {});
```

#### Test One Thing
```javascript
// Good: Focused test
it('should validate email format', () => {
  expect(validateEmail('user@example.com')).toBe(true);
});

it('should reject email without @ symbol', () => {
  expect(validateEmail('userexample.com')).toBe(false);
});

// Bad: Testing multiple things
it('should validate user input', () => {
  expect(validateEmail('user@example.com')).toBe(true);
  expect(validateAge(25)).toBe(true);
  expect(validatePassword('Pass123!')).toBe(true);
  // Too many responsibilities
});
```

#### Test Edge Cases
```javascript
describe('divide', () => {
  it('should divide positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });
  
  it('should handle division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
  
  it('should handle very small numbers', () => {
    expect(divide(0.0001, 0.0002)).toBeCloseTo(0.5);
  });
  
  it('should handle very large numbers', () => {
    expect(divide(1e10, 1e5)).toBe(1e5);
  });
});
```

### Mocking

#### When to Mock
- External APIs
- Databases
- File system
- Time-dependent code
- Random generators

#### Mock Examples
```javascript
// Jest mocking
jest.mock('./userService');

describe('UserController', () => {
  it('should return user data', async () => {
    // Arrange
    const mockUser = { id: 1, name: 'John' };
    userService.getUser.mockResolvedValue(mockUser);
    
    // Act
    const result = await userController.getUser(1);
    
    // Assert
    expect(result).toEqual(mockUser);
    expect(userService.getUser).toHaveBeenCalledWith(1);
  });
  
  it('should handle errors', async () => {
    // Arrange
    userService.getUser.mockRejectedValue(new Error('Not found'));
    
    // Act & Assert
    await expect(userController.getUser(999)).rejects.toThrow('Not found');
  });
});
```

#### Spy on Methods
```javascript
describe('EmailService', () => {
  it('should send email with correct parameters', async () => {
    const emailService = new EmailService();
    const sendSpy = jest.spyOn(emailService, 'send');
    
    await emailService.sendWelcomeEmail('user@example.com', 'John');
    
    expect(sendSpy).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome, John!',
      template: 'welcome'
    });
  });
});
```

### Test Data Builders
```javascript
// Good: Test data builder pattern
class UserBuilder {
  constructor() {
    this.user = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      createdAt: new Date('2024-01-01')
    };
  }
  
  withId(id) {
    this.user.id = id;
    return this;
  }
  
  withRole(role) {
    this.user.role = role;
    return this;
  }
  
  withEmail(email) {
    this.user.email = email;
    return this;
  }
  
  build() {
    return { ...this.user };
  }
}

// Usage
const adminUser = new UserBuilder()
  .withId(100)
  .withRole('admin')
  .build();

const regularUser = new UserBuilder().build();
```

## Integration Testing

### Characteristics
- Test component interactions
- Use real dependencies (databases, APIs)
- Slower than unit tests
- More comprehensive

### Database Integration Tests
```javascript
describe('UserRepository', () => {
  let database;
  
  beforeAll(async () => {
    database = await setupTestDatabase();
  });
  
  afterAll(async () => {
    await database.close();
  });
  
  beforeEach(async () => {
    await database.clearAll();
  });
  
  it('should create and retrieve user', async () => {
    // Arrange
    const userData = {
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    // Act
    const created = await userRepository.create(userData);
    const retrieved = await userRepository.findById(created.id);
    
    // Assert
    expect(retrieved).toMatchObject(userData);
    expect(retrieved.id).toBeDefined();
    expect(retrieved.createdAt).toBeInstanceOf(Date);
  });
  
  it('should enforce unique email constraint', async () => {
    // Arrange
    await userRepository.create({
      name: 'User 1',
      email: 'duplicate@example.com'
    });
    
    // Act & Assert
    await expect(
      userRepository.create({
        name: 'User 2',
        email: 'duplicate@example.com'
      })
    ).rejects.toThrow('Email already exists');
  });
});
```

### API Integration Tests
```javascript
const request = require('supertest');
const app = require('./app');

describe('User API', () => {
  let authToken;
  
  beforeAll(async () => {
    // Setup test user and get auth token
    authToken = await getTestAuthToken();
  });
  
  describe('GET /api/users/:id', () => {
    it('should return user when authenticated', async () => {
      const response = await request(app)
        .get('/api/users/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        id: 1,
        name: expect.any(String),
        email: expect.any(String)
      });
    });
    
    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/users/1')
        .expect(401);
    });
    
    it('should return 404 when user not found', async () => {
      await request(app)
        .get('/api/users/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
  
  describe('POST /api/users', () => {
    it('should create user with valid data', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);
      
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: userData.name,
        email: userData.email
      });
      expect(response.body.password).toBeUndefined(); // Should not return password
    });
    
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'User',
          email: 'invalid-email',
          password: 'Pass123!'
        })
        .expect(400);
      
      expect(response.body.error).toContain('email');
    });
  });
});
```

## End-to-End Testing

### Characteristics
- Test complete user workflows
- Test from user perspective
- Slowest tests
- Most comprehensive

### E2E Test Example (Playwright)
```javascript
const { test, expect } = require('@playwright/test');

test.describe('User Registration Flow', () => {
  test('should complete registration successfully', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill form
    await page.fill('[name="name"]', 'John Doe');
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText('Registration successful');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
  
  test('should show validation errors', async ({ page }) => {
    await page.goto('/register');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Check for error messages
    await expect(page.locator('.error-message')).toHaveCount(4);
    await expect(page.locator('[name="name"] + .error')).toContainText('Name is required');
  });
});

test.describe('Shopping Cart Flow', () => {
  test('should add items and checkout', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Browse products
    await page.goto('/products');
    await page.click('[data-product-id="1"] button.add-to-cart');
    await page.click('[data-product-id="2"] button.add-to-cart');
    
    // Verify cart count
    await expect(page.locator('.cart-count')).toHaveText('2');
    
    // Go to cart
    await page.click('.cart-icon');
    await expect(page).toHaveURL('/cart');
    
    // Verify items in cart
    await expect(page.locator('.cart-item')).toHaveCount(2);
    
    // Proceed to checkout
    await page.click('button.checkout');
    
    // Fill shipping info
    await page.fill('[name="address"]', '123 Main St');
    await page.fill('[name="city"]', 'New York');
    await page.fill('[name="zipCode"]', '10001');
    
    // Complete order
    await page.click('button.place-order');
    
    // Verify order confirmation
    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.locator('.order-confirmation')).toBeVisible();
  });
});
```

## Test Coverage

### Measuring Coverage
```bash
# Jest
npm test -- --coverage

# Coverage threshold in package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### What to Cover
```javascript
// ✅ Critical business logic
function calculateTax(amount, rate) { /* Must have tests */ }

// ✅ Complex algorithms
function sortByMultipleCriteria(items) { /* Must have tests */ }

// ✅ Error conditions
function validateInput(data) { /* Must test all validations */ }

// ⚠️ Simple getters/setters (optional)
class User {
  get name() { return this._name; } // Low priority
}

// ❌ Third-party code (don't test)
// Libraries, frameworks
```

## Test Fixtures

### Shared Setup
```javascript
// test/fixtures/users.js
module.exports = {
  validUser: {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  },
  
  adminUser: {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin'
  },
  
  invalidUsers: [
    { name: '', email: 'invalid@example.com' }, // Missing name
    { name: 'User', email: 'not-an-email' },    // Invalid email
    { name: 'User', email: 'user@example.com', age: -1 } // Invalid age
  ]
};

// Usage
const fixtures = require('./fixtures/users');

it('should create user with valid data', () => {
  const user = createUser(fixtures.validUser);
  expect(user).toBeDefined();
});
```

## Parameterized Tests
```javascript
// Good: Test multiple scenarios
describe.each([
  { input: 'test@example.com', expected: true },
  { input: 'user+tag@example.co.uk', expected: true },
  { input: 'invalid', expected: false },
  { input: '@example.com', expected: false },
  { input: 'user@', expected: false },
  { input: '', expected: false },
])('validateEmail($input)', ({ input, expected }) => {
  it(`should return ${expected}`, () => {
    expect(validateEmail(input)).toBe(expected);
  });
});

// Jest table syntax
test.each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`('adds $a + $b to equal $expected', ({ a, b, expected }) => {
  expect(a + b).toBe(expected);
});
```

## Async Testing

### Testing Promises
```javascript
// Async/await (recommended)
it('should fetch user data', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('John');
});

// Return promise
it('should fetch user data', () => {
  return fetchUser(1).then(user => {
    expect(user.name).toBe('John');
  });
});

// resolves/rejects matchers
it('should resolve with user data', async () => {
  await expect(fetchUser(1)).resolves.toMatchObject({ name: 'John' });
});

it('should reject with error', async () => {
  await expect(fetchUser(999)).rejects.toThrow('Not found');
});
```

### Testing Callbacks
```javascript
it('should call callback with result', (done) => {
  fetchUser(1, (error, user) => {
    expect(error).toBeNull();
    expect(user.name).toBe('John');
    done(); // Signal test completion
  });
});
```

## Flaky Tests Prevention

### Common Causes
1. **Race conditions**: Async operations completing in unpredictable order
2. **Time dependencies**: Tests that depend on current time
3. **Shared state**: Tests affecting each other
4. **External dependencies**: Network, file system

### Solutions
```javascript
// ❌ Bad: Fixed timeouts
await sleep(1000); // May not be enough

// ✅ Good: Wait for condition
await waitFor(() => {
  expect(element).toBeVisible();
});

// ❌ Bad: Date.now() in tests
const createdAt = Date.now();

// ✅ Good: Mock time
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-01'));

// ❌ Bad: Shared mutable state
let counter = 0; // Shared across tests

// ✅ Good: Reset state
beforeEach(() => {
  counter = 0;
});

// ❌ Bad: Test order dependency
it('test 1', () => { data.push('item'); });
it('test 2', () => { expect(data).toHaveLength(1); }); // Fails if run alone

// ✅ Good: Independent tests
it('test 1', () => {
  const data = ['item'];
  // test with data
});
```

## Test Performance

### Optimize Slow Tests
```javascript
// ❌ Slow: Setup in each test
describe('UserService', () => {
  it('test 1', async () => {
    await setupDatabase(); // Slow
    // test
  });
  
  it('test 2', async () => {
    await setupDatabase(); // Repeated
    // test
  });
});

// ✅ Fast: Shared setup
describe('UserService', () => {
  beforeAll(async () => {
    await setupDatabase(); // Once for all tests
  });
  
  beforeEach(async () => {
    await database.clearData(); // Quick reset
  });
});
```

### Parallel Execution
```javascript
// Jest runs tests in parallel by default
// Adjust workers if needed
{
  "jest": {
    "maxWorkers": "50%" // Use 50% of CPU cores
  }
}
```

## Testing Checklist

### Before Writing Tests
- [ ] Understand what you're testing
- [ ] Identify edge cases
- [ ] Plan test data needs
- [ ] Consider mocking strategy

### Test Quality
- [ ] Descriptive test names
- [ ] One assertion per test (generally)
- [ ] No test interdependencies
- [ ] Fast execution
- [ ] Deterministic results

### Coverage
- [ ] Happy path tested
- [ ] Error conditions tested
- [ ] Edge cases covered
- [ ] Integration points tested
- [ ] Critical user flows tested

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Playwright](https://playwright.dev/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
