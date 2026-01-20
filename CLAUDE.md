# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NutriVault is a nutrition practice management system for dietitians. Built with Node.js/Express backend and React/Vite frontend, featuring JWT authentication, role-based access control, patient management, visit tracking, billing, and document storage.

**Tech Stack:**
- Backend: Node.js, Express, Sequelize ORM, SQLite (dev) / PostgreSQL (prod)
- Frontend: React 18, Vite, React Router v6, React Bootstrap, i18next
- Auth: JWT tokens + API keys, bcrypt password hashing
- Database: 12 models with comprehensive RBAC and audit logging

## Commands

### Database (run from ROOT directory)

```bash
# Run migrations
npm run db:migrate

# Seed database (creates admin user, roles, permissions)
npm run db:seed

# Complete reset (undo all → migrate → seed)
npm run db:reset

# Undo operations
npm run db:migrate:undo
npm run db:seed:undo
```

### Backend (run from backend/ directory)

```bash
cd backend

# Development
npm run dev              # Start with nodemon (auto-reload)
npm start                # Production server

# Database (alternative from backend/)
npm run db:migrate
npm run db:seed
npm run db:reset

# Admin management
npm run admin:create
npm run admin:reset-password
```

### Frontend (run from frontend/ directory)

```bash
cd frontend

# Development
npm run dev              # Start dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build
```

### Verification

```bash
# Verify database setup
node utils/verify-database.js

# Access SQLite directly
sqlite3 backend/data/nutrivault_dev.db
```

## Critical Architecture

### Database Layer Location ⚠️

**Models are at ROOT level**, not inside `/backend/`. This is the most common source of confusion.

```javascript
// From backend/src/ files:
const db = require('../../models');

// From root directory:
const db = require('./models');

// Available models:
// db.User, db.Role, db.Permission, db.RolePermission,
// db.Patient, db.Visit, db.Billing, db.AuditLog,
// db.RefreshToken, db.ApiKey, db.Document
```

**Sequelize paths** (configured in `.sequelizerc`):
- Models: `/models/`
- Migrations: `/migrations/`
- Seeders: `/seeders/`
- Config: `/config/database.js`

**Database commands MUST run from root**, not `/backend/`.

### Backend Architecture

```
backend/src/
├── controllers/     # HTTP request/response handling
├── services/        # Business logic + audit logging
├── routes/          # API route definitions
├── middleware/      # Auth, RBAC, rate limiting, error handling
├── auth/            # JWT utilities
├── config/          # Multer, app config
└── server.js        # Express app entry point
```

**Request Flow:**
```
HTTP Request
  ↓ Morgan logging (console)
  ↓ Request logger (audit)
  ↓ Global rate limiter (500/15min)
  ↓ CORS & Helmet security
  ↓ Body parsing
  ↓ Route matching
  ↓ Endpoint rate limiter (auth: 5/15min, API: 100/15min, export: 10/hour)
  ↓ authenticate middleware (JWT or API key)
  ↓ RBAC middleware (requirePermission/requireRole)
  ↓ Controller → Service → Response
  ↓ Error handler (centralized)
```

**Service Layer Pattern:**

Controllers handle HTTP, services handle business logic:

```javascript
// Controller
async function getPatients(req, res, next) {
  try {
    const patients = await patientService.getPatients(req.user, req.query);
    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
}

// Service
async function getPatients(user, filters) {
  // Business logic, authorization checks, audit logging
  return patients;
}
```

Services are responsible for:
- Business logic validation
- Audit logging via `audit.service.js`
- Database transactions
- Complex queries
- Authorization beyond basic RBAC (e.g., assigned dietitian checks)

### Frontend Architecture

```
frontend/src/
├── pages/              # Route components (DashboardPage, PatientsPage, etc.)
├── components/         # Reusable UI components
│   └── layout/         # Layout components (MainLayout, Sidebar, Header)
├── services/           # API communication layer
├── contexts/           # React contexts (AuthContext)
├── locales/            # i18n translation files (en.json, fr.json)
└── utils/              # Helper utilities
```

**Key Patterns:**

1. **Routing** (React Router v6):
   - All routes defined in `App.jsx`
   - Protected routes wrapped with `<ProtectedRoute>`
   - Automatic redirect: authenticated → `/dashboard`, unauthenticated → `/login`

