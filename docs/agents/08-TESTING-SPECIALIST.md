# Agent 8: TESTING & QA SPECIALIST

## Role
Comprehensive testing and quality assurance

## Current Phase
Continuous (All Phases)

## Responsibilities
- Write unit tests for backend services
- Create integration tests for API endpoints
- Build E2E tests for critical user flows
- Write frontend component tests
- Create test data fixtures
- Implement test automation
- Perform code coverage analysis
- Conduct performance testing
- Run security testing
- Create testing documentation

## Deliverables by Phase

### Phase 2 (Weeks 2-4)
- [ ] Backend unit tests (services, utilities)
- [ ] API integration tests
- [ ] Test fixtures and factories
- [ ] CI test automation setup
- [ ] Code coverage reports (>80%)

### Phase 4 (Weeks 6-9)
- [ ] Frontend component tests
- [ ] E2E tests for critical flows
- [ ] Accessibility tests
- [ ] Cross-browser testing

### Phase 5 (Weeks 9-10)
- [ ] Integration testing
- [ ] Performance testing
- [ ] Security testing (OWASP)
- [ ] Load testing

## Directory Structure
```
backend/tests/
├── unit/
│   ├── services/
│   │   ├── patients.service.test.js
│   │   ├── visits.service.test.js
│   │   └── billing.service.test.js
│   ├── utils/
│   └── auth/
├── integration/
│   ├── auth.test.js
│   ├── patients.test.js
│   ├── visits.test.js
│   └── billing.test.js
├── fixtures/
│   ├── users.js
│   ├── patients.js
│   └── visits.js
└── setup.js

frontend/tests/
├── unit/
│   └── components/
├── integration/
└── e2e/
    └── cypress/
```

## Testing Framework Setup

### Backend (Jest + Supertest)
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "@types/jest": "^29.5.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration"
  }
}
```

### Frontend (Vitest + React Testing Library + Cypress)
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "cypress": "^13.6.0"
  }
}
```

## Unit Test Example
```javascript
// tests/unit/services/patients.service.test.js
const patientsService = require('../../../src/services/patients.service');
const { Patient } = require('../../../src/models');

jest.mock('../../../src/models');

describe('Patients Service', () => {
  describe('findAll', () => {
    it('should return paginated patients', async () => {
      const mockPatients = [
        { id: '1', first_name: 'John', last_name: 'Doe' },
        { id: '2', first_name: 'Jane', last_name: 'Smith' }
      ];

      Patient.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockPatients
      });

      const result = await patientsService.findAll({
        page: 1,
        limit: 20
      });

      expect(result.patients).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(Patient.findAndCountAll).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      await patientsService.findAll({
        page: 1,
        limit: 20,
        search: 'John'
      });

      expect(Patient.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [expect.any(Symbol)]: expect.any(Array)
          })
        })
      );
    });
  });

  describe('create', () => {
    it('should create a new patient', async () => {
      const patientData = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        email: 'john@example.com'
      };

      const mockPatient = { id: '1', ...patientData };
      Patient.create.mockResolvedValue(mockPatient);

      const result = await patientsService.create(patientData);

      expect(result).toEqual(mockPatient);
      expect(Patient.create).toHaveBeenCalledWith(patientData);
    });
  });
});
```

## Integration Test Example
```javascript
// tests/integration/patients.test.js
const request = require('supertest');
const app = require('../../src/server');
const { sequelize } = require('../../src/models');

describe('Patients API', () => {
  let authToken;
  let testPatient;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    // Create test user and get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' });
    authToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/patients', () => {
    it('should create a new patient', async () => {
      const patientData = {
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-01',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.patient.first_name).toBe('John');
      testPatient = res.body.data.patient;
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/patients')
        .send({ first_name: 'Test' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ first_name: 'John' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/patients', () => {
    it('should list patients with pagination', async () => {
      const res = await request(app)
        .get('/api/patients?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });
  });
});
```

## Component Test Example
```javascript
// frontend/tests/unit/components/PatientCard.test.jsx
import { render, screen } from '@testing-library/react';
import { PatientCard } from '../../../src/components/patients/PatientCard';

describe('PatientCard', () => {
  const mockPatient = {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    date_of_birth: '1990-01-01',
    email: 'john@example.com'
  };

  it('renders patient information', () => {
    render(<PatientCard patient={mockPatient} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('handles missing email gracefully', () => {
    const patientWithoutEmail = { ...mockPatient, email: null };
    render(<PatientCard patient={patientWithoutEmail} />);

    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  });
});
```

## E2E Test Example
```javascript
// frontend/tests/e2e/cypress/e2e/patient-management.cy.js
describe('Patient Management', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin123!');
  });

  it('should create a new patient', () => {
    cy.visit('/patients/new');

    cy.get('[name="first_name"]').type('John');
    cy.get('[name="last_name"]').type('Doe');
    cy.get('[name="date_of_birth"]').type('1990-01-01');
    cy.get('[name="email"]').type('john@example.com');

    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/patients/');
    cy.contains('Patient created successfully');
  });

  it('should validate form fields', () => {
    cy.visit('/patients/new');

    cy.get('button[type="submit"]').click();

    cy.contains('First name is required');
    cy.contains('Last name is required');
  });
});
```

## Test Fixtures
```javascript
// tests/fixtures/patients.js
const { faker } = require('@faker-js/faker');

const createPatient = (overrides = {}) => ({
  id: faker.string.uuid(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  date_of_birth: faker.date.past({ years: 50 }),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  ...overrides
});

const createManyPatients = (count = 10) => {
  return Array.from({ length: count }, () => createPatient());
};

module.exports = { createPatient, createManyPatients };
```

## Coverage Requirements
- Overall coverage: >80%
- Critical paths: 100%
- Services: >90%
- Controllers: >85%
- Utilities: >90%

## Test Categories

### Unit Tests
- Service layer logic
- Utility functions
- Data transformations
- Validation logic

### Integration Tests
- API endpoints
- Database operations
- Authentication/authorization
- Error handling

### E2E Tests
- User login flow
- Create/edit patient
- Create visit
- Generate invoice
- Admin user management

### Performance Tests
- API response times
- Database query performance
- Concurrent user handling
- Load testing (100 concurrent users)

## CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Current Status
🔄 Continuous across all phases

## Dependencies
All agents - test their deliverables
