---
description: 'Refactoring prompts for code improvement, design patterns, SOLID principles, and modernizing legacy code systematically.'
mode: 'ask'
tools: ['read/readFile', 'edit/replaceString', 'search/codebase', 'search/usages']
---

# Refactoring Prompts

## General Refactoring

### Comprehensive Refactoring
```
Please refactor this code to improve quality:

[CODE SNIPPET]

Goals:
1. Improve readability
2. Reduce complexity
3. Follow SOLID principles
4. Remove code duplication
5. Enhance testability
6. Maintain current functionality

Provide refactored code with explanation of changes.
```

### Legacy Code Modernization
```
Modernize this legacy code:

[LEGACY CODE]

Context:
- Current language version: [VERSION]
- Target language version: [VERSION]
- Frameworks in use: [FRAMEWORKS]

Please:
1. Update to modern syntax
2. Apply current best practices
3. Improve error handling
4. Add type safety where applicable
5. Update deprecated APIs
```

## Specific Refactoring Patterns

### Extract Method
```
This function is too long and complex:

[LONG FUNCTION]

Please:
1. Break it into smaller, focused functions
2. Use descriptive names for extracted functions
3. Maintain the same behavior
4. Add comments explaining the structure
```

### Extract Class
```
This class has too many responsibilities:

[LARGE CLASS]

Please:
1. Identify separate concerns
2. Extract new classes with single responsibilities
3. Show the refactored class structure
4. Explain the separation rationale
```

### Remove Code Duplication
```
These code sections have duplication:

[CODE SNIPPET 1]
[CODE SNIPPET 2]

Please:
1. Identify the common logic
2. Extract it into reusable functions/classes
3. Show refactored code for both sections
4. Ensure DRY principle adherence
```

### Simplify Conditional Logic
```
Simplify this complex conditional:

[COMPLEX IF/ELSE OR SWITCH]

Please:
1. Reduce nesting
2. Apply early returns where appropriate
3. Consider using polymorphism if suitable
4. Extract conditions to named variables/functions
```

### Replace Magic Numbers
```
Replace magic numbers with constants:

[CODE WITH MAGIC NUMBERS]

Please:
1. Identify all magic numbers
2. Create appropriately named constants
3. Provide refactored code
4. Suggest where to place constants
```

## Design Pattern Refactoring

### Apply Strategy Pattern
```
Refactor this conditional logic using Strategy pattern:

[CODE WITH MULTIPLE CONDITIONS]

Context: [DESCRIPTION]

Please:
1. Define strategy interface
2. Create concrete strategies
3. Show refactored client code
4. Explain when to use each strategy
```

### Apply Factory Pattern
```
Refactor object creation using Factory pattern:

[OBJECT CREATION CODE]

Please:
1. Create factory class/method
2. Encapsulate creation logic
3. Show usage examples
4. Explain benefits
```

### Apply Observer Pattern
```
Refactor this tight coupling using Observer pattern:

[COUPLED CODE]

Please:
1. Define observer interface
2. Create subject class
3. Show observer implementations
4. Demonstrate decoupled interaction
```

### Apply Dependency Injection
```
Refactor to use dependency injection:

[TIGHTLY COUPLED CODE]

Please:
1. Identify dependencies
2. Extract to interfaces
3. Show constructor/property injection
4. Demonstrate testing improvements
```

## Architecture Refactoring

### Layered Architecture
```
Reorganize this code into layers:

[MIXED RESPONSIBILITY CODE]

Target layers:
- Presentation
- Business Logic
- Data Access

Show:
1. Separated layer structure
2. Communication between layers
3. Benefits of separation
```

### Service Layer Introduction
```
Extract business logic into service layer:

[CONTROLLER/HANDLER WITH BUSINESS LOGIC]

Please:
1. Create service class(es)
2. Move business logic to services
3. Keep controller/handler thin
4. Show dependency injection
```

### Repository Pattern
```
Refactor data access using Repository pattern:

[DIRECT DATA ACCESS CODE]

Please:
1. Create repository interface
2. Implement concrete repository
3. Abstract database operations
4. Show usage in business logic
```

