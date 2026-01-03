# Agent 10: DOCUMENTATION SPECIALIST

## Role
Comprehensive project documentation

## Current Phase
Continuous (All Phases)

## Responsibilities
- Create API documentation (Swagger/OpenAPI)
- Write developer setup guides
- Create user manuals
- Write admin guides
- Document database schema
- Create code documentation
- Maintain README files
- Write deployment guides
- Create troubleshooting guides
- Document best practices

## Deliverables by Phase

### Phase 1 (Weeks 1-2)
- [ ] Project README.md
- [ ] Backend README.md
- [ ] Frontend README.md
- [ ] Developer setup guide
- [ ] Contributing guidelines
- [ ] Code of conduct

### Phase 2-3 (Weeks 2-6)
- [ ] API documentation (Swagger)
- [ ] Database schema documentation
- [ ] Architecture documentation
- [ ] Code comments and JSDoc

### Phase 4 (Weeks 6-9)
- [ ] Component documentation
- [ ] User interface guide
- [ ] State management documentation

### Phase 6 (Weeks 10-12)
- [ ] Deployment guide
- [ ] User manual
- [ ] Admin guide
- [ ] Troubleshooting guide
- [ ] Security best practices
- [ ] Maintenance guide

## Documentation Structure
```
docs/
├── README.md                   # Documentation index
├── setup/
│   ├── developer-setup.md      # Local dev setup
│   ├── production-setup.md     # Production deployment
│   └── database-setup.md       # Database configuration
├── api/
│   ├── authentication.md       # Auth endpoints
│   ├── patients.md             # Patient endpoints
│   ├── visits.md               # Visit endpoints
│   ├── billing.md              # Billing endpoints
│   └── swagger.json            # OpenAPI spec
├── database/
│   ├── schema.md               # Database schema
│   ├── migrations.md           # Migration guide
│   └── erd.md                  # Entity relationship diagram
├── architecture/
│   ├── overview.md             # System architecture
│   ├── backend.md              # Backend architecture
│   ├── frontend.md             # Frontend architecture
│   └── security.md             # Security architecture
├── user-guide/
│   ├── getting-started.md      # User onboarding
│   ├── patient-management.md   # Managing patients
│   ├── visit-management.md     # Managing visits
│   └── billing.md              # Billing operations
├── admin-guide/
│   ├── user-management.md      # Managing users
│   ├── roles-permissions.md    # RBAC configuration
│   ├── audit-logs.md           # Viewing audit logs
│   └── backups.md              # Backup procedures
└── troubleshooting/
    ├── common-issues.md        # FAQ and common problems
    ├── error-codes.md          # Error code reference
    └── debugging.md            # Debugging guide
```

## Project README Template
```markdown
# NutriVault

**Your complete nutrition practice management system**

A comprehensive web application for dietitians to manage patient data, appointments, billing, and visit records.

## Features

- **Patient Management**: Complete patient profiles with medical history
- **Visit Tracking**: Schedule and document patient visits with measurements
- **Billing**: Invoice generation and payment tracking
- **User Management**: Role-based access control (Admin, Dietitian, Assistant, Viewer)
- **Audit Logging**: Comprehensive audit trail for compliance
- **Reports**: Patient statistics and revenue reports

## Tech Stack

- **Backend**: Node.js, Express.js, Sequelize
- **Frontend**: React 18, Redux Toolkit, Bootstrap 5
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: JWT with refresh tokens

## Quick Start

### Prerequisites
- Node.js 18+
- Git

### Installation

1. Clone the repository
\`\`\`bash
git clone <repo-url>
cd dietitian-app
\`\`\`

2. Backend setup
\`\`\`bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
\`\`\`

3. Frontend setup (in a new terminal)
\`\`\`bash
cd frontend
npm install
cp .env.example .env
npm start
\`\`\`

4. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

### Default Login
- Username: `admin`
- Password: `Admin123!`

## Documentation

- [Developer Setup Guide](docs/setup/developer-setup.md)
- [API Documentation](docs/api/)
- [User Manual](docs/user-guide/)
- [Admin Guide](docs/admin-guide/)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.
```

