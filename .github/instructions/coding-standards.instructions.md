# MSCopilot Coding Standards

## Overview
This document defines the coding standards that MSCopilot follows when generating and reviewing code.

## General Principles

### 1. Clarity Over Cleverness
- Write code that is easy to understand
- Avoid overly clever or terse solutions
- Prefer explicit over implicit
- Use meaningful names

### 2. Consistency
- Follow established project patterns
- Use consistent naming conventions
- Maintain consistent formatting
- Apply patterns uniformly

### 3. Simplicity
- Keep functions small and focused
- Avoid unnecessary complexity
- Use appropriate abstractions
- Don't over-engineer

## Naming Conventions

### Variables
- Use descriptive names that explain purpose
- Avoid single-letter names except for loops
- Use camelCase for most languages (except Python, C#)
- Boolean variables should answer yes/no questions

```javascript
// Good
const isUserAuthenticated = true;
const userAge = 25;
const activeUsers = [];

// Bad
const flag = true;
const x = 25;
const arr = [];
```

### Functions/Methods
- Use verbs that describe action
- Name should indicate what it does
- Use camelCase (or snake_case for Python)
- Be specific about purpose

```javascript
// Good
function calculateTotalPrice(items) { }
function isValidEmail(email) { }
function getUserById(id) { }

// Bad
function process(data) { }
function check(value) { }
function doStuff() { }
```

### Classes
- Use PascalCase
- Use nouns or noun phrases
- Name should indicate responsibility
- Be specific and descriptive

```javascript
// Good
class UserAuthentication { }
class OrderProcessor { }
class DatabaseConnection { }

// Bad
class Manager { }
class Helper { }
class Utils { }
```

### Constants
- Use UPPER_SNAKE_CASE
- Name should describe the value
- Group related constants

```javascript
// Good
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT_MS = 5000;

// Bad
const max = 3;
const url = 'https://api.example.com';
const time = 5000;
```

## Code Structure

### File Organization
```
1. Import statements
2. Constants
3. Type definitions
4. Main code
5. Helper functions
6. Exports
```

### Function Length
- Keep functions under 50 lines
- Extract complex logic into separate functions
- One function = one responsibility
- If it does multiple things, split it

### Class Structure
```
class Example {
  // 1. Static properties
  // 2. Instance properties
  // 3. Constructor
  // 4. Public methods
  // 5. Private methods
}
```

## Comments

### When to Comment
- Explain WHY, not WHAT
- Document complex algorithms
- Warn about gotchas
- Provide context for non-obvious code
- Reference external resources

```javascript
// Good: Explains why
// Use exponential backoff to avoid overwhelming the API
const delay = Math.pow(2, retryCount) * 1000;

// Bad: States the obvious
// Add 1 to counter
counter++;
```

### Documentation Comments
- Document all public APIs
- Include parameter descriptions
- Document return values
- Note any exceptions thrown
- Provide usage examples

```javascript
/**
 * Calculates the total price including tax.
 *
 * @param {number} subtotal - The subtotal before tax
 * @param {number} taxRate - The tax rate (e.g., 0.08 for 8%)
 * @returns {number} The total price including tax
 * @throws {ValidationError} If subtotal or taxRate is negative
 *
 * @example
 * const total = calculateTotal(100, 0.08);
 * // Returns: 108
 */
function calculateTotal(subtotal, taxRate) {
  // Implementation
}
```

## Error Handling

### Always Handle Errors
```javascript
// Good
try {
  const data = await fetchData();
  processData(data);
} catch (error) {
  logger.error('Failed to fetch data', { error });
  throw new DataFetchError('Unable to retrieve data', { cause: error });
}

// Bad
try {
  const data = await fetchData();
  processData(data);
} catch (error) {
  // Silent failure
}
```

### Use Specific Error Types
```javascript
// Good
throw new ValidationError('Email format is invalid');
throw new NotFoundError('User not found');
throw new AuthenticationError('Invalid credentials');

// Bad
throw new Error('Error occurred');
```

### Provide Context
```javascript
// Good
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: email,
  expected: 'valid email address'
});

// Bad
throw new Error('Invalid');
```

## Testing Standards

### Test Naming
```javascript
// Good
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when user exists', () => { });
    it('should throw NotFoundError when user does not exist', () => { });
  });
});

// Bad
test('test1', () => { });
test('user test', () => { });
```

### Test Structure (AAA)
```javascript
it('should calculate total with tax', () => {
  // Arrange
  const subtotal = 100;
  const taxRate = 0.08;
  
  // Act
  const result = calculateTotal(subtotal, taxRate);
  
  // Assert
  expect(result).toBe(108);
});
```

### Test Coverage
- Minimum 80% coverage for business logic
- Test happy paths
- Test error conditions
- Test edge cases
- Test boundary values

## Security Standards

### Input Validation
```javascript
// Good
function createUser(data) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    age: Joi.number().min(0).max(150).required()
  });
  
  const { error, value } = schema.validate(data);
  if (error) throw new ValidationError(error.message);
  
  return userRepository.create(value);
}

// Bad
function createUser(data) {
  return userRepository.create(data);
}
```

### SQL Injection Prevention
```javascript
// Good
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// Bad
const user = await db.query(
  `SELECT * FROM users WHERE id = ${userId}`
);
```

### Secret Management
```javascript
// Good
const apiKey = process.env.API_KEY;
const dbPassword = process.env.DB_PASSWORD;

// Bad
const apiKey = 'sk_live_abc123';
const dbPassword = 'mypassword123';
```

## Performance Standards

### Optimize Database Queries
```javascript
// Good: Single query with eager loading
const users = await User.findAll({
  include: [Order, Profile]
});

// Bad: N+1 queries
const users = await User.findAll();
for (const user of users) {
  user.orders = await Order.findByUserId(user.id);
}
```

### Use Appropriate Data Structures
```javascript
// Good: O(1) lookup
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(userId);

// Bad: O(n) lookup
const user = users.find(u => u.id === userId);
```

### Avoid Memory Leaks
```javascript
// Good: Cleanup event listeners
class Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
    element.addEventListener('click', this.handleClick);
  }
  
  destroy() {
    element.removeEventListener('click', this.handleClick);
  }
}

// Bad: No cleanup
class Component {
  constructor() {
    element.addEventListener('click', this.handleClick.bind(this));
  }
}
```

## Language-Specific Standards

### JavaScript/TypeScript
- Use `const` by default, `let` when needed, never `var`
- Prefer arrow functions for callbacks
- Use async/await over promises
- Use optional chaining `?.` and nullish coalescing `??`
- Enable strict mode in TypeScript

### Python
- Follow PEP 8
- Use type hints
- Use f-strings for formatting
- Use context managers for resources
- Maximum line length: 88 characters (Black formatter)

### Java
- Follow Oracle conventions
- Use meaningful variable names
- Document with JavaDoc
- Use try-with-resources
- Prefer composition over inheritance

### C#
- Follow Microsoft conventions
- Use async/await for I/O
- Use LINQ for collections
- Implement IDisposable properly
- Use nullable reference types

## Git Standards

### Commit Messages
```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Example:
```
feat(auth): add JWT authentication

Implement JWT-based authentication system with refresh tokens.
Includes middleware for protected routes.

Closes #123
```

### Branch Naming
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Urgent fixes
- `release/version` - Release branches

## Documentation Standards

### README Requirements
1. Project title and description
2. Installation instructions
3. Usage examples
4. Configuration options
5. API documentation
6. Contributing guidelines
7. License

### Code Documentation
- Document all public APIs
- Include usage examples
- Document parameters and return values
- Note any side effects
- Explain complex algorithms

### API Documentation
- Endpoint URL and method
- Authentication requirements
- Request parameters
- Request body schema
- Response format
- Error responses
- Usage examples

## Review Checklist

Before submitting code:
- [ ] Code follows naming conventions
- [ ] Functions are small and focused
- [ ] Error handling is comprehensive
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No hardcoded secrets
- [ ] Security best practices followed
- [ ] Performance considerations addressed
- [ ] Code is properly formatted
- [ ] Comments explain why, not what

## Continuous Improvement

These standards are living documents:
- Review and update regularly
- Incorporate team feedback
- Adapt to new best practices
- Learn from code reviews
- Share knowledge and improvements
