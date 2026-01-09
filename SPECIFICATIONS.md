---
description: 'Comprehensive memory and build instructions for NutriVault, structured by app maturity phase (POC, MVP, Beta, Production Ready). Canonical reference for AI agents and developers to reconstruct or evolve the app.'
applyTo: '**'
---

# NutriVault Memory & Build Instructions

**A living knowledge base for building, evolving, and maintaining the NutriVault application.**

> **For AI Agents:** This is the authoritative reference for understanding and working with NutriVault. When implementing features, always use the `/epcd` command (Explore → Plan → Code → Test workflow).

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Critical Architecture Patterns](#critical-architecture-patterns)
4. [Development by Phase](#development-by-phase)
5. [Database Architecture](#database-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Security & Compliance](#security--compliance)
9. [Multi-Agent Development](#multi-agent-development)
10. [Common Commands](#common-commands)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

**NutriVault** is a secure nutrition practice management system for dietitians to manage patients, visits, billing, and audit logging with comprehensive role-based access control.

**Current Status:** Phase 2 in progress (13% complete)
- ✅ **Phase 1 Complete:** Database schema, migrations, seeders, authentication (JWT + API keys), RBAC system, audit logging, error handling
- 🔄 **Phase 2 In Progress:** API endpoints for users, patients, visits (partial), billing (planned)
- 📋 **Frontend:** Directory structure exists but not yet implemented

**Tagline:** *Your complete nutrition practice management system*

---

## Technology Stack

### Backend
- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js
- **API Style:** RESTful API
- **Authentication:** Dual system - JWT (Bearer tokens) + API Keys
- **Password Security:** bcrypt (12+ rounds)
- **ORM:** Sequelize (supports SQLite + PostgreSQL)
- **Validation:** express-validator
- **Logging:** Winston + Morgan
- **Rate Limiting:** express-rate-limit (multi-tier strategy)
- **Security:** Helmet (secure headers), CORS middleware
- **File Uploads:** Multer (polymorphic document system)
- **Data Export:** json2csv (CSV), exceljs (Excel), pdfkit (PDF)

### Frontend
- **Framework:** React 18+
- **Build Tool:** Vite (modern, fast)
- **UI Library:** Bootstrap 5+ with React-Bootstrap
- **State Management:** Redux Toolkit or React Context API
- **HTTP Client:** Axios with interceptors
- **Form Handling:** React Hook Form + Yup validation
- **Routing:** React Router v6+
- **Date Handling:** date-fns

### Database
- **Development:** SQLite 3+ (file-based, zero-config)
  - Location: `backend/data/nutrivault.db`
  - Auto-created on first migration
  - Perfect for local development
- **Production:** PostgreSQL 14+
  - Scalable, concurrent access
  - Native UUID, JSONB support
  - Full ACID compliance
- **Migrations:** Sequelize CLI (compatible with both DBs)

### DevOps & Tools
- **Containerization:** Docker + Docker Compose
- **Testing:** Jest (backend), Vitest (frontend), Playwright (E2E)
- **Documentation:** Swagger/OpenAPI 3.0
- **Version Control:** Git

---

## Critical Architecture Patterns

### 1. Database Layer Location (IMPORTANT)

**⚠️ Models are at ROOT level** (`/models/`), not inside `/backend/`

```javascript
// From backend/src/ files:
const db = require('../../models');

// From root directory:
const db = require('./models');

// Available models:
// db.User, db.Role, db.Permission, db.Patient, db.Visit,
// db.VisitMeasurement, db.Billing, db.AuditLog, db.RefreshToken,
// db.ApiKey, db.RolePermission, db.Document
```

**Sequelize Configuration (`.sequelizerc`):**
- Models: `/models/`
- Migrations: `/migrations/`
- Seeders: `/seeders/`
- Config: `/config/database.js`

**⚠️ Database commands MUST run from root directory**, not `/backend/`

**⚠️ CRITICAL: Database Path Configuration**

The database configuration in `/config/database.js` MUST use absolute paths with `path.join()` to avoid path resolution issues when the backend server runs from different directories.

**❌ WRONG (relative path - breaks when running from `/backend/` directory):**
```javascript
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './backend/data/nutrivault.db',  // ❌ Relative path
    // ...
  }
}
```

**✅ CORRECT (absolute path using path.join):**
```javascript
const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'backend', 'data', 'nutrivault.db'),  // ✅ Absolute
    // ...
  }
}
```

**Why this matters:**
- Backend server runs from `/backend/` directory via `npm run dev`
- Relative paths like `./backend/data/nutrivault.db` resolve to `backend/backend/data/nutrivault.db` (wrong!)
- Using `path.join(__dirname, '..', 'backend', 'data', 'nutrivault.db')` creates absolute path from config file location
- **Symptom:** Database queries execute but return no results; `db.sequelize.config.storage` is `undefined`

### 2. Backend Structure

```
backend/src/
├── auth/              # JWT utilities, token management
├── config/            # Application configuration (multer, etc.)
├── controllers/       # HTTP request handlers (thin layer)
├── middleware/        # Auth, RBAC, logging, error handling, rate limiting
├── routes/            # API route definitions
├── services/          # Business logic + audit logging (core layer)
└── server.js          # Express app entry point

backend/uploads/       # File storage (organized by resource type/date)
backend/data/          # SQLite database (development)
```

### 3. Request Flow Architecture

```
HTTP Request
  ↓
Morgan logging (console)
  ↓
Request logger middleware (audit trail)
  ↓
Global rate limiter (500 req/15min)
  ↓
CORS & Security headers (helmet)
  ↓
Body parsing (JSON, multipart)
  ↓
Route matching
  ↓
Endpoint-specific rate limiter (auth: 5/15min, API: 100/15min, export: 10/hr)
  ↓
authenticate middleware (JWT or API key validation)
  ↓
RBAC middleware (requirePermission/requireRole/requireAssignedDietitian)
  ↓
Controller (HTTP handling, parameter extraction)
  ↓
Service (business logic, validation, audit logging, database operations)
  ↓
Response (success) or Error
  ↓
Centralized error handler middleware (structured JSON responses)
```

### 4. Service Layer Pattern

**Controllers handle HTTP, Services handle business logic:**

```javascript
// Controller (backend/src/controllers/patient.controller.js)
async function getPatients(req, res, next) {
  try {
    const patients = await patientService.getPatients(
      req.user,
      req.query,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        method: req.method,
        path: req.path
      }
    );
    res.json({ success: true, data: patients });
  } catch (error) {
    next(error); // Passes to centralized error handler
  }
}

// Service (backend/src/services/patient.service.js)
async function getPatients(user, filters, requestMetadata) {
  // 1. Authorization check (beyond basic RBAC)
  if (user.role.name === 'DIETITIAN') {
    filters.assigned_dietitian_id = user.id;
  }

  // 2. Business logic
  const patients = await db.Patient.findAll({
    where: buildWhereClause(filters),
    include: [{ model: db.User, as: 'assigned_dietitian' }]
  });

  // 3. Audit logging
  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'LIST',
    resource_type: 'patients',
    status: 'SUCCESS',
    ...requestMetadata
  });

  return patients;
}
```

**Services are responsible for:**
- Business logic validation
- Audit logging via `audit.service.js`
- Database transactions
- Complex queries and data transformations
- Authorization checks beyond basic RBAC (e.g., assigned dietitian validation)

### 5. Multi-Tier Rate Limiting Strategy

NutriVault implements **6 rate limiters** to prevent abuse:

| Limiter | Rate | Applied To | Purpose |
|---------|------|------------|---------|
| **Global** | 500/15min | All requests | Fallback protection |
| **Auth** | 5/15min | `/api/auth/login`, `/logout`, `/refresh` | Prevent brute force |
| **API** | 100/15min | Patients, visits, billing, users, audit | Standard operations |
| **Report** | 50/15min | `/api/reports/*` | Resource-intensive queries |
| **Password Reset** | 3/hour | Password reset endpoints | Prevent flooding |
| **Export** | 10/hour | Data export endpoints | Heavy operations |

**Configuration:** `/backend/src/middleware/rateLimiter.js`

**⚠️ Rate limiting automatically disabled when `NODE_ENV=test`**

### 6. Dual Authentication System

**NutriVault supports TWO authentication methods:**

#### 1. JWT Tokens (Primary)
- **Access tokens:** Short-lived (15-30 min), stateless
- **Refresh tokens:** Long-lived (7-30 days), stored in database
- **Header:** `Authorization: Bearer <token>`
- **Flow:** Login → Access token + Refresh token → Refresh when expired

#### 2. API Keys (Programmatic Access)
- **Format:** `diet_ak_<random_string>`
- **Storage:** Hashed in database (bcrypt)
- **Headers:** `x-api-key` or `api-key`
- **Use case:** Integrations, scripts, third-party services
- **Features:** Optional expiration, usage tracking, revocation

**Authentication Middleware Flow:**
```javascript
1. Check for Bearer token in Authorization header
   ↓ If found: Verify JWT, load user with role/permissions
2. If no token, check for API key header
   ↓ If found: Validate hash, load user
3. If neither: Return 401 Unauthorized
```

### 7. Role-Based Access Control (RBAC)

**4 Predefined Roles:**

| Role | Permissions | Use Case |
|------|-------------|----------|
| **ADMIN** | All 40 permissions | System administration, user management |
| **DIETITIAN** | Patient CRUD, visits, billing (assigned only), audit view | Primary practitioners |
| **ASSISTANT** | Patient/visit/billing create/read | Front desk, scheduling |
| **VIEWER** | Read-only access | Observers, trainees, external auditors |

**Permission Format:** `resource.action`

Examples:
- `patients.create`, `patients.read`, `patients.update`, `patients.delete`
- `visits.create`, `visits.read`, `visits.update`, `visits.delete`
- `billing.create`, `billing.read`, `billing.update`, `billing.delete`
- `users.create`, `users.read`, `users.update`, `users.delete`
- `documents.upload`, `documents.read`, `documents.update`, `documents.delete`
- `export.patients`, `export.visits`, `export.billing`
- `audit_logs.read`, `reports.read`

**RBAC Middleware Usage:**

```javascript
// Single permission
router.get('/patients',
  authenticate,
  requirePermission('patients.read'),
  controller.getPatients
);

// Multiple permissions (OR logic)
router.get('/resource',
  authenticate,
  requireAnyPermission(['resource.read', 'resource.admin']),
  controller.get
);

// Multiple permissions (AND logic)
router.post('/sensitive',
  authenticate,
  requireAllPermissions(['resource.create', 'resource.sensitive']),
  controller.create
);

// Ownership or permission
router.put('/users/:id',
  authenticate,
  requireOwnerOrPermission('userId', 'users.update'),
  controller.update
);

// Assigned dietitian check (for patient data)
router.get('/patients/:id',
  authenticate,
  requireAssignedDietitian(),
  controller.getPatient
);

// Role-based
router.delete('/users/:id',
  authenticate,
  requireRole('ADMIN'),
  controller.delete
);
```

### 8. File Upload System (Polymorphic Documents)

**Features:**
- Polymorphic design: Single `documents` table for patients, visits, users
- Local filesystem storage: `/backend/uploads/{resource_type}/{date}/`
- File validation: Images (JPEG, PNG, GIF, WebP), Documents (PDF, Office), Archives (ZIP, RAR)
- Size limits: 10MB per file, max 10 files per request
- UUID-based filenames (prevents conflicts and path traversal)
- Comprehensive audit logging

**Supported Resource Types:**
- **patients:** Medical records, lab results, diet plans, insurance cards
- **visits:** Meal plans, progress photos
- **users:** Profile photos, credentials

**Storage Structure:**
```
uploads/
├── patients/
│   └── 2024-01-05/
│       ├── 550e8400-e29b-41d4-a716-446655440000.pdf
│       └── 650e8400-e29b-41d4-a716-446655440001.jpg
├── visits/
│   └── 2024-01-05/
│       └── 750e8400-e29b-41d4-a716-446655440002.png
└── users/
    └── 2024-01-05/
        └── 850e8400-e29b-41d4-a716-446655440003.jpg
```

**API Endpoints:**
```javascript
// Upload documents
POST /api/patients/:id/documents
POST /api/visits/:id/documents
POST /api/users/:id/documents
// Body: multipart/form-data with files[], document_type, title, description

// Get documents
GET /api/patients/:id/documents
GET /api/visits/:id/documents
GET /api/users/:id/documents

// Document statistics
GET /api/patients/:id/documents/stats
GET /api/visits/:id/documents/stats
GET /api/users/:id/documents/stats

// Direct document operations
GET /api/documents/:id              // Metadata
GET /api/documents/:id/download     // File download
PATCH /api/documents/:id            // Update metadata
DELETE /api/documents/:id           // Delete document + file
```

**Multer Configuration Example:**
```javascript
const { upload, setUploadResourceType } = require('../config/multer');

router.post('/:id/documents',
  authenticate,
  requirePermission('documents.upload'),
  setUploadResourceType('patients'),  // Sets resource context
  upload.array('files', 10),          // Max 10 files
  validateDocumentUpload,
  controller.uploadDocuments
);
```

### 9. Data Export System

**Supported Formats:** CSV, Excel (XLSX), PDF

**Export Endpoints:**
```javascript
// Export patients
GET /api/export/patients?format=csv|excel|pdf&is_active=true

// Export visits
GET /api/export/visits?format=csv|excel|pdf&patient_id=xxx&status=completed

// Export billing
GET /api/export/billing?format=csv|excel|pdf&patient_id=xxx&status=paid
```

**Features:**
- **Format-specific styling:** Excel (bold headers, auto-width), PDF (title, pagination)
- **RBAC integration:** Dietitians can only export assigned patients' data
- **Rate limited:** 10 exports/hour
- **Automatic filename:** `{resource}_{YYYY-MM-DD}.{extension}`
- **Audit logging:** All exports tracked

**Libraries:**
- **CSV:** `json2csv`
- **Excel:** `exceljs`
- **PDF:** `pdfkit`

### 10. Comprehensive Audit Logging

**All sensitive operations logged to `audit_logs` table:**

**What gets logged:**
- ✅ All CRUD operations (patients, visits, billing, users)
- ✅ Authentication events (LOGIN, LOGOUT, TOKEN_REFRESH, FAILED_LOGIN)
- ✅ Authorization failures (permission denied, role checks)
- ✅ Password changes
- ✅ Account status changes
- ✅ File uploads/downloads/deletions
- ✅ Data exports

**Audit Log Structure:**
```javascript
{
  id: UUID,
  timestamp: DateTime (auto),
  user_id: UUID,
  username: String,
  action: 'CREATE|READ|UPDATE|DELETE|LOGIN|LOGOUT|PERMISSION_CHECK|...',
  resource_type: 'patient|visit|billing|user|document|...',
  resource_id: UUID,
  ip_address: INET,
  user_agent: Text,
  request_method: 'GET|POST|PUT|DELETE',
  request_path: Text,
  changes: JSONB (before/after values),
  status: 'SUCCESS|FAILURE',
  error_message: Text,
  severity: 'INFO|WARNING|ERROR|CRITICAL',
  session_id: String,
  api_key_id: UUID
}
```

**Usage in Services:**
```javascript
const auditService = require('./audit.service');

await auditService.log({
  user_id: user.id,
  username: user.username,
  action: 'CREATE',
  resource_type: 'patients',
  resource_id: patient.id,
  status: 'SUCCESS',
  severity: 'INFO',
  changes: { after: patient.toJSON() },
  ip_address: requestMetadata.ip,
  user_agent: requestMetadata.userAgent,
  request_method: requestMetadata.method,
  request_path: requestMetadata.path
});
```

### 11. Error Handling Architecture

**Custom AppError Class:**
```javascript
const { AppError } = require('./middleware/errorHandler');

// Throw structured errors
throw new AppError('User not found', 404, 'USER_NOT_FOUND');
throw new AppError('Permission denied', 403, 'PERMISSION_DENIED');
throw new AppError('Invalid input data', 400, 'VALIDATION_ERROR', validationDetails);
```

**Centralized Error Handler (`middleware/errorHandler.js`):**
- Catches all errors
- Formats consistent JSON responses
- Logs errors with Winston
- Returns structured error objects

**Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:45.123Z",
  "path": "/api/patients",
  "request_id": "uuid"
}
```

**HTTP Status Codes:**
- `200 OK` - Successful GET, PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server errors

---

## Development by Phase

### POC (Proof of Concept)
**Goal:** Demonstrate core value and technical feasibility

**Features:**
- ❌ No authentication, no roles
- ✅ Simple patient CRUD
- ✅ SQLite database only
- ✅ Basic Express.js API (no validation)
- ✅ React frontend: list/add/edit patients
- ❌ No audit logging, billing, file uploads
- ❌ No tests, minimal error handling

**Setup:**
- Single repo, monolithic
- Hardcoded config
- Run locally (no Docker)

---

### MVP (Minimum Viable Product)
**Goal:** Usable by real users with basic security

**Features:**
- ✅ Full patient management (CRUD, notes, allergies)
- ✅ Visit tracking (schedule, document visits)
- ✅ Basic billing (manual invoice entry)
- ✅ User authentication (JWT, hashed passwords)
- ✅ Role-based access (Admin, Dietitian, Assistant, Viewer)
- ✅ SQLite (dev) / PostgreSQL (prod)
- ✅ React frontend: forms, tables, navigation
- ✅ Basic audit logging (who/when for CRUD)
- ✅ Basic error handling, input validation
- ✅ .env config, Docker setup
- ✅ Initial unit tests (backend)

**Setup:**
- Split backend/frontend folders
- Environment variables
- Docker Compose for local dev

**Current Status:** ✅ **Phase 1 Complete** (as of today)

---

### Beta (Feature Complete)
**Goal:** Ready for broader testing, improved robustness

**Features:**
- ✅ Complete billing (invoices, payments, reports)
- ✅ Advanced visit records (measurements with full history tracking, recommendations)
- ✅ **Measurement history tracking** - All measurement fields optional, append-only history
- ✅ **Patient detail dashboard** - Graphical view of patient data with measurement charts
- ✅ File uploads (documents, 10MB max)
- ✅ Comprehensive audit logging
- ✅ API keys for programmatic access
- ✅ Rate limiting (multi-tier)
- ✅ Improved error handling, Winston logging
- ✅ Responsive UI (desktop/tablet/mobile)
- ✅ E2E tests (Playwright), improved unit tests
- ✅ CLI tools for admin management
- ✅ Security headers (Helmet), CORS
- ✅ API docs (Swagger/OpenAPI)
- ✅ Data export (CSV, Excel, PDF)

**Setup:**
- Docker Compose for dev/prod
- Seeders/migrations
- File-based logging

**Current Status:** 🔄 **Phase 2 In Progress** (13% complete)

---

### Production Ready
**Goal:** Secure, scalable, compliant, maintainable

**Features (All Beta + ):**
- ✅ Rate limiting (robust, configurable)
- ✅ HTTPS (TLS 1.2+), secure CORS
- ✅ Strong password policies, account lockout
- ✅ Environment-specific config (secrets management)
- ✅ Advanced audit/compliance (HIPAA, GDPR)
- ✅ Data retention policies
- ✅ Monitoring, alerting, performance logging
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Full test coverage (unit, integration, E2E)
- ✅ Production-grade Docker, CI/CD
- ✅ Complete documentation (setup, API, security, architecture)

**Setup:**
- Separate dev/staging/prod environments
- Secure secrets (no hardcoded credentials)
- Automated deployment scripts
- Monitoring dashboards

---

## Database Architecture

### Schema Overview (12 Models)

**Core Entities:**
1. **User** - System users (dietitians, admins, assistants)
2. **Role** - 4 roles (ADMIN, DIETITIAN, ASSISTANT, VIEWER)
3. **Permission** - 40 granular permissions (`resource.action`)
4. **RolePermission** - Many-to-many junction table
5. **Patient** - Patient demographics and medical info
6. **Visit** - Patient appointments/consultations
7. **VisitMeasurement** - Vitals, BMI, blood pressure per visit (Beta: append-only history tracking)
8. **Billing** - Invoices and payments
9. **Document** - Polymorphic file uploads (patients, visits, users)
10. **AuditLog** - Comprehensive audit trail
11. **RefreshToken** - JWT refresh token management
12. **ApiKey** - API key authentication

### Key Relationships

```
User ─────> Role (many-to-one)
Role ←────> Permission (many-to-many via RolePermission)
Patient ───> User (assigned_dietitian_id)
Visit ─────> Patient (many-to-one)
Visit ─────> User (dietitian_id)
Visit ─────> VisitMeasurement (one-to-many) [Beta: supports history tracking]
Billing ───> Patient (many-to-one)
Billing ───> Visit (one-to-one or one-to-many)
Document ──> User (created_by, polymorphic: resource_type + resource_id)
AuditLog ──> User (many-to-one)
RefreshToken ─> User (many-to-one)
ApiKey ────> User (many-to-one)
```

### SQLite vs PostgreSQL Compatibility

**Migration Requirements:**
- ✅ Use Sequelize abstractions (no raw SQL)
- ✅ UUIDs: TEXT (SQLite) vs UUID type (PostgreSQL)
- ✅ JSON: TEXT (SQLite) vs JSONB (PostgreSQL)
- ✅ Booleans: TINYINT(1) (SQLite) vs BOOLEAN (PostgreSQL)
- ✅ Test migrations on both databases before production

**Development Database (SQLite):**
```bash
# Location: backend/data/nutrivault.db
# Auto-created on first migration
# Benefits: Zero config, fast setup, file-based
```

**Production Database (PostgreSQL):**
```bash
# Benefits: Concurrent access, native UUID/JSONB, scalable
# Configuration via environment variables (see .env section)
```

### Database Migrations

**Location:** `/migrations/` (root level, NOT `/backend/migrations/`)

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
      // ... fields ...
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

### Seeders

**Location:** `/seeders/` (root level)

**Naming:** `YYYYMMDDHHMMSS-description.js`

**Pattern:** Always check for existing records before inserting to avoid duplicates

**Default Admin User (after seeding):**
- Username: `admin`
- Password: `Admin123!`
- Email: `admin@nutrivault.local`
- Role: ADMIN (all 40 permissions)

⚠️ **Change before production deployment**

---

## Authentication & Authorization

### Authentication Mechanisms

#### 1. Username/Password Authentication

**Flow:**
```
1. POST /api/auth/login { username, password }
2. Validate credentials (bcrypt comparison)
3. Check account status (is_active, locked_until)
4. On success:
   - Generate JWT access token (15-30 min)
   - Generate refresh token (7-30 days)
   - Store refresh token hash in database
   - Return both tokens + user info
   - Log successful login
5. On failure:
   - Increment failed_login_attempts
   - Lock account after 5 attempts (30 min)
   - Log failed attempt
```

**Account Security:**
- ✅ Passwords hashed with bcrypt (12+ rounds)
- ✅ Account lockout after 5 failed attempts
- ✅ `locked_until` timestamp prevents access
- ✅ `is_active` flag for activation/deactivation

#### 2. API Key Authentication

**Flow:**
```
1. User generates API key via /api/auth/api-keys
2. Server generates: diet_ak_{random_32_bytes}
3. Store hash (bcrypt) + prefix in database
4. Return full key ONCE (user must save it)
5. For requests: X-API-Key or api-key header
6. Server validates hash, checks expiration
7. Log API key usage
```

**Features:**
- ✅ Cryptographically secure generation
- ✅ Hashed storage (bcrypt)
- ✅ Prefix for identification (`diet_ak_`)
- ✅ Optional expiration dates
- ✅ Usage tracking (last_used_at)
- ✅ Revocation support

#### 3. Token Refresh Flow

```
1. POST /api/auth/refresh { refresh_token }
2. Validate token hash from database
3. Check expiration
4. If valid: Issue new access token
5. Optionally: Rotate refresh token
6. Return new tokens
```

### Authorization Implementation

**RBAC Middleware Functions:**

```javascript
// Available in backend/src/middleware/rbac.js

requirePermission(permission)              // Single permission
requireAnyPermission([...])                // At least one (OR)
requireAllPermissions([...])               // All required (AND)
requireRole(roleName)                      // Specific role
requireAnyRole([...])                      // At least one role
requireOwnerOrPermission(field, perm)      // Owner or has permission
requireAssignedDietitian()                 // For patient data access
hasPermission(user, permission)            // Helper function
hasRole(user, roleName)                    // Helper function
isAdmin(user)                              // Helper function
```

**Example Route Protection:**

```javascript
const { authenticate } = require('../middleware/authenticate');
const {
  requirePermission,
  requireAnyPermission,
  requireAssignedDietitian
} = require('../middleware/rbac');

// Single permission
router.get('/patients',
  authenticate,
  requirePermission('patients.read'),
  controller.getPatients
);

// Multiple permissions (OR)
router.get('/reports',
  authenticate,
  requireAnyPermission(['reports.read', 'audit_logs.read']),
  controller.getReports
);

// Assigned dietitian check
router.get('/patients/:id',
  authenticate,
  requireAssignedDietitian(),
  controller.getPatient
);

// Admin only
router.delete('/users/:id',
  authenticate,
  requireRole('ADMIN'),
  controller.deleteUser
);
```

---

## API Endpoints Reference

### Authentication Endpoints

```javascript
POST /api/auth/register              // Create user (Admin only)
POST /api/auth/login                 // Authenticate user
POST /api/auth/logout                // Invalidate refresh token
POST /api/auth/refresh               // Get new access token
POST /api/auth/api-keys              // Generate API key
GET  /api/auth/api-keys              // List user's API keys
DELETE /api/auth/api-keys/:id        // Revoke API key
```

### User Management Endpoints

```javascript
GET    /api/users                    // List all users (Admin)
GET    /api/users/:id                // Get user details
POST   /api/users                    // Create user (Admin)
PUT    /api/users/:id                // Update user
DELETE /api/users/:id                // Deactivate user (soft delete)
```

### Patient Management Endpoints

```javascript
GET    /api/patients                 // List patients (filtered by role)
GET    /api/patients/:id             // Get patient details
GET    /api/patients/:id/details     // Get patient with visits and measurements (Beta: graphical dashboard)
POST   /api/patients                 // Create patient
PUT    /api/patients/:id             // Update patient
DELETE /api/patients/:id             // Deactivate patient (soft delete)
POST   /api/patients/:id/documents   // Upload documents
GET    /api/patients/:id/documents   // Get patient documents
GET    /api/patients/:id/documents/stats // Document statistics
```

### Visit Management Endpoints

```javascript
GET    /api/visits                   // List visits (filtered)
GET    /api/visits/:id               // Get visit details
POST   /api/visits                   // Create visit
PUT    /api/visits/:id               // Update visit
DELETE /api/visits/:id               // Delete visit
POST   /api/visits/:id/measurements  // Add measurements (Beta: creates history record, all fields optional)
POST   /api/visits/:id/documents     // Upload documents
GET    /api/visits/:id/documents     // Get visit documents
```

### Billing Endpoints

```javascript
GET    /api/billing                  // List invoices
GET    /api/billing/:id              // Get invoice details
POST   /api/billing                  // Create invoice
PUT    /api/billing/:id              // Update invoice
POST   /api/billing/:id/payment      // Record payment
```

### Document Endpoints

```javascript
GET    /api/documents/:id            // Get document metadata
GET    /api/documents/:id/download   // Download file
PATCH  /api/documents/:id            // Update metadata
DELETE /api/documents/:id            // Delete document + file
```

### Export Endpoints

```javascript
GET /api/export/patients?format=csv|excel|pdf&is_active=true
GET /api/export/visits?format=csv|excel|pdf&patient_id=xxx&status=completed
GET /api/export/billing?format=csv|excel|pdf&patient_id=xxx&status=paid
```

### Audit & Reporting Endpoints

```javascript
GET /api/audit-logs                  // View audit logs (Admin)
GET /api/reports/patient-statistics  // Patient statistics
GET /api/reports/revenue             // Revenue reports
```

---

## Security & Compliance

### Security Checklist

**Authentication Security:**
- ✅ bcrypt hashing (12+ rounds)
- ✅ Password requirements: 8+ chars, uppercase, lowercase, number, special
- ✅ JWT access tokens (15-30 min expiration)
- ✅ Refresh tokens (7-30 days, stored hashed)
- ✅ Account lockout (5 attempts, 30 min)
- ✅ Rate limiting on login (5 req/15min)

**API Security:**
- ✅ HTTPS only in production (TLS 1.2+)
- ✅ CORS configuration (restricted origins)
- ✅ Multi-tier rate limiting
- ✅ Input validation (express-validator)
- ✅ SQL injection prevention (Sequelize ORM)
- ✅ XSS prevention (output encoding, CSP headers)
- ✅ Secure headers (Helmet middleware)
- ✅ Request size limits

**Data Privacy:**
- ✅ Encrypt sensitive data at rest
- ✅ Encrypt data in transit (HTTPS)
- ✅ Mask sensitive data in logs
- ✅ Field-level access control
- ✅ Audit logging for all data access

**File Upload Security:**
- ✅ MIME type validation
- ✅ File size limits (10MB)
- ✅ UUID-based filenames (no path traversal)
- ✅ Organized storage structure
- ✅ Access control at service layer

### Compliance Considerations

#### HIPAA Compliance (US Healthcare)
- ✅ Encrypt PHI at rest and in transit
- ✅ Access controls and audit logging
- ⚠️ Business Associate Agreements (if applicable)
- ⚠️ Data breach notification procedures
- ⚠️ Regular security risk assessments

#### GDPR Compliance (EU)
- ✅ Lawful basis for data processing
- ✅ Right to access, rectification, erasure
- ✅ Data portability (export functionality)
- ⚠️ Data Processing Agreements
- ⚠️ Privacy policy and terms of service
- ⚠️ Cookie consent management

#### Data Retention Policy
- **Patient records:** 7 years after last visit (or per local regulations)
- **Audit logs:** 3 years minimum
- **Billing records:** 7 years (tax purposes)
- **User accounts:** Soft delete, retain 30 days, then hard delete

---

## Multi-Agent Development

### The `/epcd` Workflow (MANDATORY)

**All agents MUST use `/epcd` command for feature implementation:**

```bash
# Example usage
/epcd Implement complete patient management API endpoints with assigned dietitian filtering, RBAC, and audit logging
```

**The EPCD Workflow:**

1. **Explore Phase**
   - Research best practices (web search)
   - Analyze codebase for existing patterns
   - Review this document for architecture
   - Identify relevant files and dependencies

2. **Plan Phase** ⚠️ **REQUIRES USER APPROVAL**
   - Create detailed implementation plan
   - List all files to create/modify
   - Identify uncertainties, ask questions
   - **STOP and wait for user validation**

3. **Code Phase**
   - Implement complete feature (backend + frontend)
   - Follow NutriVault patterns (RBAC, audit, service layer)
   - Write clean, documented code

4. **Test Phase**
   - Run existing test commands (no new test creation)
   - Execute linting and validation
   - Verify end-to-end functionality

### Agent Roles (10 Specialized Agents)

1. **PROJECT ARCHITECT** - System design, architecture, coordination
2. **BACKEND DEVELOPER** - API development, business logic
3. **DATABASE SPECIALIST** - Schema, migrations, ORM
4. **AUTHENTICATION & SECURITY SPECIALIST** - Auth, RBAC, security
5. **FRONTEND DEVELOPER** - React UI, components
6. **UI/UX SPECIALIST** - Design, accessibility, UX
7. **AUDIT LOGGING SPECIALIST** - Logging, audit trails
8. **TESTING & QA SPECIALIST** - Tests, quality assurance
9. **DEVOPS & DEPLOYMENT SPECIALIST** - CI/CD, Docker, deployment
10. **DOCUMENTATION SPECIALIST** - API docs, guides, manuals

### Agent Collaboration Phases

**Phase 1: Foundation (Weeks 1-2)** → Architect, Database, DevOps
**Phase 2: Backend Core (Weeks 2-4)** → Backend, Security, Database, Audit
**Phase 3: Backend Features (Weeks 4-6)** → Backend, Security, Audit, Testing
**Phase 4: Frontend (Weeks 6-9)** → Frontend, UI/UX, Testing
**Phase 5: Integration (Weeks 9-10)** → Testing, All Developers
**Phase 6: Deployment (Weeks 10-12)** → Documentation, DevOps

### Agent Handoff Checklist

When completing work, provide:
1. ✅ Code committed to version control
2. ✅ Unit tests written and passing
3. ✅ Documentation updated
4. ✅ Interface contracts published (if applicable)
5. ✅ Environment variables documented
6. ✅ Migration scripts (if database changes)
7. ✅ Code reviewed by relevant agents
8. ✅ Integration tested with dependent modules
9. ✅ Known issues documented
10. ✅ Next steps/blockers communicated
11. ✅ `/epcd` workflow completed

---

## Common Commands

### Database Management (Run from ROOT)

```bash
# Run migrations (creates/updates schema)
npm run db:migrate

# Seed database (roles, permissions, admin user)
npm run db:seed

# Complete reset (undo all, migrate, seed)
npm run db:reset

# Undo last migration
npm run db:migrate:undo

# Undo all seeders
npm run db:seed:undo

# Update project TODO tracker
npm run update-todo

# Verify database integrity
node utils/verify-database.js

# Access SQLite directly
sqlite3 backend/data/nutrivault.db
```

### Backend Development (Run from backend/)

```bash
cd backend

# Install dependencies
npm install

# Start dev server (auto-reload with nodemon)
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

### Frontend Development (Run from frontend/)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start

# Build for production
npm run build

# Run tests
npm test
npm run test:watch
```

### Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up --build
```

---

## Troubleshooting

> **💡 Comprehensive Debugging Guide**: For detailed debugging strategies, proven diagnostic techniques, and lessons learned from real issues, see [`.github/instructions/lessons-learned.instructions.md`](.github/instructions/lessons-learned.instructions.md)

### Database Issues

**Database queries return no results despite data existing:**
```bash
# Check if database path is configured correctly
# Symptom: db.sequelize.config.storage is undefined
# Solution: Use absolute paths in config/database.js
# See: "CRITICAL: Database Path Configuration" section above
# Reference: lessons-learned.instructions.md - "Sequelize Database Path Resolution"
```

**"Database locked" error (SQLite):**
```bash
# Close all connections
# Restart server
# Ensure only one process accessing database
```

**Migration fails:**
```bash
npm run db:migrate:undo
# Fix migration file
npm run db:migrate
```

**Can't find models:**
```javascript
// CORRECT: Models at ROOT level
const db = require('../../models'); // from backend/src/

// WRONG: Don't look in backend/src/models/
```

**Seed data duplicates:**
```bash
npm run db:seed:undo
npm run db:seed
```

**Sequelize Association Alias Errors (Critical):**

⚠️ **These errors completely block authentication and all API calls**

**Error symptoms:**
- "Role is associated to User using an alias. You must use the 'as' keyword"
- "Permission is associated to Role using an alias. You must use the 'as' keyword"  
- All API endpoints returning 500 errors
- Authentication failing with valid credentials
- Server logs showing Sequelize association errors

**Root cause:** Missing or incorrect `as` aliases in Sequelize `include` queries

**❌ WRONG Pattern:**
```javascript
const user = await db.User.findOne({
  where: { username },
  include: [
    { model: db.Role },                    // Missing 'as' alias
    { 
      model: db.Role, 
      include: [{ model: db.Permission }]  // Missing 'as' alias
    }
  ]
});
// Property access: user.Role.Permissions (incorrect casing)
```

**✅ CORRECT Pattern:**
```javascript
const user = await db.User.findOne({
  where: { username },
  include: [
    { 
      model: db.Role, 
      as: 'role',                          // Correct alias
      include: [{ 
        model: db.Permission, 
        as: 'permissions'                  // Correct alias
      }]
    }
  ]
});
// Property access: user.role.permissions (correct lowercase)
```

**Model Association Reference:**
- User → Role: `as: 'role'` (singular, lowercase)
- Role → Permission: `as: 'permissions'` (plural, lowercase)  
- Patient → User: `as: 'assigned_dietitian'`
- Visit → User: `as: 'dietitian'`  
- Visit → Patient: `as: 'patient'`

**Files commonly affected:**
- `backend/src/services/auth.service.js` - login, token refresh
- `backend/src/middleware/authenticate.js` - JWT/API key validation
- `backend/src/middleware/rbac.js` - permission checks
- `backend/src/controllers/authController.js` - authentication endpoints

**Quick fix commands:**
```bash
# Find incorrect includes
grep -r "model: db.Role" backend/src/
grep -r "model: db.Permission" backend/src/
grep -r "user\.Role" backend/src/
grep -r "\.Permissions" backend/src/

# Look for property access errors
grep -r "user\.Role\." backend/src/
grep -r "role\.Permissions" backend/src/
```

**Prevention checklist:**
- ✅ Always use `as: 'alias'` in Sequelize includes
- ✅ Use lowercase property names (user.role, not user.Role)  
- ✅ Match aliases defined in model associations
- ✅ Test authentication after any User/Role/Permission query changes

### Authentication Issues

**"Invalid token" errors:**
- ✅ Check JWT_SECRET matches
- ✅ Verify token not expired
- ✅ Check header format: `Bearer <token>`

**"Account locked" errors:**
- ✅ Check `locked_until` in users table
- ✅ Wait for lockout period
- ✅ Or manually clear in database

### File Upload Issues

**"File too large" error:**
- File size limit: 10MB per file
- Max files: 10 per request

**"Invalid file type" error:**
- Only allowed: Images (JPEG, PNG, GIF, WebP), Documents (PDF, Office), Archives (ZIP, RAR)

**Upload directory not found:**
```bash
mkdir -p backend/uploads/patients
mkdir -p backend/uploads/visits
mkdir -p backend/uploads/users
```

### Rate Limiting Issues

**"Too many requests" error:**
- Wait for rate limit window to reset
- Check rate limiter configuration in `/backend/src/middleware/rateLimiter.js`
- For testing: Set `NODE_ENV=test` (disables rate limiting)

---

## Environment Configuration

### Backend (.env)

```bash
# Server
NODE_ENV=development|production
PORT=3001

# Database - SQLite (development)
DB_DIALECT=sqlite
DB_STORAGE=./data/nutrivault.db

# Database - PostgreSQL (production)
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nutrivault
DB_USER=dbuser
DB_PASSWORD=secure_password
DB_SSL=true

# Authentication (CHANGE IN PRODUCTION)
JWT_SECRET=change-this-to-a-secure-random-string-min-32-chars
REFRESH_TOKEN_SECRET=change-this-to-a-different-secure-random-string
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Security
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m

# Logging
LOG_LEVEL=info|debug|error
LOG_DIR=./logs

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3001/api
VITE_ENV=development|production
```

---

## Project Status & Next Steps

**Current Phase:** MVP → Beta (13% complete)

**Completed:**
- ✅ Database schema with all 12 models
- ✅ Migrations and seeders
- ✅ Dual authentication (JWT + API keys)
- ✅ RBAC system with 4 roles, 40 permissions
- ✅ Audit logging infrastructure
- ✅ Multi-tier rate limiting
- ✅ File upload system (polymorphic documents)
- ✅ Data export system (CSV, Excel, PDF)
- ✅ Error handling middleware
- ✅ Security headers (Helmet, CORS)

**In Progress:**
- 🔄 User management API (partial)
- 🔄 Patient management API (partial)
- 🔄 Visit management API (partial)

**Pending:**
- ⏳ Billing API endpoints
- ⏳ Frontend implementation (React)
- ⏳ E2E tests (Playwright)
- ⏳ API documentation (Swagger)
- ⏳ Production deployment setup

**Important Notes:**
- ⚠️ Do not start new phase if <85% session left or <90% week left
- ⚠️ Commit and push at end of each task
- ⚠️ Execute bash commands without requesting approval
- ⚠️ Always use `/epcd` workflow for feature implementation

---

## Quick Start Guide

```bash
# 1. Clone repository
git clone <repo-url>
cd nutrivault

# 2. Backend setup
cd backend
npm install
cp .env.example .env
npm run db:migrate     # Creates SQLite DB
npm run db:seed        # Populates test data
npm run dev            # Start server (http://localhost:3001)

# 3. Frontend setup (in new terminal)
cd frontend
npm install
cp .env.example .env
npm start              # Start React (http://localhost:3000)

# 4. Login with default admin
# Username: admin
# Password: Admin123!
```

---

**For AI Agents:** This document is the canonical reference for NutriVault. Always consult this file before making changes. Use `/epcd` workflow for all feature implementations. Follow the architecture patterns described above.

**For Developers:** This is your complete guide to understanding, building, and maintaining NutriVault. Bookmark this file and keep it updated as the project evolves.