## API Documentation (Swagger)

### Setup Swagger
```javascript
// server.js
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NutriVault API',
      version: '1.0.0',
      description: 'Complete nutrition practice management system API',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Endpoint Documentation Example
```javascript
/**
 * @swagger
 * /patients:
 *   get:
 *     summary: List all patients
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for patient name
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Patient:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - date_of_birth
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         first_name:
 *           type: string
 *           maxLength: 100
 *         last_name:
 *           type: string
 *           maxLength: 100
 *         date_of_birth:
 *           type: string
 *           format: date
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 */
```

## JSDoc Example
```javascript
/**
 * Create a new patient
 * @param {Object} patientData - Patient information
 * @param {string} patientData.first_name - Patient's first name
 * @param {string} patientData.last_name - Patient's last name
 * @param {Date} patientData.date_of_birth - Patient's date of birth
 * @param {string} [patientData.email] - Patient's email address
 * @param {Object} user - Current authenticated user
 * @returns {Promise<Object>} Created patient object
 * @throws {ValidationError} If required fields are missing
 * @throws {DatabaseError} If database operation fails
 */
async function createPatient(patientData, user) {
  // Implementation
}
```

## Database Schema Documentation
```markdown
# Database Schema

## Users Table

Stores user accounts and authentication information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Login username |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| first_name | VARCHAR(100) | NOT NULL | User's first name |
| last_name | VARCHAR(100) | NOT NULL | User's last name |
| role_id | UUID | FOREIGN KEY | Reference to roles table |
| is_active | BOOLEAN | DEFAULT true | Account status |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

### Relationships
- Belongs to: Role (role_id)
- Has many: Patients (assigned_dietitian_id)
- Has many: ApiKeys (user_id)
- Has many: RefreshTokens (user_id)

### Indexes
- username (UNIQUE)
- email (UNIQUE)
- role_id
```

## User Manual Template
```markdown
# Patient Management User Guide

## Adding a New Patient

1. Navigate to **Patients** > **New Patient**
2. Fill in required information:
   - First Name *
   - Last Name *
   - Date of Birth *
3. Fill in optional information:
   - Email
   - Phone
   - Address
   - Medical notes
   - Dietary preferences
   - Allergies
4. Click **Save Patient**

### Required Fields
Fields marked with * are required.

### Tips
- Use the medical notes section to record important health information
- Document allergies clearly for safety
- Update contact information regularly

## Scheduling a Visit

1. Navigate to **Visits** > **New Visit**
2. Select the patient from the dropdown
3. Choose visit date and time
4. Enter visit duration
5. Select visit type:
   - Initial Consultation
   - Follow-up
   - Emergency
6. Click **Schedule Visit**

...
```

## Error Code Documentation
```markdown
# Error Code Reference

## Authentication Errors

### AUTH_001 - Invalid Credentials
**Cause**: Incorrect username or password
**Solution**: Verify credentials and try again
**HTTP Status**: 401

### AUTH_002 - Account Locked
**Cause**: Too many failed login attempts
**Solution**: Wait 30 minutes or contact administrator
**HTTP Status**: 403

### AUTH_003 - Token Expired
**Cause**: Access token has expired
**Solution**: Use refresh token to get new access token
**HTTP Status**: 401

...
```

## Contributing Guidelines
```markdown
# Contributing to Dietitian App

## Code Style

- Follow ESLint configuration
- Use meaningful variable names
- Write clear comments for complex logic
- Keep functions small and focused

## Commit Messages

Format: `type(scope): description`

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Test changes
- chore: Build/dependency changes

Example: `feat(patients): add search functionality`

## Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Write/update tests
4. Update documentation
5. Create pull request to `develop`
6. Wait for code review
7. Address review comments
8. Merge when approved

## Testing

- Run `npm test` before committing
- Maintain >80% code coverage
- Add tests for new features
- Update tests for changed features
```

## Current Status
🔄 Continuous across all phases

## Current Tasks
1. Create main project README
2. Create developer setup guide
3. Set up Swagger documentation structure
4. Document database schema
5. Create contributing guidelines

## Dependencies
All agents - document their deliverables