2. **Authentication State** (`AuthContext`):
   - Global auth state management
   - Token storage in localStorage
   - Automatic token refresh on 401 errors
   - Usage: `const { user, login, logout } = useAuth();`

3. **API Service Layer** (`services/api.js`):
   - Axios instance with base URL from `VITE_API_URL`
   - Request interceptor: Auto-inject `Authorization: Bearer <token>`
   - Response interceptor: Auto-refresh tokens on 401 errors
   - All API calls go through service modules (e.g., `patientService.js`, `visitService.js`)

4. **Internationalization**:
   - react-i18next with English/French support
   - Language stored in localStorage (`i18nextLng`)
   - Usage: `const { t } = useTranslation(); return <h1>{t('patients.title')}</h1>;`
   - Translation files: `frontend/src/locales/en.json`, `frontend/src/locales/fr.json`
   - **Important:** All user-facing strings must use `t()` function

### Authentication System

**Dual Authentication:**
1. **JWT Tokens**: `Authorization: Bearer <token>` header
2. **API Keys**: `x-api-key` or `api-key` header

**Authentication Flow:**
```javascript
// Middleware checks in order:
1. Extract Bearer token from Authorization header
   → Verify JWT → Load user with role/permissions
2. If no token, check for API key header
   → Validate API key → Load associated user
3. If neither exists → 401 Unauthorized
```

**Token Management:**
- Access tokens: 15-30 min expiration
- Refresh tokens: 7-30 days (stored in RefreshToken model)
- API keys: Hashed in database, optional expiration
- Frontend auto-refreshes tokens on 401 errors

**Account Security:**
- Passwords hashed with bcrypt (12+ rounds)
- Failed login tracking with account lockout
- `locked_until` timestamp for lockout period
- `is_active` flag for account activation

### RBAC (Role-Based Access Control)

**4 Roles:** ADMIN, DIETITIAN, ASSISTANT, VIEWER

**40+ Permissions** (format: `resource.action`):
- `patients.{create,read,update,delete}`
- `visits.{create,read,update,delete}`
- `billing.{create,read,update,delete}`
- `users.{create,read,update,delete}`
- `documents.{upload,read,update,delete}`
- `export.{patients,visits,billing}`
- `audit_logs.read`, `reports.read`, etc.

**Common Middleware Patterns:**

```javascript
// Single permission
router.get('/patients', authenticate, requirePermission('patients.read'), controller);

// Role check
router.delete('/users/:id', authenticate, requireRole('ADMIN'), controller);

// Any permission (OR logic)
router.get('/resource', authenticate, requireAnyPermission(['resource.read', 'resource.admin']), controller);

// All permissions (AND logic)
router.post('/sensitive', authenticate, requireAllPermissions(['resource.create', 'resource.sensitive']), controller);

// Owner or permission
router.put('/users/:id', authenticate, requireOwnerOrPermission('userId', 'users.update'), controller);

// Assigned dietitian check (for patient data)
router.get('/patients/:id', authenticate, requireAssignedDietitian(), controller);
```

**Available RBAC Functions:**
- `requirePermission(permission)`
- `requireAnyPermission([...])`
- `requireAllPermissions([...])`
- `requireRole(roleName)`
- `requireAnyRole([...])`
- `requireOwnerOrPermission(field, permission)`
- `requireAssignedDietitian()`
- `hasPermission(user, permission)`
- `hasRole(user, roleName)`
- `isAdmin(user)`

### Error Handling

**Custom AppError:**
```javascript
const { AppError } = require('./middleware/errorHandler');

throw new AppError('User not found', 404, 'USER_NOT_FOUND');
throw new AppError('Permission denied', 403, 'PERMISSION_DENIED');
```

**Centralized Error Handler** (`middleware/errorHandler.js`):
- Catches all errors
- Formats consistent responses: `{ success: false, error: { code, message, ... } }`
- Logs errors appropriately
- Authorization failures auto-logged to audit trail

### Audit Logging

All sensitive operations logged to `audit_logs` table:

**What gets logged:**
- CRUD operations on patients, visits, billing, users
- Authentication events (LOGIN, LOGOUT, TOKEN_REFRESH)
- Authorization failures
- Password changes
- Account status changes
- Document uploads/downloads/deletes
- Data exports

**Audit record includes:**
- User (user_id, username)
- Action type (CREATE, READ, UPDATE, DELETE, etc.)
- Resource (resource_type, resource_id)
- Request metadata (IP, user agent, method, path)
- Changes (before/after JSON)
- Status (SUCCESS, FAILURE) and severity

