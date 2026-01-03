# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NutriVault is a secure nutrition practice management system for dietitians to manage patients, visits, billing, and audit logging with role-based access control. Built with Node.js/Express backend, React frontend, and Sequelize ORM supporting both SQLite (development) and PostgreSQL (production).

## Common Commands

### Database Management

```bash
# Run migrations (creates/updates database schema)
npm run db:migrate

# Seed database with initial data (roles, permissions, admin user)
npm run db:seed

# Complete database reset (undo all, migrate, seed)
npm run db:reset

# Undo last migration
npm run db:migrate:undo

# Undo all seeders
npm run db:seed:undo
```

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development server (auto-reload)
npm run dev

# Start production server
npm start

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run lint:fix
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Linting
npm run lint
```

### Database Verification

```bash
# Verify database setup and integrity
node utils/verify-database.js

# Access SQLite database directly
sqlite3 backend/data/nutrivault_dev.db
```

### Docker

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

## Architecture Overview

### Database Layer

**Location**: Root-level `/models/`, `/migrations/`, `/seeders/`

**Important**: The Sequelize configuration uses **root-level paths** defined in `.sequelizerc`:
- Models: `/models/` (NOT `/backend/models/` or `/backend/src/models/`)
- Migrations: `/migrations/`
- Seeders: `/seeders/`
- Config: `/config/database.js`

**Database Models (11 total)**:
1. **Role** - User roles (ADMIN, DIETITIAN, ASSISTANT, VIEWER)
2. **Permission** - Granular permissions (29 total: patients.create, patients.read, etc.)
3. **RolePermission** - Many-to-many junction table
4. **User** - System users with authentication
5. **Patient** - Patient demographics and medical info
6. **Visit** - Patient appointments and consultations
7. **VisitMeasurement** - Vitals, BMI, blood pressure per visit
8. **Billing** - Invoices and payments
9. **AuditLog** - Comprehensive audit trail for all operations
10. **RefreshToken** - JWT refresh token management
11. **ApiKey** - API key authentication

**Model Relationships**:
- User → Role (many-to-one)
- Role ↔ Permission (many-to-many via RolePermission)
- Patient → User (assigned dietitian)
- Visit → Patient, Visit → User (dietitian)
- Visit → VisitMeasurement (one-to-many)
- Billing → Patient, Billing → Visit
- All models track created_by/updated_by → User

**Using Models in Code**:
```javascript
const db = require('./models');  // From root directory
const db = require('../models'); // From backend/src/

// Models available: db.User, db.Role, db.Permission, db.Patient, etc.
```

### Backend Structure

**Location**: `/backend/src/`

**Planned directories** (Phase 2+):
- `auth/` - Authentication logic (JWT, API keys)
- `config/` - Application configuration
- `controllers/` - Request handlers
- `middleware/` - Custom middleware (auth, RBAC, logging, validation)
- `routes/` - API route definitions
- `services/` - Business logic layer
- `utils/` - Utility functions

**Important**: Backend code goes in `/backend/src/`, but database models are at root `/models/`.

### Authentication & Authorization

**Role-Based Access Control (RBAC)**:
- **ADMIN**: Full system access (29 permissions)
- **DIETITIAN**: Manage assigned patients, visits, billing (16 permissions)
- **ASSISTANT**: Limited access - read patients/visits/billing, create visits/billing (9 permissions)
- **VIEWER**: Read-only access (6 permissions)

**Permission Format**: `resource.action` (e.g., `patients.create`, `billing.read`)

**Default Admin User** (created by seeders):
- Username: `admin`
- Password: `Admin123!`
- Email: `admin@nutrivault.local`
- Role: ADMIN

### Audit Logging

All CRUD operations, authentication events, and authorization failures are logged to the `audit_logs` table with:
- User identification (user_id, username)
- Action type (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
- Resource identification (resource_type, resource_id)
- Request metadata (ip_address, user_agent, request_method, request_path)
- Changes tracking (before/after values in JSON format)
- Status and severity levels

### SQLite vs PostgreSQL

**Development**: SQLite database at `backend/data/nutrivault_dev.db` (auto-created on first migration)

**Production**: PostgreSQL (set `NODE_ENV=production` and configure DB_HOST, DB_NAME, etc.)

**Migration Compatibility**: All migrations are designed to work with both SQLite and PostgreSQL:
- UUIDs: Stored as TEXT in SQLite, UUID type in PostgreSQL
- JSON fields: TEXT in SQLite, JSONB in PostgreSQL
- Booleans: TINYINT(1) in SQLite, BOOLEAN in PostgreSQL

## Key Configuration Files

### Environment Variables

**Backend** (`/backend/.env`):
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 3001)
- `DB_DIALECT` - sqlite or postgres
- `DB_STORAGE` - SQLite file path (development only)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL (production)
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET` - Must be changed in production
- `BCRYPT_ROUNDS` - Password hashing cost (default: 12)
- `LOG_LEVEL` - info/debug/error

**Frontend** (`/frontend/.env`):
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)
- `VITE_ENV` - development/production

### Sequelize Configuration

**File**: `/config/database.js`

