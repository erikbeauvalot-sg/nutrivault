---
description: 'Testing prompts for unit tests, integration tests, E2E tests, test data management, and comprehensive test coverage strategies.'
mode: 'ask'
tools: ['edit/createFile', 'read/readFile', 'execute/runInTerminal', 'search/codebase']
---

# Testing Prompts

## Unit Testing

### Generate Unit Tests
```
Generate comprehensive unit tests for this code:

[CODE SNIPPET]

Requirements:
1. Test all public methods
2. Cover edge cases
3. Test error conditions
4. Use appropriate mocking
5. Follow AAA pattern (Arrange, Act, Assert)
6. Include descriptive test names

Testing framework: [FRAMEWORK]
```

### Test Edge Cases
```
Generate tests for edge cases:

Function: [FUNCTION NAME]
[FUNCTION CODE]

Please create tests for:
1. Null/undefined inputs
2. Empty collections
3. Boundary values
4. Invalid input types
5. Concurrent access (if applicable)
6. Maximum/minimum values
```

### Test Coverage Analysis
```
Analyze test coverage for this code:

[CODE SNIPPET]
[EXISTING TESTS]

Identify:
1. Uncovered code paths
2. Missing edge cases
3. Untested error conditions
4. Scenarios not yet tested
5. Provide tests to achieve >90% coverage
```

## Integration Testing

### API Integration Tests
```
Create integration tests for this API endpoint:

Endpoint: [METHOD] [URL]
[ENDPOINT CODE]

Test scenarios:
1. Successful requests
2. Invalid input validation
3. Authentication/authorization
4. Error responses
5. Rate limiting (if applicable)
6. Data persistence verification

Include setup and teardown procedures.
```

### Database Integration Tests
```
Create database integration tests:

[DATA ACCESS CODE]

Test:
1. CRUD operations
2. Transaction handling
3. Concurrent access
4. Data integrity constraints
5. Query performance
6. Connection handling

Database: [DATABASE TYPE]
Testing framework: [FRAMEWORK]
```

### External Service Integration Tests
```
Create tests for external service integration:

Service: [SERVICE NAME]
[INTEGRATION CODE]

Test:
1. Successful communication
2. Timeout handling
3. Retry logic
4. Error response handling
5. Circuit breaker behavior
6. Mock external service responses
```

## End-to-End Testing

### E2E Test Scenarios
```
Create end-to-end tests for:

Feature: [FEATURE DESCRIPTION]
User flow: [STEP-BY-STEP FLOW]

Include:
1. Happy path scenario
2. Error scenarios
3. Alternative paths
4. Browser/platform variations (if web)
5. Test data setup and cleanup

Tool: [SELENIUM/PLAYWRIGHT/CYPRESS/etc]
```

### User Journey Tests
```
Create user journey test:

Journey: [JOURNEY NAME]
Steps:
1. [STEP 1]
2. [STEP 2]
3. [STEP 3]

Test should verify:
- UI elements presence
- Data persistence across steps
- Proper error handling
- Performance within acceptable limits
```

## Test Data Management

### Test Data Builders
```
Create test data builders for:

[CLASS/MODEL DEFINITION]

Requirements:
1. Fluent API
2. Sensible defaults
3. Easy customization
4. Support for complex object graphs
5. Factory methods for common scenarios
```

### Test Fixtures
```
Create test fixtures for:

Test suite: [DESCRIPTION]
[RELEVANT CODE]

Include:
1. Setup method
2. Teardown method
3. Reusable test data
4. Database seeding (if applicable)
5. Mock configurations
```

## Mocking and Stubbing

### Create Mocks
```
Create mocks for these dependencies:

[INTERFACE/CLASS TO MOCK]

Test scenario: [DESCRIPTION]

Requirements:
1. Mock interface methods
2. Setup return values
3. Verify method calls
4. Handle different scenarios

Mocking framework: [FRAMEWORK]
```

