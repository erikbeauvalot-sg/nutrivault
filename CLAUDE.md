# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NutriVault is a secure nutrition practice management system for dietitians to manage patients, visits, billing, and audit logging with role-based access control. Built with Node.js/Express backend, React frontend (scaffold only), and Sequelize ORM supporting both SQLite (development) and PostgreSQL (production).

**Current Status**: Phase 16 In Progress - Beta Release Ready
- **Phase 1-15 Complete**: Full system implementation including database schema, migrations, seeders, authentication (JWT + API keys), RBAC system, audit logging, error handling, complete API endpoints, and comprehensive React frontend
- **Phase 16 In Progress**: Frontend billing management UI with invoice generation and document management features
  - ⚠️ **Document Upload Feature Not Working:** The document upload functionality is not working - button does nothing when clicked. Feature disabled in navigation menu until fixed.
  - ✅ **i18n Improvements Complete**: Fixed missing French translations in PatientDetailModal, PatientsPage, and added comprehensive visit translations
  - ⚠️ **Visit Workflow Enhancement Needed**: See `VISIT_WORKFLOW_IMPROVEMENTS.md` for detailed requirements and implementation plan
- **Frontend**: Fully implemented with patient management, visit scheduling, billing system, document management, and internationalization
- **Features**: Complete nutrition practice management with secure user authentication, role-based permissions, patient tracking, visit management, automated billing, document storage, and audit trails

## Common Commands

### Database Management (Run from ROOT directory)

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

# Update project TODO tracker
npm run update-todo
```

### Backend Development (Run from backend/ directory)

```bash
cd backend

# Install dependencies
npm install

# Start development server (auto-reload with nodemon)
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
docker-compose up -d

# Stop all services
docker-compose down
```

## Critical Architecture Patterns

### Database Layer Location (IMPORTANT)

**Models are at ROOT level**, not inside `/backend/`. This is the most common source of confusion.

```javascript
// From backend/src/ files:
const db = require('../../models');

// From root directory:
const db = require('./models');

// Models available: db.User, db.Role, db.Permission, db.Patient,
// db.Visit, db.VisitMeasurement, db.Billing, db.AuditLog,
// db.RefreshToken, db.ApiKey, db.RolePermission, db.Document
```

**Sequelize paths** (defined in `.sequelizerc`):
- Models: `/models/`
- Migrations: `/migrations/`
- Seeders: `/seeders/`
- Config: `/config/database.js`

**Database commands MUST run from root directory**, not from `/backend/`.

### Backend Structure

```
backend/src/
├── auth/              # JWT utilities, token management
├── config/            # Application configuration
├── controllers/       # Request handlers (HTTP layer)
├── middleware/        # Auth, RBAC, logging, error handling
├── routes/            # API route definitions
├── services/          # Business logic (core layer)
└── server.js          # Express app entry point
```

### Request Flow

```
HTTP Request
  ↓
Morgan logging (console)
  ↓
Request logger middleware (audit trail)
  ↓
Global rate limiter (500 req/15min)
  ↓
CORS & Security (helmet)
  ↓
Body parsing
  ↓
Route matching
  ↓
Endpoint-specific rate limiter (auth/API/report/export)
  ↓
authenticate middleware (JWT or API key)
  ↓
RBAC middleware (requirePermission/requireRole)
  ↓
Controller (HTTP handling)
  ↓
Service (business logic + audit logging)
  ↓
Response or Error
  ↓