Defines connection settings for development (SQLite), test (in-memory), and production (PostgreSQL) environments.

**File**: `/.sequelizerc`

Configures Sequelize CLI paths - points to root-level directories, not backend subdirectories.

## Development Workflow

### Adding a New Feature

1. **Database changes**:
   - Create migration: `cd migrations && create new file with timestamp`
   - Run migration: `npm run db:migrate`
   - Create/update models in `/models/`

2. **Backend API**:
   - Add route in `/backend/src/routes/`
   - Add controller in `/backend/src/controllers/`
   - Add business logic in `/backend/src/services/`
   - Add middleware if needed (auth, validation)
   - Add audit logging for CRUD operations

3. **Frontend**:
   - Add components in `/frontend/src/components/`
   - Add pages in `/frontend/src/pages/`
   - Add API service calls in `/frontend/src/services/`
   - Update state management if needed

4. **Testing**:
   - Write backend tests in `/backend/tests/`
   - Write frontend tests in `/frontend/tests/`
   - Run `npm test` to verify

### Creating Database Migrations

**Important**: Migrations are at `/migrations/`, not `/backend/migrations/`

**Naming convention**: `YYYYMMDDHHMMSS-description.js`

**Template**:
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_name', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      // ... fields
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('table_name', ['field_name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('table_name');
  }
};
```

**Must support both SQLite and PostgreSQL** - use Sequelize abstractions, avoid database-specific SQL.

### Creating Seeders

**Location**: `/seeders/`

**Naming convention**: `YYYYMMDDHHMMSS-description.js`

Use for initial data (roles, permissions) and test data. Always check for existing records before inserting to avoid duplicates.

## Multi-Agent Development Notes

This project was designed using a **10-agent collaborative approach**:
1. Project Architect - System design
2. Backend Developer - API development
3. Database Specialist - Database layer (Phase 1 complete)
4. Security Specialist - Auth/RBAC
5. Frontend Developer - React UI
6. UI/UX Specialist - Design
7. Audit Logger - Logging infrastructure
8. Testing Specialist - QA
9. DevOps Specialist - Infrastructure (Phase 1 complete)
10. Documentation Specialist - Docs

**Current Status**: Phase 1 complete (foundation), Phase 2+ in progress

See `/NUTRIVAULT_SPECIFICATION.md` for complete multi-agent workflow details.

## Security Considerations

- **Never commit** `.env` files (use `.env.example` templates)
- **Change default secrets** before production deployment
- **Password requirements**: Min 8 chars, uppercase, lowercase, number, special char
- **Password hashing**: bcrypt with cost factor 12+
- **JWT tokens**: Access tokens expire in 15-30 minutes, refresh tokens in 7-30 days
- **Rate limiting**: Implemented on all endpoints
- **Audit logging**: All sensitive operations must be logged
- **Input validation**: Use express-validator on all endpoints
- **HTTPS only** in production

## Testing

**Backend tests**: Use Jest, located in `/backend/tests/`
- Unit tests for services and utilities
- Integration tests for API endpoints
- Target: >80% code coverage

**Frontend tests**: React Testing Library, located in `/frontend/tests/`
- Component tests
- E2E tests for critical flows

**Database tests**: Seeders provide test data, use in-memory SQLite for tests

## Troubleshooting

### Database Issues

**Problem**: "Database locked" error
- **Solution**: Close all database connections, restart server

**Problem**: Migration fails
- **Solution**: `npm run db:migrate:undo`, fix migration, retry

**Problem**: Seed data duplicates
- **Solution**: `npm run db:seed:undo`, then `npm run db:seed`

**Problem**: Can't find models
- **Solution**: Verify you're requiring from correct path: `require('./models')` from root or `require('../models')` from backend/src/

### Module Path Issues

**Problem**: Models not loading
- **Solution**: Check `.sequelizerc` - paths should be relative to root directory
- Models are at `/models/`, NOT `/backend/src/models/`

## Documentation

- **Full specification**: `/NUTRIVAULT_SPECIFICATION.md`
- **Database setup**: `/DATABASE_SETUP_SUMMARY.md`
- **DevOps setup**: `/PHASE1_DEVOPS_COMPLETE.md`
- **Development setup**: `/docs/setup/DEVELOPMENT_SETUP.md`
- **API documentation**: `/docs/api/` (to be created)
- **Agent status**: `/docs/agents/AGENT-STATUS.md`

## Important Notes

1. **Root-level models directory**: Unlike typical Node.js projects, Sequelize models are in `/models/` at root level, not inside `/backend/`. This is configured in `.sequelizerc`.

2. **Database file location**: SQLite database is at `backend/data/nutrivault_dev.db`, but migrations/models are at root level.

3. **Environment-specific behavior**: Application uses SQLite for development (zero configuration) and PostgreSQL for production (requires configuration).

4. **Default credentials**: After seeding, use `admin`/`Admin123!` to log in. Change these before production.

5. **Migration order matters**: Migrations must run in chronological order. Foreign key dependencies require parent tables to exist first.

6. **Audit everything**: All CRUD operations on sensitive data (patients, visits, billing, users) must be logged to audit_logs table.
