# NutriVault - Code Style Guidelines

## Purpose
This document establishes coding standards and best practices for the NutriVault project to ensure consistency, maintainability, and quality across all codebases.

---

## Table of Contents
1. [General Principles](#general-principles)
2. [JavaScript/Node.js Standards](#javascriptnodejs-standards)
3. [React/Frontend Standards](#reactfrontend-standards)
4. [Database Standards](#database-standards)
5. [API Design Standards](#api-design-standards)
6. [File Organization](#file-organization)
7. [Naming Conventions](#naming-conventions)
8. [Documentation Standards](#documentation-standards)
9. [Error Handling](#error-handling)
10. [Security Standards](#security-standards)

---

## General Principles

### Code Quality Tenets
1. **Clarity over Cleverness**: Write code that is easy to understand, not code that is clever
2. **Consistency**: Follow established patterns throughout the codebase
3. **DRY (Don't Repeat Yourself)**: Extract reusable logic into functions/modules
4. **YAGNI (You Aren't Gonna Need It)**: Don't build features until they're needed
5. **Separation of Concerns**: Keep business logic, data access, and presentation separate

### Code Reviews
- All code must be reviewed before merging
- Use meaningful commit messages
- Keep pull requests focused and small
- Address all review comments

---

## JavaScript/Node.js Standards

### Modern JavaScript (ES6+)

#### Use Modern Features
```javascript
// ✅ GOOD: Use const/let
const userName = 'John';
let userAge = 25;

// ❌ BAD: Don't use var
var userName = 'John';
```

```javascript
// ✅ GOOD: Use arrow functions for callbacks
const users = data.map(user => user.name);

// ✅ GOOD: Use traditional functions for methods
class UserService {
  getUser(id) {
    return this.users.find(u => u.id === id);
  }
}
```

```javascript
// ✅ GOOD: Use destructuring
const { firstName, lastName } = user;
const [first, second] = array;

// ❌ BAD: Don't manually extract properties
const firstName = user.firstName;
const lastName = user.lastName;
```

```javascript
// ✅ GOOD: Use template literals
const message = `Hello, ${userName}! You are ${userAge} years old.`;

// ❌ BAD: Don't use string concatenation
const message = 'Hello, ' + userName + '! You are ' + userAge + ' years old.';
```

#### Async/Await over Callbacks
```javascript
// ✅ GOOD: Use async/await
async function getUser(id) {
  try {
    const user = await User.findByPk(id);
    return user;
  } catch (error) {
    logger.error('Error fetching user:', error);
    throw error;
  }
}

// ❌ BAD: Don't use callbacks or excessive .then() chaining
function getUser(id, callback) {
  User.findByPk(id)
    .then(user => callback(null, user))
    .catch(err => callback(err));
}
```

#### Spread Operator and Rest Parameters
```javascript
// ✅ GOOD: Use spread operator
const newUser = { ...user, age: 26 };
const allItems = [...array1, ...array2];

// ✅ GOOD: Use rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
```

### Code Organization

#### Module Structure
```javascript
// ✅ GOOD: Organize imports logically
// 1. External dependencies
const express = require('express');
const bcrypt = require('bcrypt');

// 2. Internal modules
const { User, Role } = require('../models');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

// 3. Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
```

#### Export Patterns
```javascript
// ✅ GOOD: Named exports for multiple items
module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUserById
};

// ✅ GOOD: Default export for single item
module.exports = UserService;
```

### Error Handling

#### Try-Catch for Async Operations
```javascript
// ✅ GOOD: Proper error handling
async function createPatient(data) {
  try {
    const patient = await Patient.create(data);
    logger.info(`Patient created: ${patient.id}`);
    return patient;
  } catch (error) {
    logger.error('Failed to create patient:', error);
    if (error.name === 'SequelizeValidationError') {
      throw new ValidationError(error.message);
    }
    throw new DatabaseError('Failed to create patient');
  }
}
```

#### Custom Error Classes
```javascript
// ✅ GOOD: Define custom error classes
class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}
```

### Function Guidelines

#### Keep Functions Small and Focused
```javascript
// ✅ GOOD: Small, single-purpose function
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password);
}

// ❌ BAD: Function doing too much
function validateUserInput(email, password, name, age) {
  // 50 lines of validation logic
}
```

#### Use Descriptive Parameter Names
```javascript
// ✅ GOOD: Clear parameter names
function createVisit(patientId, dietitianId, visitDate, duration) {
  // Implementation
}

// ❌ BAD: Unclear parameter names
function createVisit(p, d, date, dur) {
  // Implementation
}
```

---

## React/Frontend Standards

### Component Structure

#### Functional Components with Hooks
```javascript
// ✅ GOOD: Functional component with hooks
import React, { useState, useEffect } from 'react';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await patientService.getAll();
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="patient-list">
      {patients.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}

export default PatientList;
```

#### Props Destructuring
```javascript
// ✅ GOOD: Destructure props
function PatientCard({ patient, onEdit, onDelete }) {
  return (
    <div className="patient-card">
      <h3>{patient.firstName} {patient.lastName}</h3>
      <button onClick={() => onEdit(patient.id)}>Edit</button>
      <button onClick={() => onDelete(patient.id)}>Delete</button>
    </div>
  );
}

// ❌ BAD: Don't use props object directly
function PatientCard(props) {
  return (
    <div className="patient-card">
      <h3>{props.patient.firstName} {props.patient.lastName}</h3>
      <button onClick={() => props.onEdit(props.patient.id)}>Edit</button>
    </div>
  );
}
```

### Component Organization

#### Container/Presentational Pattern
```javascript
// ✅ GOOD: Separate container and presentational components

// PatientListContainer.jsx (Smart Component)
import React, { useState, useEffect } from 'react';
import PatientListView from './PatientListView';
import patientService from '../../services/patientService';

function PatientListContainer() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    const data = await patientService.getAll();
    setPatients(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await patientService.delete(id);
    await loadPatients();
  };

  return (
    <PatientListView
      patients={patients}
      loading={loading}
      onDelete={handleDelete}
    />
  );
}

// PatientListView.jsx (Presentational Component)
function PatientListView({ patients, loading, onDelete }) {
  if (loading) return <LoadingSpinner />;

  return (
    <div className="patient-list">
      {patients.map(patient => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

### Custom Hooks
```javascript
// ✅ GOOD: Extract reusable logic into custom hooks

// usePatients.js
function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await patientService.getAll();
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return { patients, loading, error, refetch: fetchPatients };
}

// Usage in component
function PatientList() {
  const { patients, loading, error } = usePatients();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return <PatientListView patients={patients} />;
}
```

### State Management
```javascript
// ✅ GOOD: Use Redux Toolkit for global state

// patientSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import patientService from '../services/patientService';

export const fetchPatients = createAsyncThunk(
  'patients/fetchAll',
  async () => {
    const response = await patientService.getAll();
    return response.data;
  }
);

const patientSlice = createSlice({
  name: 'patients',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export default patientSlice.reducer;
```

---

## Database Standards

### Table Naming
```sql
-- ✅ GOOD: Plural, snake_case
CREATE TABLE patients (...);
CREATE TABLE visit_measurements (...);
CREATE TABLE audit_logs (...);

-- ❌ BAD: Singular, camelCase, PascalCase
CREATE TABLE Patient (...);
CREATE TABLE visitMeasurement (...);
```

### Column Naming
```sql
-- ✅ GOOD: snake_case
CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ❌ BAD: camelCase
CREATE TABLE users (
  id UUID PRIMARY KEY,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  createdAt TIMESTAMP
);
```

### Sequelize Model Definitions
```javascript
// ✅ GOOD: Proper model definition with validation
const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name',
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name',
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'email',
    validate: {
      isEmail: true
    }
  }
}, {
  tableName: 'patients',
  underscored: true,
  timestamps: true
});
```

### Migrations
```javascript
// ✅ GOOD: Use transaction and handle both up/down
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('patients', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        first_name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        // ... other fields
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      await queryInterface.addIndex('patients', ['email'], {
        name: 'idx_patients_email',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('patients');
  }
};
```

---

## API Design Standards

### REST Conventions

#### Resource Naming
```javascript
// ✅ GOOD: Plural nouns, consistent structure
GET    /api/patients           // List all patients
POST   /api/patients           // Create new patient
GET    /api/patients/:id       // Get specific patient
PUT    /api/patients/:id       // Update patient
DELETE /api/patients/:id       // Delete patient

GET    /api/patients/:id/visits     // Get patient's visits
POST   /api/visits/:id/measurements // Add measurements to visit

// ❌ BAD: Verbs, inconsistent
GET /api/getAllPatients
POST /api/createPatient
GET /api/patient/:id
```

#### Response Format
```javascript
// ✅ GOOD: Consistent response structure
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe"
  },
  "message": "Patient created successfully",
  "timestamp": "2026-01-03T10:30:45.123Z"
}

// ✅ GOOD: Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-01-03T10:30:45.123Z",
  "path": "/api/patients"
}
```

### Controller Structure
```javascript
// ✅ GOOD: Clean controller with service layer
const patientService = require('../services/patientService');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

exports.createPatient = async (req, res, next) => {
  try {
    // 1. Validate input (done by middleware)
    // 2. Call service layer
    const patient = await patientService.create(req.body, req.user.id);

    // 3. Log action
    logger.info(`Patient created: ${patient.id} by user: ${req.user.id}`);

    // 4. Return response
    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // 5. Pass error to error handler middleware
    next(error);
  }
};
```

### Service Layer Pattern
```javascript
// ✅ GOOD: Business logic in service layer
const { Patient } = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');
const auditService = require('./auditService');

class PatientService {
  async create(patientData, userId) {
    // Validate business rules
    if (await this.emailExists(patientData.email)) {
      throw new ValidationError('Email already exists');
    }

    // Create patient
    const patient = await Patient.create({
      ...patientData,
      createdBy: userId,
      updatedBy: userId
    });

    // Audit log
    await auditService.log({
      action: 'CREATE',
      resourceType: 'patient',
      resourceId: patient.id,
      userId,
      changes: { after: patient.toJSON() }
    });

    return patient;
  }

  async getById(id) {
    const patient = await Patient.findByPk(id);
    if (!patient) {
      throw new NotFoundError('Patient');
    }
    return patient;
  }

  async emailExists(email) {
    const count = await Patient.count({ where: { email } });
    return count > 0;
  }
}

module.exports = new PatientService();
```

---

## File Organization

### Backend Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Database configuration
│   │   ├── sequelize.js         # Sequelize instance
│   │   └── app.js               # Express app configuration
│   ├── models/
│   │   ├── index.js             # Model aggregator
│   │   ├── User.js              # User model
│   │   └── Patient.js           # Patient model
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── authRoutes.js        # Auth routes
│   │   └── patientRoutes.js     # Patient routes
│   ├── controllers/
│   │   ├── authController.js    # Auth controller
│   │   └── patientController.js # Patient controller
│   ├── services/
│   │   ├── patientService.js    # Patient business logic
│   │   ├── authService.js       # Auth business logic
│   │   └── auditService.js      # Audit logging service
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── rbac.js              # Authorization middleware
│   │   ├── validation.js        # Validation middleware
│   │   └── errorHandler.js      # Error handling middleware
│   ├── utils/
│   │   ├── logger.js            # Winston logger
│   │   ├── errors.js            # Custom error classes
│   │   └── helpers.js           # Helper functions
│   └── server.js                # Server entry point
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/              # Reusable components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   └── Modal.jsx
│   │   ├── patients/            # Patient-specific components
│   │   │   ├── PatientCard.jsx
│   │   │   └── PatientForm.jsx
│   │   └── layout/              # Layout components
│   │       ├── Header.jsx
│   │       ├── Sidebar.jsx
│   │       └── Footer.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── PatientList.jsx
│   │   └── Login.jsx
│   ├── services/
│   │   ├── api.js               # Axios configuration
│   │   ├── patientService.js    # Patient API calls
│   │   └── authService.js       # Auth API calls
│   ├── store/
│   │   ├── index.js             # Redux store
│   │   ├── patientSlice.js      # Patient slice
│   │   └── authSlice.js         # Auth slice
│   ├── hooks/
│   │   ├── usePatients.js       # Custom patient hook
│   │   └── useAuth.js           # Custom auth hook
│   ├── utils/
│   │   ├── validation.js        # Validation helpers
│   │   └── formatting.js        # Formatting helpers
│   └── App.jsx                  # Main App component
```

---

## Naming Conventions

### JavaScript Variables and Functions
```javascript
// ✅ GOOD: camelCase for variables and functions
const patientCount = 10;
const isActive = true;
function getUserById(id) {}
async function fetchPatients() {}

// ❌ BAD: snake_case or PascalCase for variables
const patient_count = 10;
const IsActive = true;
```

### Classes
```javascript
// ✅ GOOD: PascalCase for classes
class PatientService {}
class ValidationError extends Error {}

// ❌ BAD: camelCase for classes
class patientService {}
```

### Constants
```javascript
// ✅ GOOD: SCREAMING_SNAKE_CASE for constants
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_SECRET = process.env.JWT_SECRET;
const API_BASE_URL = 'https://api.example.com';

// ✅ ACCEPTABLE: camelCase for config objects
const config = {
  maxLoginAttempts: 5,
  jwtSecret: process.env.JWT_SECRET
};
```

### Files
```javascript
// ✅ GOOD: camelCase for service/utility files
patientService.js
authMiddleware.js
logger.js

// ✅ GOOD: PascalCase for component files
PatientCard.jsx
LoginForm.jsx
Dashboard.jsx

// ✅ GOOD: kebab-case for route files
patient-routes.js
auth-routes.js
```

---

## Documentation Standards

### Code Comments
```javascript
// ✅ GOOD: Explain WHY, not WHAT
// Check if account is locked before allowing login
// This prevents brute force attacks
if (user.lockedUntil && user.lockedUntil > new Date()) {
  throw new AccountLockedError();
}

// ❌ BAD: Comments that state the obvious
// Check if locked until is greater than now
if (user.lockedUntil && user.lockedUntil > new Date()) {
  throw new AccountLockedError();
}
```

### Function Documentation
```javascript
/**
 * Creates a new patient record with audit logging
 *
 * @param {Object} patientData - Patient information
 * @param {string} patientData.firstName - Patient's first name
 * @param {string} patientData.lastName - Patient's last name
 * @param {string} patientData.email - Patient's email address
 * @param {string} userId - ID of user creating the patient
 * @returns {Promise<Object>} Created patient object
 * @throws {ValidationError} If patient data is invalid
 * @throws {DatabaseError} If database operation fails
 *
 * @example
 * const patient = await patientService.create({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john@example.com'
 * }, userId);
 */
async function createPatient(patientData, userId) {
  // Implementation
}
```

---

## Error Handling

### Custom Error Classes
```javascript
// Define all custom errors in utils/errors.js
class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}
```

### Centralized Error Handler
```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

module.exports = (error, req, res, next) => {
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    user: req.user?.id
  });

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: {
      code: error.name || 'INTERNAL_SERVER_ERROR',
      message: error.message,
      ...(error.details && { details: error.details })
    },
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    response.error.message = 'An unexpected error occurred';
  }

  res.status(statusCode).json(response);
};
```

---

## Security Standards

### Input Validation
```javascript
// ✅ GOOD: Validate all inputs
const Joi = require('joi');

const patientSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().optional(),
  dateOfBirth: Joi.date().max('now').required()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));
      return next(new ValidationError('Validation failed', details));
    }
    next();
  };
};
```

### Password Security
```javascript
// ✅ GOOD: Hash passwords with bcrypt
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### SQL Injection Prevention
```javascript
// ✅ GOOD: Use parameterized queries (Sequelize handles this)
const patients = await Patient.findAll({
  where: { firstName: req.query.name }
});

// ❌ NEVER: Don't build raw SQL strings
const query = `SELECT * FROM patients WHERE first_name = '${req.query.name}'`;
```

---

## Testing Standards

### Unit Test Structure
```javascript
// ✅ GOOD: Clear test structure with describe/it
const { createPatient } = require('../services/patientService');

describe('PatientService', () => {
  describe('createPatient', () => {
    it('should create a patient with valid data', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      const patient = await createPatient(patientData, userId);

      expect(patient).toBeDefined();
      expect(patient.firstName).toBe('John');
      expect(patient.email).toBe('john@example.com');
    });

    it('should throw ValidationError for invalid email', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email'
      };

      await expect(createPatient(patientData, userId))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

---

## Enforcement

### ESLint Configuration
- All projects must use ESLint with the provided configuration
- Run ESLint before committing code
- Fix all linting errors before code review

### Code Review Checklist
- [ ] Follows naming conventions
- [ ] Proper error handling
- [ ] Includes necessary comments
- [ ] Has unit tests
- [ ] No security vulnerabilities
- [ ] Follows project structure
- [ ] Consistent with existing code

---

**Version**: 1.0
**Last Updated**: January 3, 2026
**Maintained By**: Agent 1 - Project Architect
**Review Date**: April 3, 2026
