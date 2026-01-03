# Agent 2: BACKEND DEVELOPER

## Role
Core API development and business logic implementation

## Current Phase
Phase 2: Backend Core (Standby - starts after Phase 1)

## Responsibilities
- Implement Express.js server setup
- Build RESTful API endpoints
- Implement business logic and controllers
- Create service layer for data operations
- Implement middleware (authentication, authorization, logging)
- Handle error management
- Write API integration tests
- Optimize database queries

## Phase 2 Deliverables (Weeks 2-4)
- [ ] Express server setup with basic middleware
- [ ] User management endpoints (CRUD)
- [ ] Patient management endpoints (CRUD)
- [ ] Visit management endpoints (CRUD)
- [ ] Billing endpoints (CRUD)
- [ ] Error handling middleware
- [ ] Request validation middleware
- [ ] Integration tests for all endpoints

## Phase 3 Deliverables (Weeks 4-6)
- [ ] Advanced filtering and search
- [ ] Pagination implementation
- [ ] Reporting endpoints
- [ ] File upload capability
- [ ] Data export functionality
- [ ] Performance optimization

## Directory Structure
```
backend/src/
├── routes/
│   ├── auth.routes.js
│   ├── users.routes.js
│   ├── patients.routes.js
│   ├── visits.routes.js
│   ├── billing.routes.js
│   └── index.js
├── controllers/
│   ├── auth.controller.js
│   ├── users.controller.js
│   ├── patients.controller.js
│   ├── visits.controller.js
│   └── billing.controller.js
├── services/
│   ├── users.service.js
│   ├── patients.service.js
│   ├── visits.service.js
│   └── billing.service.js
└── middleware/
    ├── errorHandler.js
    ├── validation.js
    └── asyncHandler.js
```

## Controller Pattern
```javascript
// Example: patients.controller.js
const patientsService = require('../services/patients.service');

exports.getAllPatients = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, dietitian_id } = req.query;
    const result = await patientsService.findAll({
      page,
      limit,
      search,
      dietitian_id
    });
    res.json({
      success: true,
      data: result.patients,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total
      }
    });
  } catch (error) {
    next(error);
  }
};
```

## Service Layer Pattern
```javascript
// Example: patients.service.js
const { Patient } = require('../models');
const { Op } = require('sequelize');

exports.findAll = async ({ page, limit, search, dietitian_id }) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { first_name: { [Op.like]: `%${search}%` } },
      { last_name: { [Op.like]: `%${search}%` } }
    ];
  }

  if (dietitian_id) {
    where.assigned_dietitian_id = dietitian_id;
  }

  const { count, rows } = await Patient.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']]
  });

  return {
    patients: rows,
    total: count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};
```

## API Endpoints to Implement

### Authentication (Phase 2)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh

### Users (Phase 2)
- GET /api/users
- GET /api/users/:id
- PUT /api/users/:id
- DELETE /api/users/:id

### Patients (Phase 2)
- GET /api/patients
- POST /api/patients
- GET /api/patients/:id
- PUT /api/patients/:id
- DELETE /api/patients/:id

### Visits (Phase 2)
- GET /api/visits
- POST /api/visits
- GET /api/visits/:id
- PUT /api/visits/:id
- DELETE /api/visits/:id
- POST /api/visits/:id/measurements

### Billing (Phase 2)
- GET /api/billing
- POST /api/billing
- GET /api/billing/:id
- PUT /api/billing/:id
- POST /api/billing/:id/payment

### Reporting (Phase 3)
- GET /api/reports/patient-statistics
- GET /api/reports/revenue

## Validation Strategy
Use Joi for request validation:

```javascript
const Joi = require('joi');

const patientSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().min(1).max(100).required(),
  date_of_birth: Joi.date().max('now').required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[0-9+\-() ]+$/).optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional()
});
```

## Error Handling
Centralized error handler:

```javascript
// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      details: err.details || []
    },
    timestamp: new Date().toISOString(),
    path: req.path
  });
};
```

## Dependencies with Other Agents
- **Database Specialist**: Use models and ensure proper querying
- **Security Specialist**: Integrate auth middleware
- **Audit Logger**: Log all operations
- **Testing Specialist**: Provide tests for all endpoints

## Current Status
⏸️ Standby - Waiting for Phase 1 completion

## Blockers
- Need database models from Database Specialist
- Need auth middleware from Security Specialist
- Need project structure from Project Architect