## Performance Refactoring

### Optimize Database Queries
```
Refactor for better database performance:

[CODE WITH DATABASE CALLS]

Issues:
- [KNOWN PERFORMANCE PROBLEMS]

Please:
1. Eliminate N+1 queries
2. Add appropriate eager loading
3. Optimize query structure
4. Consider caching strategies
```

### Reduce Memory Allocation
```
Optimize memory usage in this code:

[MEMORY-INTENSIVE CODE]

Please:
1. Identify unnecessary allocations
2. Use object pooling where appropriate
3. Implement proper disposal
4. Show improved version
```

### Async/Await Refactoring
```
Refactor to use async/await properly:

[SYNCHRONOUS/BLOCKING CODE]

Please:
1. Identify I/O-bound operations
2. Convert to async methods
3. Ensure proper async propagation
4. Avoid async pitfalls
```

## Testing Refactoring

### Make Code Testable
```
Refactor this code to be testable:

[UNTESTABLE CODE]

Problems:
- [TESTING DIFFICULTIES]

Please:
1. Extract dependencies
2. Remove static calls
3. Apply dependency injection
4. Show example unit tests
```

### Reduce Test Duplication
```
Refactor these tests to reduce duplication:

[TEST CODE WITH DUPLICATION]

Please:
1. Extract common setup
2. Use test fixtures/helpers
3. Parameterize similar tests
4. Maintain test clarity
```

## Code Smell Fixes

### Long Parameter List
```
Fix this long parameter list:

[METHOD WITH MANY PARAMETERS]

Please:
1. Introduce parameter object
2. Group related parameters
3. Show refactored signature
4. Update call sites
```

### Feature Envy
```
This class is too interested in another class's data:

[CODE SHOWING FEATURE ENVY]

Please:
1. Move method to appropriate class
2. Adjust responsibilities
3. Show refactored structure
```

### Data Clumps
```
These variables always appear together:

[CODE WITH DATA CLUMPS]

Please:
1. Create a class to encapsulate them
2. Replace all occurrences
3. Add relevant behavior to new class
```

### Shotgun Surgery
```
This change requires modifications in many places:

Change needed: [DESCRIPTION]
Affected files: [LIST]

Please:
1. Centralize the logic
2. Reduce coupling
3. Show refactored structure
4. Minimize future change impact
```

## Language-Specific Refactoring

### Python Refactoring
```
Refactor this Python code to be more Pythonic:

[PYTHON CODE]

Apply:
1. List/dict comprehensions
2. Context managers
3. Generators where appropriate
4. Type hints
5. Dataclasses/NamedTuples
6. Modern Python features
```

### JavaScript/TypeScript Refactoring
```
Refactor this JS/TS code using modern features:

[JS/TS CODE]

Apply:
1. Arrow functions appropriately
2. Destructuring
3. Spread/rest operators
4. Optional chaining
5. Nullish coalescing
6. Async/await
```

### C# Refactoring
```
Modernize this C# code:

[C# CODE]

Apply:
1. LINQ where appropriate
2. Expression-bodied members
3. Pattern matching
4. Nullable reference types
5. Record types
6. Modern C# features
```

## Refactoring Workflow

### Step-by-Step Refactoring
```
I need to refactor this code safely:

[CODE SNIPPET]

Please provide:
1. Initial assessment of issues
2. Prioritized list of refactorings
3. Step-by-step refactoring plan
4. Each step with before/after code
5. Testing strategy at each step
6. Final result with all improvements

Context:
- Existing tests: [YES/NO]
- Production usage: [DESCRIPTION]
- Time constraints: [IF ANY]
```

### Refactoring with Backward Compatibility
```
Refactor while maintaining backward compatibility:

[CODE SNIPPET]

Constraints:
- Must support existing clients
- API versioning: [STRATEGY]
- Deprecation timeline: [TIMELINE]

Please:
1. Show refactored design
2. Maintain old API alongside
3. Provide deprecation warnings
4. Document migration path
```