### Stub External Dependencies
```
Create stubs for external dependencies:

Dependencies:
- [DEPENDENCY 1]
- [DEPENDENCY 2]

Test context: [DESCRIPTION]

Provide:
1. Stub implementations
2. Configuration for tests
3. Different response scenarios
4. Error simulation
```

## Performance Testing

### Load Test Scenario
```
Create load test for:

Endpoint/Function: [NAME]
Expected load: [CONCURRENT USERS/REQUESTS]
Success criteria: [RESPONSE TIME/THROUGHPUT]

Include:
1. Ramp-up strategy
2. Sustained load period
3. Performance metrics to collect
4. Pass/fail criteria

Tool: [JMeter/Gatling/k6/etc]
```

### Benchmark Tests
```
Create benchmark tests for:

[FUNCTION/ALGORITHM]

Compare:
1. Different implementations
2. Various input sizes
3. Memory usage
4. CPU utilization

Provide statistical analysis of results.
```

## Test-Driven Development

### TDD Workflow
```
Follow TDD for this feature:

Feature: [DESCRIPTION]
Requirements:
- [REQUIREMENT 1]
- [REQUIREMENT 2]

Provide:
1. Failing test first
2. Minimal implementation to pass
3. Refactoring steps
4. Next test and implementation
5. Continue until feature complete
```

### BDD Scenarios
```
Create BDD scenarios for:

Feature: [FEATURE NAME]
Stakeholder requirements: [DESCRIPTION]

Write in Gherkin format:
- Given [context]
- When [action]
- Then [outcome]

Include multiple scenarios covering main flows and edge cases.
```

## Test Organization

### Test Structure
```
Organize tests for this module:

[MODULE STRUCTURE]

Provide:
1. Test file organization
2. Test suite grouping
3. Naming conventions
4. Shared utilities location
5. Test configuration structure
```

### Test Naming Conventions
```
Review and improve test names:

[EXISTING TESTS]

Apply pattern: [pattern]
Options:
- MethodName_Scenario_ExpectedBehavior
- Should_ExpectedBehavior_When_Scenario
- Given_Precondition_When_Action_Then_Outcome

Provide renamed tests with improved clarity.
```

## Specific Testing Types

### Validation Testing
```
Create validation tests for:

[VALIDATION LOGIC]

Test:
1. All validation rules
2. Valid input scenarios
3. Invalid input scenarios
4. Validation error messages
5. Multiple validation failures
```

### Security Testing
```
Create security tests for:

[SECURITY-SENSITIVE CODE]

Test for:
1. SQL injection
2. XSS vulnerabilities
3. Authentication bypass
4. Authorization checks
5. Input sanitization
6. CSRF protection
```

### Regression Testing
```
Create regression test suite for:

Bug fixed: [BUG DESCRIPTION]
[FIX CODE]

Ensure:
1. Original bug doesn't reoccur
2. Related scenarios covered
3. Edge cases included
4. Long-term stability verified
```

## Test Maintenance

### Update Tests After Refactoring
```
Refactoring changed the implementation:

Old implementation:
[OLD CODE]

New implementation:
[NEW CODE]

Existing tests:
[TEST CODE]

Update tests to:
1. Work with new implementation
2. Maintain same coverage
3. Improve test clarity if possible
4. Remove obsolete tests
5. Add new tests for new code paths
```

### Flaky Test Fixing
```
This test is flaky:

[TEST CODE]

Symptoms:
- Fails intermittently
- Failure pattern: [DESCRIPTION]

Please:
1. Identify likely causes
2. Suggest fixes
3. Make test deterministic
4. Add proper waits/synchronization
```

## Testing Best Practices

### Test Review
```
Review these tests for quality:

[TEST CODE]

Check for:
1. Test independence
2. Clear assertions
3. Appropriate mocking
4. Readability
5. Maintainability
6. Performance
7. Best practices adherence

Provide specific improvement suggestions.
```

### Test Documentation
```
Document this test suite:

[TEST CODE]

Provide:
1. Overview of what's tested
2. Test environment requirements
3. How to run tests
4. How to interpret failures
5. Known issues/limitations
6. Maintenance guidelines
```