**Usage:**
```javascript
const auditService = require('./audit.service');

await auditService.log({
  user_id: user.id,
  username: user.username,
  action: 'CREATE',
  resource_type: 'patients',
  resource_id: patient.id,
  status: 'SUCCESS',
  changes: { after: patient.toJSON() },
  ip_address: req.ip,
  user_agent: req.get('user-agent'),
  request_method: req.method,
  request_path: req.path
});
```

### Rate Limiting

**6 Rate Limiters** (automatically disabled in `NODE_ENV=test`):

1. **Global**: 500 req/15min (all endpoints, fallback)
2. **Auth**: 5 req/15min (`/api/auth/*`)
3. **API**: 100 req/15min (patients, visits, billing, users)
4. **Report**: 50 req/15min (`/api/reports/*`)
5. **Export**: 10 req/hour (`/api/export/*`)
6. **Password Reset**: 3 req/hour (when implemented)

**Configuration:** `/backend/src/middleware/rateLimiter.js`

**429 Response:**
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests. Please try again later.",
    "retryAfter": "15 minutes"
  }
}
```

### File Upload System

**Polymorphic Document Model** supports patients, visits, and users:

**Endpoints:**
```javascript
POST /api/patients/:id/documents   # Upload (max 10 files, 10MB each)
GET  /api/patients/:id/documents   # List
GET  /api/patients/:id/documents/stats
GET  /api/documents/:id            # Metadata
GET  /api/documents/:id/download   # Download file
PATCH /api/documents/:id           # Update metadata
DELETE /api/documents/:id          # Delete

// Same for /api/visits/:id/documents and /api/users/:id/documents
```

**Allowed File Types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- Archives: ZIP, RAR

**Storage:** `/backend/uploads/{resource_type}/{YYYY-MM-DD}/{uuid}.ext`

**Multer Configuration:**
```javascript
const { upload, setUploadResourceType } = require('../config/multer');

router.post('/:id/documents',
  requirePermission('documents.upload'),
  setUploadResourceType('patients'),
  upload.array('files', 10),
  controller.uploadDocuments
);
```

**Testing:**
```bash
curl -X POST http://localhost:3001/api/patients/{id}/documents \
  -H "Authorization: Bearer {token}" \
  -F "files=@/path/to/file.pdf" \
  -F "document_type=medical_record" \
  -F "title=Lab Results"
```

### Data Export System

**Supported Formats:** CSV, Excel (XLSX), PDF

**Endpoints:**
```javascript
GET /api/export/patients?format=csv|excel|pdf&is_active=true
GET /api/export/visits?format=csv|excel|pdf&patient_id=xxx&status=completed
GET /api/export/billing?format=csv|excel|pdf&status=paid
```

**Features:**
- Format-specific styling (Excel: bold headers, PDF: pagination)
- RBAC: Dietitians can only export assigned patients
- Rate limited: 10 exports/hour
- Audit logged with format and record count
- Auto filename: `{resource}_{YYYY-MM-DD}.{ext}`

**Libraries:** `json2csv`, `exceljs`, `pdfkit`

## Database Models

**12 Models:**
1. **Role** - ADMIN, DIETITIAN, ASSISTANT, VIEWER
2. **Permission** - 40+ granular permissions
3. **RolePermission** - Many-to-many junction
4. **User** - System users with authentication
5. **Patient** - Patient demographics and medical info
6. **Visit** - Appointments/consultations
7. **VisitMeasurement** - Vitals, BMI, blood pressure (auto-created with visits)
8. **Billing** - Invoices and payments
9. **AuditLog** - Comprehensive audit trail
10. **RefreshToken** - JWT refresh token management
11. **ApiKey** - API key authentication
12. **Document** - Polymorphic file uploads

**Key Relationships:**
- User → Role (many-to-one)
- Role ↔ Permission (many-to-many via RolePermission)
- Patient → User (assigned_dietitian_id)
- Visit → Patient, Visit → User (dietitian)
- Visit → VisitMeasurement (one-to-one, auto-created)
- Billing → Patient, Billing → Visit
- Document → polymorphic (resource_type + resource_id)
- All models track created_by/updated_by → User

## Configuration

### Environment Variables

**Backend** (`.env` or `backend/.env`):
```bash
NODE_ENV=development
PORT=3001