Error handler middleware (centralized)
```

### Rate Limiting

**Multi-tier Rate Limiting Strategy:**

NutriVault implements multiple rate limiters to prevent abuse while allowing legitimate usage:

**Limiter Types:**

1. **Global Limiter** (500 requests per 15 min)
   - Applied to ALL requests as fallback protection
   - Only counts failed requests
   - Location: `backend/src/server.js`

2. **Auth Limiter** (5 requests per 15 min)
   - Applied to: `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`
   - Prevents brute force attacks
   - Very strict to protect authentication endpoints

3. **API Limiter** (100 requests per 15 min)
   - Applied to: patients, visits, billing, users, audit endpoints
   - Standard rate limiting for normal operations
   - Balances usability and protection

4. **Report Limiter** (50 requests per 15 min)
   - Applied to: `/api/reports/*`
   - Resource-intensive queries require moderate limits

5. **Password Reset Limiter** (3 requests per hour)
   - Applied to: password reset endpoints (when implemented)
   - Prevents email/SMS flooding

6. **Export Limiter** (10 requests per hour)
   - Applied to: data export endpoints (when implemented)
   - Resource-intensive operations

**Configuration:**

Rate limiters are defined in `/backend/src/middleware/rateLimiter.js`:

```javascript
const { authLimiter, apiLimiter, reportLimiter } = require('../middleware/rateLimiter');

// Apply to routes
router.use(authenticate);
router.use(apiLimiter);
```

**Test Environment:**

Rate limiting is **automatically disabled** when `NODE_ENV=test` to allow test suites to run without hitting limits.

**Rate Limit Response:**

When rate limit is exceeded, clients receive:
- HTTP Status: `429 Too Many Requests`
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- Body:
  ```json
  {
    "success": false,
    "error": {
      "code": "TOO_MANY_REQUESTS",
      "message": "Too many requests from this IP. Please try again later.",
      "retryAfter": "15 minutes"
    }
  }
  ```

**Adjusting Limits:**

To modify rate limits, edit `/backend/src/middleware/rateLimiter.js`:
- `windowMs`: Time window in milliseconds
- `max`: Maximum requests per window
- `message`: Custom error message

**Important Notes:**
- Limits are per-IP address
- Successful and failed requests both count (except global limiter)
- Standard headers provided for client rate limit tracking
- Legacy `X-RateLimit-*` headers disabled

### File Upload System

**Overview:**

NutriVault supports file uploads for patients, visits, and users using a polymorphic document system with Multer middleware.

**Features:**
- Polymorphic design: Single `documents` table supports multiple resource types
- Local filesystem storage (organized by resource type and date)
- File type validation (images, PDFs, Office documents, archives)
- File size limit: 10MB per file, max 10 files per request
- UUID-based filenames to prevent conflicts
- Comprehensive audit logging of all upload/download/delete operations

**Supported Resource Types:**
- `patients`: Medical records, lab results, diet plans, insurance cards
- `visits`: Meal plans, progress photos
- `users`: Profile photos, credentials

**Supported Document Types:**
```javascript
[
  'medical_record', 'lab_result', 'diet_plan', 'profile_photo',
  'meal_plan', 'progress_photo', 'prescription', 'insurance_card',
  'consent_form', 'other'
]
```

**Allowed File Types:**
- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- **Archives**: ZIP, RAR

**API Endpoints:**

```javascript
// Upload documents for a patient
POST /api/patients/:id/documents
  - Body: multipart/form-data
  - Fields: files[] (required), document_type, title, description
  - Permission: documents.upload
  - Returns: Array of created document records

// Get all documents for a patient
GET /api/patients/:id/documents
  - Permission: documents.read
  - Returns: Array of documents with creator info

// Get document statistics
GET /api/patients/:id/documents/stats
  - Permission: documents.read
  - Returns: Document counts and sizes grouped by type

// Same endpoints available for visits and users:
// POST /api/visits/:id/documents
// GET /api/visits/:id/documents
// GET /api/visits/:id/documents/stats
// POST /api/users/:id/documents
// GET /api/users/:id/documents
// GET /api/users/:id/documents/stats

// Direct document operations:
GET /api/documents/:id              // Get document metadata
GET /api/documents/:id/download     // Download file
PATCH /api/documents/:id            // Update metadata
DELETE /api/documents/:id           // Delete document and file
```

**Multer Configuration:**

Located in `/backend/src/config/multer.js`:

```javascript
const { upload, setUploadResourceType, deleteFile } = require('../config/multer');

// Apply to routes
router.post('/:id/documents',
  requirePermission('documents.upload'),
  setUploadResourceType('patients'),  // Organizes files by resource type
  upload.array('files', 10),          // Accept up to 10 files
  validateDocumentUpload,
  controller.uploadDocumentsHandler
);
```

**Storage Organization:**

Files are stored in `/backend/uploads/` with this structure:
```
uploads/
├── patients/
│   ├── 2024-01-05/
│   │   ├── 550e8400-e29b-41d4-a716-446655440000.pdf
│   │   └── 650e8400-e29b-41d4-a716-446655440001.jpg
├── visits/
│   └── 2024-01-05/
│       └── 750e8400-e29b-41d4-a716-446655440002.png
└── users/
    └── 2024-01-05/
        └── 850e8400-e29b-41d4-a716-446655440003.jpg
```

**Document Model Fields:**
```javascript
{
  id: UUID,
  resource_type: 'patients' | 'visits' | 'users',
  resource_id: UUID,
  document_type: String,
  original_filename: String,
  stored_filename: String (UUID-based),
  file_path: String,
  mime_type: String,
  file_size: Integer (bytes),
  title: String (optional),
  description: Text (optional),
  metadata: JSON (optional),
  created_by: UUID,
  updated_by: UUID,
  created_at: DateTime,
  updated_at: DateTime
}
```

**RBAC Integration:**

Document permissions are managed through the standard RBAC system:
- `documents.upload`: Upload files
- `documents.read`: View and download files
- `documents.update`: Modify document metadata
- `documents.delete`: Delete documents

**Role Assignments:**
- **ADMIN**: All document permissions
- **DIETITIAN**: All document permissions (for assigned patients)
- **ASSISTANT**: Upload and read only
- **VIEWER**: Read only

**Security Features:**
1. **MIME Type Validation**: Only allowed file types accepted
2. **File Size Limits**: 10MB per file prevents abuse
3. **Filename Sanitization**: UUID-based names prevent path traversal
4. **Access Control**: Service layer validates resource ownership
5. **Audit Logging**: All operations logged with user/IP/timestamp

**Usage Example:**

```javascript
// Service layer
const documentService = require('./services/document.service');

// Upload documents
const documents = await documentService.uploadDocuments(
  req.files,                    // From multer
  {
    resource_type: 'patients',
    resource_id: patientId,
    document_type: 'lab_result',
    title: 'Blood Test Results',
    description: 'Annual physical'
  },
  req.user,                     // Authenticated user
  {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path
  }
);

// Retrieve documents
const documents = await documentService.getDocumentsByResource(
  'patients',
  patientId,
  req.user,
  requestMetadata
);

// Delete document (removes file and database record)
await documentService.deleteDocument(documentId, req.user, requestMetadata);
```

**Error Handling:**

Common errors:
- `NO_FILES`: No files provided in request
- `DOCUMENT_NOT_FOUND`: Document ID doesn't exist
- `PATIENT_NOT_FOUND`: Parent resource doesn't exist
- `NOT_ASSIGNED_DIETITIAN`: Dietitian not assigned to this patient
- `ACCESS_DENIED`: Insufficient permissions
- Invalid file type error from Multer
- File size exceeded error from Multer

**Testing File Uploads:**

Using curl:
```bash
# Upload single file
curl -X POST http://localhost:3001/api/patients/{id}/documents \
  -H "Authorization: Bearer {token}" \
  -F "files=@/path/to/file.pdf" \
  -F "document_type=medical_record" \
  -F "title=Medical History"

# Upload multiple files
curl -X POST http://localhost:3001/api/patients/{id}/documents \
  -H "Authorization: Bearer {token}" \
  -F "files=@/path/to/file1.pdf" \
  -F "files=@/path/to/file2.jpg" \
  -F "document_type=lab_result"

# Download file
curl -X GET http://localhost:3001/api/documents/{id}/download \
  -H "Authorization: Bearer {token}" \
  -O -J
```

### Data Export System

**Overview:**

NutriVault supports exporting data to CSV, Excel (XLSX), and PDF formats for patients, visits, and billing records.

**Supported Formats:**
- **CSV**: Comma-separated values (universal compatibility)
- **Excel (XLSX)**: Microsoft Excel format with styling
- **PDF**: Portable Document Format with tabular layout

**API Endpoints:**

```javascript
// Export patients data
GET /api/export/patients?format=csv|excel|pdf&is_active=true
  - Permission: export.patients
  - Filters: is_active (boolean)
  - Returns: File download (CSV/Excel/PDF)

// Export visits data
GET /api/export/visits?format=csv|excel|pdf&patient_id=xxx&status=completed
  - Permission: export.visits
  - Filters: patient_id (UUID), status (scheduled|completed|cancelled|no-show)
  - Returns: File download (CSV/Excel/PDF)

// Export billing data
GET /api/export/billing?format=csv|excel|pdf&patient_id=xxx&status=paid
  - Permission: export.billing
  - Filters: patient_id (UUID), status (pending|paid|overdue|cancelled)
  - Returns: File download (CSV/Excel/PDF)
```

**Export Libraries:**

- **CSV**: `json2csv` - Converts JSON to CSV format
- **Excel**: `exceljs` - Creates Excel workbooks with styling
- **PDF**: `pdfkit` - Generates PDF documents

**Features:**

1. **Format-Specific Styling**:
   - CSV: Plain text, universally compatible
   - Excel: Bold headers, gray background, auto-column width
   - PDF: Title, timestamp, tabular layout with auto-pagination

2. **RBAC Integration**:
   - Dietitians: Can only export their assigned patients' data
   - Admins: Can export all data
   - Requires specific export permissions (export.patients, export.visits, export.billing)

3. **Automatic Filename Generation**:
   - Pattern: `{resource}_{YYYY-MM-DD}.{extension}`
   - Example: `patients_2024-01-05.csv`

4. **Rate Limiting**:
   - Export limiter: 10 requests per hour (resource-intensive)
   - Applied to all export endpoints

5. **Audit Logging**:
   - All export operations logged with format and record count
   - Includes user, IP, timestamp, and resource type

**Exported Data Fields:**

**Patients Export:**
- ID, First Name, Last Name, Date of Birth
- Gender, Email, Phone
- City, Postal Code, Country
- Assigned Dietitian, Is Active, Created At

**Visits Export:**
- ID, Patient Name, Visit Date
- Visit Type, Status, Chief Complaint
- Dietitian, Duration, Created At

**Billing Export:**
- Invoice Number, Patient Name
- Invoice Date, Due Date
- Amount, Amount Paid, Status
- Payment Method, Visit Date, Created At

**Usage Example:**

```javascript
// Service layer
const exportService = require('./services/export.service');

// Export patients to Excel
const result = await exportService.exportPatients(
  'excel',
  { is_active: true },
  req.user,
  requestMetadata
);

// Returns: { data: Buffer, contentType: string, extension: string }

// Send as download
res.setHeader('Content-Type', result.contentType);
res.setHeader('Content-Disposition', `attachment; filename="patients_2024-01-05.${result.extension}"`);
res.send(result.data);
```

**Testing Exports:**

Using curl:
```bash
# Export patients to CSV
curl -X GET "http://localhost:3001/api/export/patients?format=csv" \
  -H "Authorization: Bearer {token}" \
  -O -J

# Export visits to Excel
curl -X GET "http://localhost:3001/api/export/visits?format=excel&status=completed" \
  -H "Authorization: Bearer {token}" \
  -O -J

# Export billing to PDF
curl -X GET "http://localhost:3001/api/export/billing?format=pdf&status=paid" \
  -H "Authorization: Bearer {token}" \
  -O -J
```

**Error Handling:**

Common errors:
- `INVALID_FORMAT`: Unsupported export format (not csv/excel/pdf)
- `NO_DATA`: No records available for export
- `PERMISSION_DENIED`: User lacks export permission
- `NOT_ASSIGNED_DIETITIAN`: Dietitian trying to export unassigned patients

**Performance Considerations:**

- Large exports (>1000 records) may take several seconds
- CSV is fastest, PDF is slowest
- Export rate limiter prevents abuse (10 exports/hour)
- All exports processed in-memory (suitable for typical practice sizes)

**Future Enhancements:**
- Streaming exports for very large datasets
- Custom field selection
- Scheduled automated exports
- Email delivery of exported files
- Additional formats (JSON, XML)

### Authentication System

**Dual Authentication Support:**
1. **JWT Tokens**: Bearer token in Authorization header
2. **API Keys**: `x-api-key` or `api-key` header

**Authentication Flow:**
```javascript
// Middleware checks in order:
1. Extract Bearer token from Authorization header
2. If token exists, verify JWT and load user with role/permissions
3. If no token, check for API key header
4. If API key exists, validate and load associated user
5. If neither exists, return 401 Unauthorized
```

**Account Security:**
- Failed login attempts tracked (account lockout after threshold)
- `locked_until` timestamp prevents access during lockout period
- `is_active` flag for account activation/deactivation
- Password hashing with bcrypt (12+ rounds)

**Token Management:**
- Access tokens: Short-lived (15-30 min)
- Refresh tokens: Stored in RefreshToken model (7-30 days)
- API keys: Hashed in database, optional expiration

### RBAC Middleware Patterns

**Common middleware combinations:**

```javascript
// Permission-based
router.get('/patients',
  authenticate,
  requirePermission('patients.read'),
  controller
);

// Role-based
router.delete('/users/:id',
  authenticate,
  requireRole('ADMIN'),
  controller
);

// Multiple permissions (OR logic)
router.get('/resource',
  authenticate,
  requireAnyPermission(['resource.read', 'resource.admin']),
  controller
);

// Multiple permissions (AND logic)
router.post('/sensitive',
  authenticate,
  requireAllPermissions(['resource.create', 'resource.sensitive']),
  controller
);

// Ownership or permission
router.put('/users/:id',
  authenticate,
  requireOwnerOrPermission('userId', 'users.update'),
  controller
);

// Assigned dietitian check (for patient data)
router.get('/patients/:id',
  authenticate,
  requireAssignedDietitian(),
  controller
);
```

**Available RBAC functions:**
- `requirePermission(permission)` - Single permission
- `requireAnyPermission([...])` - At least one permission (OR)
- `requireAllPermissions([...])` - All permissions required (AND)
- `requireRole(roleName)` - Specific role required
- `requireAnyRole([...])` - At least one role
- `requireOwnerOrPermission(field, permission)` - Owner or has permission
- `requireAssignedDietitian()` - For patient data access control
- `hasPermission(user, permission)` - Helper function
- `hasRole(user, roleName)` - Helper function
- `isAdmin(user)` - Helper function

### Service Layer Pattern

**Controllers handle HTTP, Services handle business logic:**

```javascript
// Controller (backend/src/controllers/):
async function getPatients(req, res, next) {
  try {
    const patients = await patientService.getPatients(req.user, req.query);
    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
}

// Service (backend/src/services/):
async function getPatients(user, filters) {
  // Business logic
  // Audit logging
  // Data access
  return patients;
}
```

**Services are responsible for:**
- Business logic validation
- Audit logging via `audit.service.js`
- Database transactions
- Complex queries and data transformations
- Authorization checks beyond basic RBAC (e.g., assigned dietitian validation)

### Error Handling

**Custom AppError class:**
```javascript
const { AppError } = require('./middleware/errorHandler');

// Throw structured errors
throw new AppError('User not found', 404, 'USER_NOT_FOUND');
throw new AppError('Permission denied', 403, 'PERMISSION_DENIED');
```

**Centralized error handler** (`middleware/errorHandler.js`):
- Catches all errors
- Formats consistent error responses
- Logs errors appropriately
- Returns JSON with `success: false, error: { code, message, ... }`

**Authorization failures** automatically logged to `audit_logs` table with:
- User ID and username
- Action type (PERMISSION_CHECK, ROLE_CHECK, etc.)
- Resource information
- Request metadata (IP, user agent, method, path)
- Failure reason

### Database Models & Relationships

**12 Models Total:**

1. **Role** - 4 roles: ADMIN, DIETITIAN, ASSISTANT, VIEWER
2. **Permission** - 40 granular permissions (format: `resource.action`)
3. **RolePermission** - Many-to-many junction table
4. **User** - System users with authentication
5. **Patient** - Patient demographics and medical info
6. **Visit** - Patient appointments/consultations
7. **VisitMeasurement** - Vitals, BMI, blood pressure per visit
8. **Billing** - Invoices and payments
9. **AuditLog** - Comprehensive audit trail
10. **RefreshToken** - JWT refresh token management
11. **ApiKey** - API key authentication
12. **Document** - Polymorphic file uploads (patients, visits, users)

**Key Relationships:**
- User → Role (many-to-one)
- Role ↔ Permission (many-to-many via RolePermission)
- Patient → User as assigned_dietitian_id
- Visit → Patient, Visit → User (dietitian)
- Visit → VisitMeasurement (one-to-many)
- Billing → Patient, Billing → Visit
- Document → User as created_by/updated_by (polymorphic: resource_type + resource_id)
- All models track `created_by`/`updated_by` → User

**Permission Format Examples:**
- `patients.create`, `patients.read`, `patients.update`, `patients.delete`
- `visits.create`, `visits.read`, `visits.update`, `visits.delete`
- `billing.create`, `billing.read`, `billing.update`, `billing.delete`
- `users.create`, `users.read`, `users.update`, `users.delete`
- `documents.upload`, `documents.read`, `documents.update`, `documents.delete`
- `export.patients`, `export.visits`, `export.billing`
- `audit_logs.read`, `reports.read`, etc.

### Audit Logging

All sensitive operations logged to `audit_logs` table:

**What gets logged:**
- All CRUD operations on patients, visits, billing, users
- Authentication events (LOGIN, LOGOUT, TOKEN_REFRESH)
- Authorization failures
- Password changes
- Account status changes

**Audit record includes:**
- User identification (user_id, username)
- Action type (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
- Resource identification (resource_type, resource_id)
- Request metadata (ip_address, user_agent, request_method, request_path)
- Changes (before/after values in JSON format)
- Status (SUCCESS, FAILURE) and severity (INFO, WARNING, ERROR, CRITICAL)

**Usage in services:**
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
  // ... request metadata
});
```

### SQLite vs PostgreSQL

**Development**: SQLite at `backend/data/nutrivault_dev.db`
- Zero configuration
- Auto-created on first migration
- File-based, single-user

**Production**: PostgreSQL
- Set `NODE_ENV=production` and configure `DB_HOST`, `DB_NAME`, etc.
- Supports concurrent connections
- Advanced features (JSONB, UUID type, etc.)

**Migration Compatibility**:
All migrations must work with both databases:
- Use Sequelize abstractions, not raw SQL
- UUIDs: TEXT (SQLite) vs UUID type (PostgreSQL)
- JSON: TEXT (SQLite) vs JSONB (PostgreSQL)
- Booleans: TINYINT(1) (SQLite) vs BOOLEAN (PostgreSQL)

## Configuration Files

### Environment Variables

**Backend** (`/backend/.env`):
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

# Authentication (MUST change in production)
JWT_SECRET=change-this-to-a-secure-random-string-min-32-chars
REFRESH_TOKEN_SECRET=change-this-to-a-different-secure-random-string
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Frontend** (`/frontend/.env` - when implemented):
```bash
VITE_API_URL=http://localhost:3001/api
VITE_ENV=development
```

## Development Workflow

### Adding a New API Endpoint

1. **Add route** in `/backend/src/routes/{resource}.routes.js`:
   ```javascript
   router.post('/',
     authenticate,
     requirePermission('resource.create'),
     controller.create
   );
   ```

2. **Add controller** in `/backend/src/controllers/{resource}.controller.js`:
   ```javascript
   async function create(req, res, next) {
     try {
       const result = await service.create(req.user, req.body);
       res.status(201).json({ success: true, data: result });
     } catch (error) {
       next(error);
     }
   }
   ```

3. **Add service** in `/backend/src/services/{resource}.service.js`:
   ```javascript
   async function create(user, data) {
     // Validate
     // Business logic
     // Database operation
     // Audit logging
     return result;
   }
   ```

4. **Register route** in `/backend/src/server.js`:
   ```javascript
   const resourceRoutes = require('./routes/{resource}.routes');
   app.use('/api/{resource}', resourceRoutes);
   ```

### Creating Database Migrations

**Location**: `/migrations/` (root level, NOT `/backend/migrations/`)

**Naming**: `YYYYMMDDHHMMSS-description.js`

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

    await queryInterface.addIndex('table_name', ['field_name']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('table_name');
  }
};
```

**Requirements**:
- Must support both SQLite and PostgreSQL
- Use Sequelize abstractions only
- Provide both `up` and `down` functions
- Foreign keys require parent tables to exist first

### Creating Seeders

**Location**: `/seeders/` (root level)

**Naming**: `YYYYMMDDHHMMSS-description.js`

**Pattern**: Check for existing records before inserting to avoid duplicates

## Default Credentials

After running `npm run db:seed`:

**Admin User:**
- Username: `admin`
- Password: `Admin123!`
- Email: `admin@nutrivault.local`
- Role: ADMIN (all 29 permissions)

**⚠️ Change before production deployment**

## Copilot Integration

The `.github/copilot-instructions.md` file defines code review guidelines for:

**Prompt files** (`.prompt.md`):
- Must have frontmatter with `mode`, `description` (required)
- Should specify `tools` and `model` fields
- Filename: lowercase-with-hyphens

**Instruction files** (`.instructions.md`):
- Must have frontmatter with `description` and `applyTo` (glob patterns)
- Used for domain-specific memory and guidance
- Example: `.github/instructions/testing-memory.instructions.md`

**Agent skills** (`skills/` directory):
- Must have `SKILL.md` with frontmatter
- `name` field must match folder name

## Testing

**Backend** (`/backend/tests/`):
- Framework: Jest
- Run: `npm test` (from backend/)
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`
- Target: >80% code coverage

**Note**: Frontend tests not yet implemented

## Troubleshooting

### Database Issues

**"Database locked" error**:
- Close all database connections
- Restart server
- Ensure only one process accessing SQLite

**Migration fails**:
```bash
npm run db:migrate:undo
# Fix migration file
npm run db:migrate
```

**Can't find models**:
- Models are at `/models/`, NOT `/backend/src/models/`
- Use correct require path: `require('../../models')` from `backend/src/`

**Seed data duplicates**:
```bash
npm run db:seed:undo
npm run db:seed
```

### Authentication Issues

**"Invalid token" errors**:
- Check JWT_SECRET matches between token creation and verification
- Verify token hasn't expired
- Check Authorization header format: `Bearer <token>`

**"Account locked" errors**:
- User exceeded failed login attempts
- Check `locked_until` timestamp in users table
- Wait for lockout period or manually clear in database

## Documentation

- **Full specification**: `/NUTRIVAULT_SPECIFICATION.md`
- **Visit workflow improvements**: `/VISIT_WORKFLOW_IMPROVEMENTS.md` - Detailed plan for improving visit creation workflow
<!-- - **Database setup**: `/DATABASE_SETUP_SUMMARY.md`
- **DevOps setup**: `/PHASE1_DEVOPS_COMPLETE.md`
- **Authentication**: `/AUTHENTICATION_COMPLETE.md`
- **RBAC system**: `/RBAC_COMPLETE.md`
- **Backend progress**: `/PHASE2_BACKEND_STARTED.md`
- **Project tracker**: `/PROJECT_TODO.md` (auto-updated via `npm run update-todo`) -->

## Internationalization (i18n)

The application supports both English and French through react-i18next:

**Configuration**: `frontend/src/i18n.js`
- Language detection via localStorage (`i18nextLng` key)
- Fallback language: French
- Supported languages: `en`, `fr`

**Locale Files**:
- English: `frontend/src/locales/en.json`
- French: `frontend/src/locales/fr.json`

**Usage in Components**:
```javascript
import { useTranslation } from 'react-i18next';

const Component = () => {
  const { t } = useTranslation();
  return <h1>{t('patients.title')}</h1>;
};
```

**Recent Updates**:
- ✅ Fixed missing French translations in PatientDetailModal (all hardcoded English strings replaced)
- ✅ Fixed missing French translations in PatientsPage
- ✅ Added comprehensive visit translations for both languages
- ⚠️ Note: Some older components may still have hardcoded English strings - use grep to find and replace them

## Important Notes

1. **Root-level models**: Unlike typical Node.js projects, Sequelize models live in `/models/` at root, configured via `.sequelizerc`

2. **Database commands run from root**: `npm run db:migrate`, `npm run db:seed`, etc. must run from root directory, not `/backend/`

3. **Backend commands run from backend/**: `npm run dev`, `npm test` run from `/backend/` directory

4. **Dual authentication**: System supports both JWT tokens and API keys on same endpoints

5. **Migration order matters**: Foreign key dependencies require parent tables exist first

6. **Audit everything**: All CRUD on sensitive data (patients, visits, billing, users) must be logged

7. **Multi-agent development**: Project designed with 10-agent collaboration approach (see `/NUTRIVAULT_SPECIFICATION.md`)

8. **Personnal Note**: 
- Do not start a new development phase if you have only 85% left on the current session or 90% on the Current week
- Commit and push at the end of each task of phase.
- Execute all bash command without requeting to proceed.