# SQLite (development)
DB_DIALECT=sqlite
DB_STORAGE=./data/nutrivault_dev.db

# PostgreSQL (production)
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=nutrivault
# DB_USER=dbuser
# DB_PASSWORD=secure_password

# Authentication
JWT_SECRET=change-this-min-32-chars
REFRESH_TOKEN_SECRET=change-this-different-string
BCRYPT_ROUNDS=12

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

### Default Credentials

After `npm run db:seed`:
- Username: `admin`
- Password: `Admin123!`
- Role: ADMIN (all permissions)

**⚠️ Change in production**

## Development Workflows

### Adding a New API Endpoint

1. **Route** (`backend/src/routes/{resource}.routes.js`):
   ```javascript
   router.post('/', authenticate, requirePermission('resource.create'), controller.create);
   ```

2. **Controller** (`backend/src/controllers/{resource}.controller.js`):
   ```javascript
   async function create(req, res, next) {
     try {
       const result = await service.create(req.user, req.body, requestMetadata);
       res.status(201).json({ success: true, data: result });
     } catch (error) {
       next(error);
     }
   }
   ```

3. **Service** (`backend/src/services/{resource}.service.js`):
   ```javascript
   async function create(user, data, metadata) {
     // Validate, business logic, database operation, audit logging
     return result;
   }
   ```

4. **Register** (`backend/src/server.js`):
   ```javascript
   app.use('/api/{resource}', require('./routes/{resource}.routes'));
   ```

### Creating Database Migrations

**Location:** `/migrations/` (root level)

**Naming:** `YYYYMMDDHHMMSS-description.js`

**Template:**
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_name', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      // fields...
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
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('table_name');
  }
};
```

**Requirements:**
- Must support SQLite AND PostgreSQL
- Use Sequelize abstractions only (no raw SQL)
- Provide both `up` and `down` functions

### Adding Frontend Translations

1. Add key to `frontend/src/locales/en.json`:
   ```json
   {
     "patients": {
       "title": "Patients"
     }
   }
   ```

2. Add French translation to `frontend/src/locales/fr.json`:
   ```json
   {
     "patients": {
       "title": "Patients"
     }
   }
   ```

3. Use in component:
   ```javascript
   import { useTranslation } from 'react-i18next';

   const { t } = useTranslation();
   return <h1>{t('patients.title')}</h1>;
   ```

## Troubleshooting

### Database Issues

**"Database locked":**
- Close all database connections
- Restart server
- Ensure only one process accessing SQLite

**"Can't find models":**
- Models are at `/models/`, NOT `/backend/src/models/`
- Use `require('../../models')` from `backend/src/`

**Migration fails:**
```bash
npm run db:migrate:undo
# Fix migration file
npm run db:migrate
```

### Authentication Issues

**"Invalid token":**
- Check JWT_SECRET matches
- Verify token hasn't expired
- Check header format: `Authorization: Bearer <token>`

**"Account locked":**
- User exceeded failed login attempts
- Check `locked_until` in users table
- Wait for lockout or manually clear in database

### Frontend Issues

**API calls failing:**
- Check `VITE_API_URL` in `frontend/.env`
- Verify backend is running on correct port
- Check browser console for CORS errors

**Translations missing:**
- Ensure keys exist in both `en.json` and `fr.json`
- Check for typos in translation keys
- Verify `t()` function is called correctly

## Important Notes

1. **Models at root level** - Sequelize models in `/models/`, not `/backend/src/models/`
2. **Database commands from root** - Run `npm run db:migrate` from root, not `/backend/`
3. **Backend commands from backend/** - Run `npm run dev` from `/backend/` directory
4. **Frontend commands from frontend/** - Run `npm run dev` from `/frontend/` directory
5. **Dual authentication** - System supports both JWT tokens and API keys
6. **Audit everything** - All CRUD on sensitive data must be logged
7. **All strings must use i18n** - No hardcoded English/French strings in frontend
8. **Rate limiting disabled in tests** - Automatic when `NODE_ENV=test`
9. **Migration compatibility** - All migrations must work with SQLite AND PostgreSQL

## Documentation

- Full specification: `/NUTRIVAULT_SPECIFICATION.md`
- Visit workflow improvements: `/VISIT_WORKFLOW_IMPROVEMENTS.md`
- GitHub Copilot instructions: `.github/copilot-instructions.md`
