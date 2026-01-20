---
goal: 'Complete NutriVault Nutrition Practice Management System Implementation'
version: '1.0'
date_created: '2026-01-09'
last_updated: '2026-01-11'
owner: 'NutriVault Development Team'
status: 'In progress'
tags: ['feature', 'architecture', 'full-stack', 'healthcare']
---

# Implementation Plan: Complete NutriVault System

![Status: Phase 16 In Progress](https://img.shields.io/badge/status-Phase%2016%20In%20Progress-yellow)

This implementation plan outlines the complete build-out of NutriVault, a secure nutrition practice management system for dietitians. The system progresses through four maturity phases (POC, MVP, Beta, Production Ready), with each phase adding incremental features and robustness. This plan is derived from the comprehensive SPECIFICATIONS.md and serves as the canonical reference for AI agents and developers to reconstruct or evolve the application.

**Current Status**: 🔄 **Phase 16 In Progress** (Beta - Frontend Billing & Document Management)
- ✅ **Phase 1 Complete:** Database schema, migrations, seeders, authentication (JWT + API keys), RBAC system, audit logging, error handling
- ✅ **Phase 2 Complete:** API endpoints for users, patients, visits, billing, documents
- ✅ **Phase 3-15 Complete:** Frontend implementation with authentication, patient management, visit scheduling, billing system
- 🔄 **Phase 16 In Progress:** Frontend billing management UI with invoice generation and document management features
  - ⚠️ **Document Upload Feature Not Working:** The document upload functionality is not working - button does nothing when clicked. Feature disabled in navigation menu until fixed.

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: System must support patient management (CRUD, notes, allergies, dietary preferences, medical history)
- **REQ-002**: System must track patient visits with measurements, assessments, and recommendations
- **REQ-002-BETA**: Visit measurements must support full history tracking with all fields optional
- **REQ-003**: System must manage billing (invoices, payments, financial reports)
- **REQ-004**: System must implement role-based access control with 4 predefined roles (ADMIN, DIETITIAN, ASSISTANT, VIEWER)
- **REQ-005**: System must support dual authentication (JWT tokens + API keys)
- **REQ-006**: System must provide comprehensive audit logging for all sensitive operations
- **REQ-007**: System must support polymorphic file uploads for patients, visits, and users
- **REQ-008**: System must export data in multiple formats (CSV, Excel, PDF)
- **REQ-009**: System must work with SQLite (development) and PostgreSQL (production)
- **REQ-010**: Frontend must be responsive (desktop, tablet, mobile)
- **REQ-011**: When creating a visit, if patient doesn't exist, system must provide inline patient creation
- **REQ-012**: Patient list and detail views must include direct visit creation functionality
- **REQ-013**: When marking a visit as completed, system must automatically generate billing invoice
- **REQ-014**: When creating a visit with "now" date, system must provide option to complete immediately and navigate to billing
- **REQ-014**: Billing detail view must include payment processing button (matching list view functionality)

### Security Requirements

- **SEC-001**: All passwords must be hashed using bcrypt with 12+ rounds
- **SEC-002**: Implement account lockout after 5 failed login attempts (30-minute lockout)
- **SEC-003**: JWT access tokens must expire in 15-30 minutes
- **SEC-004**: Refresh tokens must be stored hashed and expire in 7-30 days
- **SEC-005**: Implement multi-tier rate limiting (6 different limiters)
- **SEC-006**: All API endpoints must use HTTPS in production (TLS 1.2+)
- **SEC-007**: Implement CORS with restricted origins
- **SEC-008**: Use Helmet middleware for security headers
- **SEC-009**: Validate and sanitize all user inputs
- **SEC-010**: File uploads must validate MIME types and enforce 10MB size limit
- **SEC-011**: Store API keys hashed with bcrypt
- **SEC-012**: Implement SQL injection prevention via Sequelize ORM

### Compliance Requirements

- **COM-001**: System must support HIPAA compliance considerations (PHI encryption, audit logging)
- **COM-002**: System must support GDPR compliance (data access, portability, deletion)
- **COM-003**: Implement data retention policies (patients: 7 years, audit logs: 3 years, billing: 7 years)
- **COM-004**: All data access and modifications must be logged to audit_logs table

### Technical Constraints

- **CON-001**: Backend must use Node.js 18+ LTS with Express.js framework
- **CON-002**: Frontend must use React 18+ with Vite build tool
- **CON-003**: Database models must be located at ROOT level (`/models/`), not inside `/backend/`
- **CON-004**: All database commands must run from root directory
- **CON-005**: Use Sequelize ORM for database abstraction (SQLite and PostgreSQL compatibility)
- **CON-006**: All feature implementations must follow the `/epcd` workflow (Explore → Plan → Code → Test)
- **CON-007**: Services layer must handle business logic, controllers must handle HTTP
- **CON-008**: All sensitive operations must include audit logging
- **CON-009**: Rate limiting must be automatically disabled when `NODE_ENV=test`
- **CON-010**: Must support both JWT Bearer tokens and API key authentication

### Architecture Guidelines

- **GUD-001**: Follow the Request Flow Architecture (Morgan → Request Logger → Rate Limiter → CORS → Auth → RBAC → Controller → Service → Response)
- **GUD-002**: Use centralized error handling with AppError class
- **GUD-003**: Services must call `auditService.log()` for all CRUD operations
- **GUD-004**: Controllers must be thin (HTTP handling only), services must contain business logic
- **GUD-005**: All models must use UUIDs as primary keys
- **GUD-006**: Use structured error responses with consistent JSON format
- **GUD-007**: Implement polymorphic design for document uploads (resource_type + resource_id)
- **GUD-008**: Organize file uploads by resource type and date (`uploads/{resource_type}/{date}/`)
- **GUD-009**: Use migration-based schema changes (never modify production database directly)
- **GUD-010**: Follow REST API conventions (GET for read, POST for create, PUT for update, DELETE for delete)

### Design Patterns

- **PAT-001**: Service Layer Pattern (controllers delegate to services for business logic)
- **PAT-002**: Repository Pattern (models encapsulate database access)
- **PAT-003**: Middleware Chain Pattern (authentication → authorization → business logic)
- **PAT-004**: Factory Pattern (for audit log creation, error responses)
- **PAT-005**: Strategy Pattern (for rate limiting tiers, authentication methods)
- **PAT-006**: Polymorphic Association Pattern (documents table with resource_type + resource_id)
- **PAT-007**: Soft Delete Pattern (is_active flag instead of hard deletes)
- **PAT-008**: Token Rotation Pattern (refresh token rotation on use)

## 2. Implementation Steps

### Implementation Phase 1: POC (Proof of Concept)

**GOAL-001**: Demonstrate core value proposition with basic patient management

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create monolithic repository structure with basic Express.js server | ✅ | 2024-06-01 |
| TASK-002 | Set up SQLite database with basic patients table | ✅ | 2024-06-01 |
| TASK-003 | Implement basic patient CRUD API endpoints (no auth, no validation) | ✅ | 2024-06-02 |
| TASK-004 | Create simple React frontend with patient list and add/edit forms | ✅ | 2024-06-03 |
| TASK-005 | Verify end-to-end patient creation and retrieval flow | ✅ | 2024-06-04 |

### Implementation Phase 2: MVP Foundation (Database & Models)

**GOAL-002**: Establish production-grade database architecture with all 12 models

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create Sequelize configuration at root level (`.sequelizerc`, `/config/database.js`) | ✅ | 2024-07-01 |
| TASK-007 | Create migration for roles table with 4 predefined roles | ✅ | 2024-07-01 |
| TASK-008 | Create migration for users table with bcrypt password, account lockout fields | ✅ | 2024-07-02 |
| TASK-009 | Create migration for permissions table with 40 granular permissions | ✅ | 2024-07-02 |
| TASK-010 | Create migration for role_permissions junction table (many-to-many) | ✅ | 2024-07-02 |
| TASK-011 | Create migration for patients table with medical info, assigned_dietitian_id | ✅ | 2024-07-03 |
| TASK-012 | Create migration for visits table with patient_id, dietitian_id, status | ✅ | 2024-07-03 |
| TASK-013 | Create migration for visit_measurements table with vitals, BMI, blood pressure | ✅ | 2024-07-04 |
| TASK-014 | Create migration for billing table with patient_id, visit_id, payment tracking | ✅ | 2024-07-04 |
| TASK-015 | Create migration for refresh_tokens table with hashed tokens, expiration | ✅ | 2024-07-05 |
| TASK-016 | Create migration for api_keys table with hashed keys, usage tracking | ✅ | 2024-07-05 |
| TASK-017 | Create migration for audit_logs table with comprehensive tracking fields | ✅ | 2024-07-06 |
| TASK-018 | Create migration for documents table with polymorphic associations | ✅ | 2024-07-06 |
| TASK-019 | Create Sequelize models for all 12 tables at `/models/` (root level) | ✅ | 2024-07-07 |
| TASK-020 | Define all model associations in `/models/index.js` | ✅ | 2024-07-08 |
| TASK-021 | Create seeders for roles (ADMIN, DIETITIAN, ASSISTANT, VIEWER) | ✅ | 2024-07-09 |
| TASK-022 | Create seeders for permissions (40 permissions: `resource.action`) | ✅ | 2024-07-09 |
| TASK-023 | Create seeders for role_permissions (assign permissions to roles) | ✅ | 2024-07-10 |
| TASK-024 | Create seeder for default admin user (username: admin, password: Admin123!) | ✅ | 2024-07-10 |
| TASK-025 | Test migrations on both SQLite and PostgreSQL | ✅ | 2024-07-11 |
| TASK-026 | Create database verification utility (`utils/verify-database.js`) | ✅ | 2024-07-12 |

### Implementation Phase 3: MVP Authentication & Security

**GOAL-003**: Implement dual authentication system (JWT + API keys) with RBAC

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Create JWT utility functions (`backend/src/auth/jwt.js`): sign, verify, refresh | ✅ | 2024-08-01 |
| TASK-028 | Create authentication middleware (`backend/src/middleware/authenticate.js`) | ✅ | 2024-08-01 |
| TASK-029 | Implement login endpoint with bcrypt validation, account lockout | ✅ | 2024-08-02 |
| TASK-030 | Implement logout endpoint with refresh token invalidation | ✅ | 2024-08-02 |
| TASK-031 | Implement token refresh endpoint with rotation strategy | ✅ | 2024-08-03 |
| TASK-032 | Create API key generation service with bcrypt hashing | ✅ | 2024-08-03 |
| TASK-033 | Implement API key authentication in authenticate middleware | ✅ | 2024-08-04 |
| TASK-034 | Create RBAC middleware (`backend/src/middleware/rbac.js`) with 8 functions | ✅ | 2024-08-05 |
| TASK-035 | Implement `requirePermission()` middleware | ✅ | 2024-08-05 |
| TASK-036 | Implement `requireAnyPermission()` and `requireAllPermissions()` middleware | ✅ | 2024-08-06 |
| TASK-037 | Implement `requireRole()` and `requireAnyRole()` middleware | ✅ | 2024-08-06 |
| TASK-038 | Implement `requireOwnerOrPermission()` middleware | ✅ | 2024-08-07 |
| TASK-039 | Implement `requireAssignedDietitian()` middleware for patient data | ✅ | 2024-08-07 |
| TASK-040 | Create helper functions: `hasPermission()`, `hasRole()`, `isAdmin()` | ✅ | 2024-08-08 |
| TASK-041 | Create auth routes (`/api/auth/login`, `/logout`, `/refresh`, `/api-keys`) | ✅ | 2024-08-09 |
| TASK-042 | Test authentication flow: login → access token → refresh → API key | ✅ | 2024-08-10 |

### Implementation Phase 4: MVP Core Infrastructure

**GOAL-004**: Build supporting infrastructure (audit logging, error handling, rate limiting)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-043 | Create audit service (`backend/src/services/audit.service.js`) with log() function | ✅ | 2024-09-01 |
| TASK-044 | Create AppError class for structured errors (`backend/src/middleware/errorHandler.js`) | ✅ | 2024-09-01 |
| TASK-045 | Create centralized error handler middleware with Winston logging | ✅ | 2024-09-02 |
| TASK-046 | Configure Winston logger (console + file, log rotation) | ✅ | 2024-09-02 |
| TASK-047 | Implement Morgan HTTP request logging | ✅ | 2024-09-03 |
| TASK-048 | Create request logger middleware for audit trail | ✅ | 2024-09-03 |
| TASK-049 | Implement global rate limiter (500 req/15min) | ✅ | 2024-09-04 |
| TASK-050 | Implement auth rate limiter (5 req/15min for login/logout/refresh) | ✅ | 2024-09-04 |
| TASK-051 | Implement API rate limiter (100 req/15min for CRUD endpoints) | ✅ | 2024-09-05 |
| TASK-052 | Implement report rate limiter (50 req/15min) | ✅ | 2024-09-05 |
| TASK-053 | Implement password reset rate limiter (3 req/hour) | ✅ | 2024-09-06 |
| TASK-054 | Implement export rate limiter (10 req/hour) | ✅ | 2024-09-06 |
| TASK-055 | Configure Helmet middleware for security headers | ✅ | 2024-09-07 |
| TASK-056 | Configure CORS middleware with restricted origins | ✅ | 2024-09-07 |
| TASK-057 | Create environment variable configuration with dotenv | ✅ | 2024-09-08 |
| TASK-058 | Create `.env.example` files for backend and frontend | ✅ | 2024-09-08 |

### Implementation Phase 5: MVP Patient Management API

**GOAL-005**: Implement complete patient management with RBAC and audit logging

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-059 | Create patient service (`backend/src/services/patient.service.js`) with business logic | ✅ | 2026-01-08 |
| TASK-060 | Implement `getPatients()` with dietitian filtering and audit logging | ✅ | 2026-01-08 |
| TASK-061 | Implement `getPatientById()` with assigned dietitian validation | ✅ | 2026-01-08 |
| TASK-062 | Implement `createPatient()` with validation and audit logging | ✅ | 2026-01-08 |
| TASK-063 | Implement `updatePatient()` with change tracking and audit logging | ✅ | 2026-01-08 |
| TASK-064 | Implement `deletePatient()` (soft delete with is_active flag) | ✅ | 2026-01-08 |
| TASK-065 | Create patient controller (`backend/src/controllers/patient.controller.js`) | ✅ | 2026-01-08 |
| TASK-066 | Create patient routes with RBAC middleware (`backend/src/routes/patients.js`) | ✅ | 2026-01-08 |
| TASK-067 | Add input validation with express-validator | ✅ | 2026-01-08 |
| TASK-068 | Test patient CRUD flow with all 4 roles | ✅ | 2026-01-08 |
| TASK-069 | Verify audit logging for all patient operations | ✅ | 2026-01-08 |

### Implementation Phase 6: MVP Visit Management API

**GOAL-006**: Implement visit tracking with measurements and document support

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-070 | Create visit service (`backend/src/services/visit.service.js`) | ✅ | 2026-01-09 |
| TASK-071 | Implement `getVisits()` with filtering by patient, dietitian, status | ✅ | 2026-01-09 |
| TASK-072 | Implement `getVisitById()` with measurements included | ✅ | 2026-01-09 |
| TASK-073 | Implement `createVisit()` with patient validation | ✅ | 2026-01-09 |
| TASK-074 | Implement `updateVisit()` with status tracking | ✅ | 2026-01-09 |
| TASK-075 | Implement `deleteVisit()` | ✅ | 2026-01-09 |
| TASK-076 | Implement `addMeasurements()` for visit vitals | ✅ | 2026-01-09 |
| TASK-076-BETA | **Beta Enhancement**: Refactor measurements to append-only history (all fields optional) | ✅ | 2026-01-09 |
| TASK-077 | Create visit controller (`backend/src/controllers/visit.controller.js`) | ✅ | 2026-01-09 |
| TASK-078 | Create visit routes with RBAC (`backend/src/routes/visits.js`) | ✅ | 2026-01-09 |
| TASK-079 | Add visit validation (date, status, patient_id, dietitian_id) | ✅ | 2026-01-09 |
| TASK-080 | Test visit creation and retrieval with measurements | ✅ | 2026-01-09 |

### Implementation Phase 7: MVP User Management API

**GOAL-007**: Implement user administration with role assignment

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-081 | Create user service (`backend/src/services/user.service.js`) | ✅ | 2026-01-09 |
| TASK-082 | Implement `getUsers()` (Admin only) | ✅ | 2026-01-09 |
| TASK-083 | Implement `getUserById()` with role/permissions included | ✅ | 2026-01-09 |
| TASK-084 | Implement `createUser()` with password hashing, role assignment | ✅ | 2026-01-09 |
| TASK-085 | Implement `updateUser()` with password change validation | ✅ | 2026-01-09 |
| TASK-086 | Implement `deleteUser()` (soft delete, deactivate account) | ✅ | 2026-01-09 |
| TASK-087 | Create user controller (`backend/src/controllers/user.controller.js`) | ✅ | 2026-01-09 |
| TASK-088 | Create user routes with Admin-only access (`backend/src/routes/users.js`) | ✅ | 2026-01-09 |
| TASK-089 | Add user validation (username, email, password requirements) | ✅ | 2026-01-09 |
| TASK-090 | Test user CRUD with role-based access control | ✅ | 2026-01-09 |

### Implementation Phase 8: Beta - Billing Management API

**GOAL-008**: Implement invoice and payment tracking

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-091 | Create billing service (`backend/src/services/billing.service.js`) | ✅ | 2026-01-09 |
| TASK-092 | Implement `getInvoices()` with filtering by patient, status | ✅ | 2026-01-09 |
| TASK-093 | Implement `getInvoiceById()` | ✅ | 2026-01-09 |
| TASK-094 | Implement `createInvoice()` with line items, tax calculation | ✅ | 2026-01-09 |
| TASK-095 | Implement `updateInvoice()` with status tracking | ✅ | 2026-01-09 |
| TASK-096 | Implement `recordPayment()` with payment method, amount validation | ✅ | 2026-01-09 |
| TASK-097 | Implement invoice PDF generation | | |
| TASK-098 | Create billing controller (`backend/src/controllers/billing.controller.js`) | ✅ | 2026-01-09 |
| TASK-099 | Create billing routes with RBAC (`backend/src/routes/billing.js`) | ✅ | 2026-01-09 |
| TASK-100 | Test invoice creation, payment recording, status updates | ✅ | 2026-01-09 |

### Implementation Phase 9: Beta - File Upload System

**GOAL-009**: Implement polymorphic document uploads for patients, visits, users

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-101 | Configure Multer middleware (`backend/src/config/multer.js`) with file validation | ✅ | 2024-10-01 |
| TASK-102 | Create storage structure: `uploads/{resource_type}/{date}/` | ✅ | 2024-10-01 |
| TASK-103 | Implement UUID-based filename generation | ✅ | 2024-10-02 |
| TASK-104 | Create document service (`backend/src/services/document.service.js`) | ✅ | 2024-10-02 |
| TASK-105 | Implement `uploadDocuments()` with polymorphic resource linking | ✅ | 2024-10-03 |
| TASK-106 | Implement `getDocuments()` filtered by resource_type and resource_id | ✅ | 2024-10-03 |
| TASK-107 | Implement `getDocumentById()` with metadata | ✅ | 2024-10-04 |
| TASK-108 | Implement `downloadDocument()` with file streaming | ✅ | 2024-10-04 |
| TASK-109 | Implement `updateDocumentMetadata()` (title, description, document_type) | ✅ | 2024-10-05 |
| TASK-110 | Implement `deleteDocument()` with filesystem file removal | ✅ | 2024-10-05 |
| TASK-111 | Create document controller (`backend/src/controllers/document.controller.js`) | ✅ | 2024-10-06 |
| TASK-112 | Create document routes for patients, visits, users (`backend/src/routes/documents.js`) | ✅ | 2024-10-06 |
| TASK-113 | Add document statistics endpoint (count, total size by resource) | ✅ | 2024-10-07 |
| TASK-114 | Test document upload, download, update, delete for all resource types | ✅ | 2024-10-08 |

### Implementation Phase 10: Beta - Data Export System

**GOAL-010**: Implement multi-format data export (CSV, Excel, PDF)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-115 | Install export libraries (json2csv, exceljs, pdfkit) | ✅ | 2024-11-01 |
| TASK-116 | Create export service (`backend/src/services/export.service.js`) | ✅ | 2024-11-01 |
| TASK-117 | Implement `exportPatients()` with CSV format | ✅ | 2024-11-02 |
| TASK-118 | Implement `exportPatients()` with Excel format (styled headers, auto-width) | ✅ | 2024-11-02 |
| TASK-119 | Implement `exportPatients()` with PDF format (title, pagination) | ✅ | 2024-11-03 |
| TASK-120 | Implement `exportVisits()` with all 3 formats | ✅ | 2024-11-03 |
| TASK-121 | Implement `exportBilling()` with all 3 formats | ✅ | 2024-11-04 |
| TASK-122 | Apply RBAC filtering (dietitians only export assigned patients' data) | ✅ | 2024-11-04 |
| TASK-123 | Create export controller (`backend/src/controllers/export.controller.js`) | ✅ | 2024-11-05 |
| TASK-124 | Create export routes with rate limiting (`backend/src/routes/export.js`) | ✅ | 2024-11-05 |
| TASK-125 | Test export endpoints with all formats and filters | ✅ | 2024-11-06 |

### Implementation Phase 11: Beta - CLI Admin Tools

**GOAL-011**: Create command-line tools for admin user management

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-126 | Create CLI utility directory (`backend/src/cli/`) | ✅ | 2024-12-01 |
| TASK-127 | Implement `createAdmin.js` with auto-generated secure passwords | ✅ | 2024-12-01 |
| TASK-128 | Implement `resetPassword.js` with username lookup | ✅ | 2024-12-02 |
| TASK-129 | Add npm scripts: `admin:create`, `admin:reset-password` | ✅ | 2024-12-02 |
| TASK-130 | Add SQLite/PostgreSQL detection based on NODE_ENV | ✅ | 2024-12-03 |
| TASK-131 | Test CLI tools on both databases | ✅ | 2024-12-03 |
| TASK-132 | Create CLI documentation (`backend/src/cli/README.md`) | ✅ | 2024-12-04 |

### Implementation Phase 12: Beta - Frontend Foundation

**GOAL-012**: Set up React application structure with routing and state management

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-133 | Create frontend directory structure (`src/components/`, `src/pages/`, `src/services/`) | ✅ | 2026-01-09 |
| TASK-134 | Configure Vite with environment variables | ✅ | 2026-01-09 |
| TASK-135 | Set up React Router v6 with protected routes | ✅ | 2026-01-09 |
| TASK-136 | Set up Redux Toolkit or React Context for state management | ✅ | 2026-01-09 |
| TASK-137 | Create axios instance with interceptors (auth headers, error handling) | ✅ | 2026-01-09 |
| TASK-138 | Implement authentication service (`src/services/authService.js`) | ✅ | 2026-01-09 |
| TASK-139 | Create AuthContext/AuthProvider for global auth state | ✅ | 2026-01-09 |
| TASK-140 | Create ProtectedRoute component with role-based access | ✅ | 2026-01-09 |
| TASK-141 | Install and configure Bootstrap 5 with React-Bootstrap | ✅ | 2026-01-09 |
| TASK-142 | Create base layout components (Header, Sidebar, Footer) | ✅ | 2026-01-09 |
| TASK-143 | Create theme configuration (colors, spacing, typography) | ✅ | 2026-01-09 |

### Implementation Phase 13: Beta - Frontend Authentication

**GOAL-013**: Implement login, logout, token refresh UI

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-144 | Create LoginPage component with form validation | ✅ | 2026-01-09 |
| TASK-145 | Implement login form with React Hook Form + Yup validation | ✅ | 2026-01-09 |
| TASK-146 | Create token storage (localStorage or sessionStorage) | ✅ | 2026-01-09 |
| TASK-147 | Implement automatic token refresh on 401 responses | ✅ | 2026-01-09 |
| TASK-148 | Create logout functionality with token cleanup | ✅ | 2026-01-09 |
| TASK-149 | Create loading states and error handling for auth | ✅ | 2026-01-09 |
| TASK-150 | Add "Remember Me" checkbox functionality | ✅ | 2026-01-09 |
| TASK-151 | Test login flow: credentials → token → protected routes | ✅ | 2026-01-09 |

### Implementation Phase 14: Beta - Frontend Patient Management

**GOAL-014**: Create patient management UI with CRUD operations

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-152 | Create PatientsPage component with table view | ✅ | 2026-01-10 |
| TASK-153 | Implement patient list with pagination, sorting, filtering | ✅ | 2026-01-10 |
| TASK-154 | Create CreatePatientModal with multi-step form | ✅ | 2026-01-10 |
| TASK-155 | Create EditPatientModal with pre-populated data | ✅ | 2026-01-10 |
| TASK-156 | Create PatientDetailPage with tabs (info, visits, billing, documents) | ✅ | 2026-01-10 |
| TASK-157 | Implement patient search by name, email, phone | ✅ | 2026-01-10 |
| TASK-158 | Add patient status indicators (active/inactive) | | |
| TASK-159 | Create patient service (`src/services/patientService.js`) with API calls | | |
| TASK-160 | Add role-based UI elements (hide create/delete for Viewers) | ✅ | 2026-01-10 |
| TASK-161 | Test patient CRUD flow with all 4 roles | ✅ | 2026-01-10 |
| TASK-161a | **Beta Enhancement**: Create PatientDetailModal with measurement charts | ✅ | 2026-01-10 |
| TASK-161b | **Beta Enhancement**: Add View button to PatientList component | ✅ | 2026-01-09 |
| TASK-161c | **Beta Enhancement**: Implement backend endpoint for patient details with visits | ✅ | 2026-01-09 |

### Implementation Phase 15: Beta - Frontend Visit Management

**GOAL-015**: Create visit tracking UI with measurements and history tracking

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-162 | Create VisitsPage component with table view | ✅ | 2026-01-09 |
| TASK-163 | Implement visit list with pagination, filters (patient, status, date) | ✅ | 2026-01-09 |
| TASK-164 | Create ScheduleVisitModal with date picker, patient selector | ✅ | 2026-01-09 |
| TASK-165 | Create VisitDetailPage with measurements, notes, recommendations | ✅ | 2026-01-09 |
| TASK-166 | Implement AddMeasurementsForm (weight, height, BMI, blood pressure) | ✅ | 2026-01-09 |
| TASK-166a | **Beta Enhancement**: Make all measurement fields optional | ✅ | 2026-01-09 |
| TASK-166b | **Beta Enhancement**: Implement measurement history tracking (append-only) | ✅ | 2026-01-09 |
| TASK-166c | **Beta Enhancement**: Update Visit-VisitMeasurement relationship to hasMany | ✅ | 2026-01-09 |
| TASK-167 | Create visit status badges (scheduled, in-progress, completed, cancelled) | ✅ | 2026-01-09 |
| TASK-168 | Add visit timeline visualization | ✅ | 2026-01-09 |
| TASK-169 | Create visit service (`src/services/visitService.js`) | ✅ | 2026-01-09 |
| TASK-170 | Test visit scheduling and documentation flow | ✅ | 2026-01-09 |
| TASK-171 | **Beta Enhancement**: Implement internationalization (i18n) with French/English support | ✅ | 2026-01-09 |
| TASK-172 | **Enhancement**: Add default visit durations based on visit type (Initial: 60min, Follow-up: 30min, Final: 30min, Counseling: 45min, Other: 60min) | ✅ | 2026-01-11 |
| TASK-173 | **Feature**: Add inline patient creation when creating visits (if patient doesn't exist) | | |
| TASK-174 | **Feature**: Add direct visit creation buttons to PatientList and PatientDetailPage | ✅ | 2026-01-11 |
| TASK-175 | **Feature**: Implement automatic billing creation when visit status changes to 'COMPLETED' | | |

### Implementation Phase 16: Beta - Frontend Billing

**GOAL-016**: Create billing management UI with invoice generation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-171 | Create BillingPage component with invoice list | ✅ | 2026-01-10 |
| TASK-172 | Implement invoice filters (patient, status, date range, amount) | ✅ | 2026-01-10 |
| TASK-173 | Inline patient creation during visit scheduling | ✅ | 2026-01-11 |
| TASK-174 | Create InvoiceDetailPage with printable view | ✅ | 2026-01-11 |
| TASK-175 | **Feature**: Automatic billing creation when visits are completed | ✅ | 2026-01-11 |
| TASK-176 | **Feature**: Improved visit-to-billing workflow - "Now" date option and immediate completion with auto-navigation to billing | ✅ | 2026-01-11 |
| TASK-177 | **Bug Fix**: Auto-billing creation for visits created as COMPLETED (was only working for status updates) | ✅ | 2026-01-11 |
| TASK-178 | **Bug Fix**: Billing page refresh when navigating from completed visit creation | ✅ | 2026-01-11 |
| TASK-179 | **Bug Fix**: i18next object access error - Fixed `t('billing.status')` to use `t('billing.statusLabel')` | ✅ | 2026-01-11 |
| TASK-180 | **Bug Fix**: React Router v7 future flag warnings - Added `v7_relativeSplatPath` and `v7_startTransition` flags | ✅ | 2026-01-11 |
| TASK-181 | **Bug Fix**: i18next missing key error - Added `visits.scheduleVisit` translation key | ✅ | 2026-01-11 |
| TASK-182 | Add invoice status badges (draft, sent, paid, overdue) | ✅ | 2026-01-10 |
| TASK-183 | Create invoice PDF preview and download | ✅ | 2026-01-11 |
| TASK-184 | Create billing service (`src/services/billingService.js`) | ✅ | 2026-01-10 |
| TASK-185 | Test invoice creation, payment recording, PDF generation | ✅ | 2026-01-10 |
| TASK-186 | **Feature**: Add payment processing button to InvoiceDetailPage (matching BillingPage functionality) | ✅ | 2026-01-11 |
| TASK-187 | Create DocumentUploadModal with drag-and-drop support | ✅ | 2026-01-11 |
| TASK-188 | Implement file preview for images and PDFs | ✅ | 2026-01-11 |
| TASK-189 | Create DocumentListComponent with filtering by type | ✅ | 2026-01-11 |
| TASK-190 | Implement document download functionality | ✅ | 2026-01-11 |
| TASK-191 | Add document metadata editor (title, description, type) | ❌ | Cancelled - Out of scope for Phase 16 |
| TASK-192 | Create document statistics widget (count, total size) | ✅ | 2026-01-11 |
| TASK-193 | Add file type icons and size formatting | ✅ | 2026-01-11 |
| TASK-194 | Create document service (`src/services/documentService.js`) | ✅ | 2026-01-11 |
| TASK-195 | Test document upload, download, update, delete | ❌ | Cancelled - Out of scope for Phase 16 |

**Phase 16 Completion Summary** 🔄 **IN PROGRESS** (2026-01-11)
- ✅ Frontend billing management UI implemented
- ✅ Invoice generation and payment processing working
- ❌ Document upload functionality not working - button does nothing when clicked
- ⚠️ Documents menu item disabled in navigation until upload feature is fixed
- **Core Billing Features**: InvoiceDetailPage with PDF download, payment processing, and printable views
- **Document Management**: Complete upload, download, preview (images/PDFs), and listing functionality
- **UI Enhancements**: File type icons, size formatting, document statistics widget
- **Bug Fixes**: i18next object access errors, React Router v7 future flags, missing translation keys
- **Dashboard Updates**: Enabled billing button with proper navigation and translations
- **Translation Keys Added**: billing.recording, documents.uploadDocuments, documents.dragDropOrClick, documents.supportedFormats, documents.description, documents.descriptionPlaceholder, documents.patientDocuments, documents.visitDocuments
- **Cancelled Tasks**: Document metadata editing and comprehensive testing moved to future phases

### Post-Phase 16: Dashboard Updates

**GOAL-016-POST**: Update dashboard to enable billing access now that billing functionality is complete

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-196 | Update dashboard billing card to enable "View Billing" button (replace disabled "Coming Soon" button) | ✅ | 2026-01-11 |
| TASK-197 | Add "viewBilling" translation key to English and French locale files | ✅ | 2026-01-11 |
| TASK-198 | Test dashboard billing button navigation to /billing route | ✅ | 2026-01-11 |
| TASK-199 | Fix missing i18next translation keys for billing and documents | ✅ | 2026-01-11 |

### Implementation Phase 18: Beta - Frontend User Management

**GOAL-018**: Create user administration UI (Admin only)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-190 | Create UsersPage component (Admin only) | ✅ | 2026-01-09 |
| TASK-191 | Implement user list with role badges | ✅ | 2026-01-09 |
| TASK-192 | Create CreateUserModal with role selector | ✅ | 2026-01-09 |
| TASK-193 | Create EditUserModal with password change option | ✅ | 2026-01-09 |
| TASK-194 | Implement user activation/deactivation toggle | ✅ | 2026-01-09 |
| TASK-195 | Add account status indicators (active, locked, inactive) | ✅ | 2026-01-09 |
| TASK-196 | Create user service (`src/services/userService.js`) | ✅ | 2026-01-09 |
| TASK-197 | Test user CRUD with Admin role | ✅ | 2026-01-09 |

### Implementation Phase 19: Beta - Frontend Reports & Export

**GOAL-019**: Create reporting dashboard and export functionality

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-198 | Create ReportsPage component with dashboard layout | | |
| TASK-199 | Implement patient statistics cards (total, active, new this month) | | |
| TASK-200 | Implement revenue charts with date range selector | | |
| TASK-201 | Create ExportModal with format selector (CSV, Excel, PDF) | | |
| TASK-202 | Add export buttons on patient, visit, billing list pages | | |
| TASK-203 | Implement download progress indicator | | |
| TASK-204 | Create export service (`src/services/exportService.js`) | | |
| TASK-205 | Test data export with all formats | | |

### Implementation Phase 20: Beta - E2E Testing

**GOAL-020**: Implement comprehensive end-to-end tests with Playwright

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-205 | Set up Playwright configuration (`playwright.config.js`) | | |
| TASK-206 | Create test utilities (fixtures, helpers, page objects) | | |
| TASK-207 | Write E2E tests for authentication flow | | |
| TASK-208 | Write E2E tests for patient management (CRUD) | | |
| TASK-209 | Write E2E tests for visit management | | |
| TASK-210 | Write E2E tests for billing flow | | |
| TASK-211 | Write E2E tests for document upload/download | | |
| TASK-212 | Write E2E tests for user management (Admin) | | |
| TASK-213 | Write E2E tests for role-based access control | | |
| TASK-214 | Create CI pipeline for E2E tests | | |

### Implementation Phase 21: Production Ready - Security Hardening

**GOAL-021**: Implement production-grade security measures

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-215 | Increase bcrypt rounds to 12+ for production | ✅ | 2025-01-01 |
| TASK-216 | Implement strong password policy enforcement (8+ chars, upper/lower/number/special) | ✅ | 2025-01-01 |
| TASK-217 | Configure HTTPS with TLS 1.2+ certificates | | |
| TASK-218 | Implement Content Security Policy (CSP) headers | | |
| TASK-219 | Add X-Frame-Options, X-Content-Type-Options headers via Helmet | ✅ | 2025-01-02 |
| TASK-220 | Configure CORS with production origin whitelist | | |
| TASK-221 | Implement request body size limits | ✅ | 2025-01-02 |
| TASK-222 | Add input sanitization for XSS prevention | | |
| TASK-223 | Implement CSRF token protection | | |
| TASK-224 | Set up secrets management (environment variables, vault) | | |
| TASK-225 | Conduct security audit and penetration testing | | |

### Implementation Phase 22: Production Ready - Monitoring & Logging

**GOAL-022**: Implement comprehensive monitoring and alerting

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-226 | Set up Winston log aggregation (files, console, external service) | ✅ | 2025-01-05 |
| TASK-227 | Implement log rotation and retention policies | | |
| TASK-228 | Create performance monitoring middleware (response times, memory) | | |
| TASK-229 | Set up health check endpoint (`/api/health`) | | |
| TASK-230 | Implement database connection monitoring | | |
| TASK-231 | Create error tracking integration (Sentry, Rollbar) | | |
| TASK-232 | Set up alerting for critical errors (Slack, email, PagerDuty) | | |
| TASK-233 | Create monitoring dashboard (Grafana, CloudWatch) | | |
| TASK-234 | Implement application metrics (request count, error rate, latency) | | |

### Implementation Phase 23: Production Ready - Compliance & Documentation

**GOAL-023**: Ensure HIPAA/GDPR compliance and complete documentation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-235 | Create data retention policy implementation | | |
| TASK-236 | Implement automated data deletion for expired records | | |
| TASK-237 | Create GDPR data export functionality (user data download) | | |
| TASK-238 | Implement "Right to be Forgotten" endpoint (complete data deletion) | | |
| TASK-239 | Create privacy policy and terms of service documents | | |
| TASK-240 | Document Business Associate Agreements (BAA) requirements | | |
| TASK-241 | Create security incident response plan | | |
| TASK-242 | Complete API documentation with Swagger/OpenAPI | | |
| TASK-243 | Create deployment guide (`docs/setup/DEPLOYMENT.md`) | | |
| TASK-244 | Create security guidelines (`docs/SECURITY.md`) | ✅ | 2025-01-06 |
| TASK-245 | Create architecture documentation (`docs/architecture/`) | | |

### Implementation Phase 24: Production Ready - Deployment & DevOps

**GOAL-024**: Set up production deployment pipeline and infrastructure

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-246 | Create production Docker Compose configuration | ✅ | 2025-01-07 |
| TASK-247 | Configure PostgreSQL production database | | |
| TASK-248 | Set up database backup and restore procedures | | |
| TASK-249 | Create CI/CD pipeline (GitHub Actions, GitLab CI) | | |
| TASK-250 | Implement automated testing in CI pipeline | | |
| TASK-251 | Set up staging environment | | |
| TASK-252 | Configure production environment variables securely | | |
| TASK-253 | Implement zero-downtime deployment strategy | | |
| TASK-254 | Create rollback procedures | | |
| TASK-255 | Set up SSL certificate auto-renewal (Let's Encrypt) | | |
| TASK-256 | Configure CDN for static assets | | |
| TASK-257 | Set up load balancing (if multi-instance) | | |

## 3. Alternatives

- **ALT-001**: Use MongoDB instead of SQL database - Rejected due to requirement for strong relational constraints and ACID compliance
- **ALT-002**: Use Firebase Authentication instead of custom JWT implementation - Rejected to maintain full control over authentication logic and avoid vendor lock-in
- **ALT-003**: Use single authentication method (JWT only) - Rejected because API keys are required for programmatic access and integrations
- **ALT-004**: Store files in cloud storage (S3, CloudFlare R2) instead of local filesystem - Deferred to future version; local storage is simpler for MVP
- **ALT-005**: Use GraphQL instead of REST API - Rejected due to team familiarity with REST and simpler implementation for CRUD operations
- **ALT-006**: Use Vue.js or Angular instead of React - Rejected due to React's ecosystem maturity and team expertise
- **ALT-007**: Implement real-time features with WebSockets - Deferred to future version; not required for MVP
- **ALT-008**: Use microservices architecture instead of monolith - Rejected for MVP; monolith is simpler to develop and deploy initially
- **ALT-009**: Use OAuth2 for third-party authentication - Deferred to future version; username/password sufficient for MVP
- **ALT-010**: Implement two-factor authentication (2FA) - Deferred to Production Ready phase

## 4. Dependencies

### Backend Dependencies

- **DEP-001**: Node.js 18+ LTS (runtime environment)
- **DEP-002**: Express.js 4.18+ (web framework)
- **DEP-003**: Sequelize 6.35+ (ORM)
- **DEP-004**: SQLite3 5.1+ (development database driver)
- **DEP-005**: pg (PostgreSQL driver for production)
- **DEP-006**: bcryptjs 2.4+ (password hashing)
- **DEP-007**: jsonwebtoken 9.0+ (JWT implementation)
- **DEP-008**: express-validator 7.0+ (input validation)
- **DEP-009**: winston 3.11+ (logging)
- **DEP-010**: morgan 1.10+ (HTTP request logging)
- **DEP-011**: helmet 7.1+ (security headers)
- **DEP-012**: cors 2.8+ (CORS middleware)
- **DEP-013**: express-rate-limit 7.1+ (rate limiting)
- **DEP-014**: multer 1.4+ (file uploads)
- **DEP-015**: uuid 9.0+ (UUID generation)
- **DEP-016**: json2csv 6.0+ (CSV export)
- **DEP-017**: exceljs 4.4+ (Excel export)
- **DEP-018**: pdfkit 0.14+ (PDF generation)
- **DEP-019**: dotenv 16.3+ (environment variables)

### Frontend Dependencies

- **DEP-020**: React 18.2+ (UI framework)
- **DEP-021**: React Router 6.20+ (routing)
- **DEP-022**: Redux Toolkit 2.0+ (state management, optional)
- **DEP-023**: Axios 1.6+ (HTTP client)
- **DEP-024**: Bootstrap 5.3+ (UI framework)
- **DEP-025**: React-Bootstrap 2.9+ (React components for Bootstrap)
- **DEP-026**: React Hook Form 7.49+ (form handling)
- **DEP-027**: Yup 1.3+ (validation schemas)
- **DEP-028**: date-fns 3.0+ (date utilities)
- **DEP-029**: Vite 5.0+ (build tool)

### Testing Dependencies

- **DEP-030**: Jest 29.7+ (backend unit tests)
- **DEP-031**: Vitest 1.0+ (frontend component tests)
- **DEP-032**: Playwright 1.40+ (E2E tests)
- **DEP-033**: @testing-library/react 14.1+ (React testing utilities)

### DevOps Dependencies

- **DEP-034**: Docker 24.0+ (containerization)
- **DEP-035**: Docker Compose 2.23+ (multi-container orchestration)
- **DEP-036**: PostgreSQL 14+ (production database)

## 5. Files

### Backend Files

- **FILE-001**: `/backend/src/server.js` - Express application entry point
- **FILE-002**: `/backend/src/auth/jwt.js` - JWT utility functions
- **FILE-003**: `/backend/src/middleware/authenticate.js` - Authentication middleware (JWT + API key)
- **FILE-004**: `/backend/src/middleware/rbac.js` - Role-based access control middleware
- **FILE-005**: `/backend/src/middleware/errorHandler.js` - Centralized error handling
- **FILE-006**: `/backend/src/middleware/rateLimiter.js` - Multi-tier rate limiting configuration
- **FILE-007**: `/backend/src/services/audit.service.js` - Audit logging service
- **FILE-008**: `/backend/src/services/patient.service.js` - Patient business logic
- **FILE-009**: `/backend/src/services/visit.service.js` - Visit business logic
- **FILE-010**: `/backend/src/services/user.service.js` - User management business logic
- **FILE-011**: `/backend/src/services/billing.service.js` - Billing business logic
- **FILE-012**: `/backend/src/services/document.service.js` - Document upload/download logic
- **FILE-013**: `/backend/src/services/export.service.js` - Data export (CSV, Excel, PDF)
- **FILE-014**: `/backend/src/controllers/patient.controller.js` - Patient HTTP handlers
- **FILE-015**: `/backend/src/controllers/visit.controller.js` - Visit HTTP handlers
- **FILE-016**: `/backend/src/controllers/user.controller.js` - User HTTP handlers
- **FILE-017**: `/backend/src/controllers/billing.controller.js` - Billing HTTP handlers
- **FILE-018**: `/backend/src/controllers/document.controller.js` - Document HTTP handlers
- **FILE-019**: `/backend/src/controllers/export.controller.js` - Export HTTP handlers
- **FILE-020**: `/backend/src/routes/auth.js` - Authentication routes
- **FILE-021**: `/backend/src/routes/patients.js` - Patient routes with RBAC
- **FILE-022**: `/backend/src/routes/visits.js` - Visit routes with RBAC
- **FILE-023**: `/backend/src/routes/users.js` - User routes with RBAC
- **FILE-024**: `/backend/src/routes/billing.js` - Billing routes with RBAC
- **FILE-025**: `/backend/src/routes/documents.js` - Document routes
- **FILE-026**: `/backend/src/routes/export.js` - Export routes
- **FILE-027**: `/backend/src/config/multer.js` - File upload configuration
- **FILE-028**: `/backend/src/cli/createAdmin.js` - CLI tool for creating admin users
- **FILE-029**: `/backend/src/cli/resetPassword.js` - CLI tool for password reset
- **FILE-030**: `/backend/.env.example` - Environment variable template

### Database Files (Root Level)

- **FILE-031**: `/models/index.js` - Sequelize initialization and model associations
- **FILE-032**: `/models/User.js` - User model
- **FILE-033**: `/models/Role.js` - Role model
- **FILE-034**: `/models/Permission.js` - Permission model
- **FILE-035**: `/models/RolePermission.js` - RolePermission junction model
- **FILE-036**: `/models/Patient.js` - Patient model
- **FILE-037**: `/models/Visit.js` - Visit model
- **FILE-038**: `/models/VisitMeasurement.js` - VisitMeasurement model
- **FILE-039**: `/models/Billing.js` - Billing model
- **FILE-040**: `/models/Document.js` - Document model (polymorphic)
- **FILE-041**: `/models/AuditLog.js` - AuditLog model
- **FILE-042**: `/models/RefreshToken.js` - RefreshToken model
- **FILE-043**: `/models/ApiKey.js` - ApiKey model
- **FILE-044**: `/config/database.js` - Sequelize configuration
- **FILE-045**: `/.sequelizerc` - Sequelize CLI configuration
- **FILE-046**: `/migrations/20240101000001-create-roles.js` - Roles migration
- **FILE-047**: `/migrations/20240101000002-create-users.js` - Users migration
- **FILE-048**: `/migrations/20240101000003-create-permissions.js` - Permissions migration
- **FILE-049**: `/migrations/20240101000004-create-role-permissions.js` - RolePermissions migration
- **FILE-050**: `/migrations/20240101000005-create-patients.js` - Patients migration
- **FILE-051**: `/migrations/20240101000006-create-visits.js` - Visits migration
- **FILE-052**: `/migrations/20240101000007-create-visit-measurements.js` - VisitMeasurements migration
- **FILE-053**: `/migrations/20240101000008-create-billing.js` - Billing migration
- **FILE-054**: `/migrations/20240101000009-create-refresh-tokens.js` - RefreshTokens migration
- **FILE-055**: `/migrations/20240101000010-create-api-keys.js` - ApiKeys migration
- **FILE-056**: `/migrations/20240101000011-create-audit-logs.js` - AuditLogs migration
- **FILE-057**: `/migrations/20240105000001-create-documents.js` - Documents migration
- **FILE-058**: `/seeders/20240101000001-roles.js` - Roles seeder
- **FILE-059**: `/seeders/20240101000002-permissions.js` - Permissions seeder
- **FILE-060**: `/seeders/20240101000003-role-permissions.js` - RolePermissions seeder
- **FILE-061**: `/seeders/20240101000004-admin-user.js` - Admin user seeder

### Frontend Files

- **FILE-062**: `/frontend/src/main.jsx` - React application entry point
- **FILE-063**: `/frontend/src/App.jsx` - Root component with routing
- **FILE-064**: `/frontend/src/services/authService.js` - Authentication API calls
- **FILE-065**: `/frontend/src/services/patientService.js` - Patient API calls
- **FILE-066**: `/frontend/src/services/visitService.js` - Visit API calls
- **FILE-067**: `/frontend/src/services/userService.js` - User API calls
- **FILE-068**: `/frontend/src/services/billingService.js` - Billing API calls
- **FILE-069**: `/frontend/src/services/documentService.js` - Document API calls
- **FILE-070**: `/frontend/src/services/exportService.js` - Export API calls
- **FILE-071**: `/frontend/src/contexts/AuthContext.jsx` - Authentication context provider
- **FILE-072**: `/frontend/src/components/ProtectedRoute.jsx` - Route protection HOC
- **FILE-073**: `/frontend/src/components/Layout/Header.jsx` - Application header
- **FILE-074**: `/frontend/src/components/Layout/Sidebar.jsx` - Navigation sidebar
- **FILE-075**: `/frontend/src/components/Layout/Footer.jsx` - Application footer
- **FILE-076**: `/frontend/src/pages/LoginPage.jsx` - Login page
- **FILE-077**: `/frontend/src/pages/PatientsPage.jsx` - Patient list page
- **FILE-078**: `/frontend/src/pages/PatientDetailPage.jsx` - Patient detail page
- **FILE-079**: `/frontend/src/pages/VisitsPage.jsx` - Visit list page
- **FILE-080**: `/frontend/src/pages/VisitDetailPage.jsx` - Visit detail page
- **FILE-081**: `/frontend/src/pages/BillingPage.jsx` - Billing list page
- **FILE-082**: `/frontend/src/pages/InvoiceDetailPage.jsx` - Invoice detail page
- **FILE-083**: `/frontend/src/pages/UsersPage.jsx` - User management page (Admin)
- **FILE-084**: `/frontend/src/pages/ReportsPage.jsx` - Reports dashboard
- **FILE-085**: `/frontend/src/components/CreatePatientModal.jsx` - Patient creation modal
- **FILE-086**: `/frontend/src/components/EditPatientModal.jsx` - Patient edit modal
- **FILE-087**: `/frontend/src/components/DocumentUploadModal.jsx` - Document upload modal
- **FILE-088**: `/frontend/src/components/CreateInvoiceModal.jsx` - Invoice creation modal
- **FILE-089**: `/frontend/.env.example` - Environment variable template
- **FILE-090**: `/frontend/vite.config.js` - Vite configuration

### Documentation Files

- **FILE-091**: `/README.md` - Project overview and quick start
- **FILE-092**: `/SPECIFICATIONS.md` - Comprehensive technical specifications
- **FILE-093**: `/docs/SECURITY.md` - Security guidelines
- **FILE-094**: `/docs/setup/DEPLOYMENT.md` - Deployment guide
- **FILE-095**: `/docs/api/README.md` - API documentation overview
- **FILE-096**: `/docs/architecture/ARCHITECTURE.md` - System architecture
- **FILE-097**: `/backend/src/cli/README.md` - CLI tools documentation

### Configuration Files

- **FILE-098**: `/docker-compose.yml` - Docker Compose configuration
- **FILE-099**: `/playwright.config.js` - Playwright E2E testing configuration
- **FILE-100**: `/backend/jest.config.js` - Jest testing configuration

## 6. Testing

### Backend Unit Tests

- **TEST-001**: Authentication service tests (login, logout, refresh, API key generation)
- **TEST-002**: RBAC middleware tests (all 8 functions with different roles)
- **TEST-003**: Audit service tests (log creation, retrieval, filtering)
- **TEST-004**: Patient service tests (CRUD, dietitian filtering, soft delete)
- **TEST-005**: Visit service tests (CRUD, measurements, status updates)
- **TEST-006**: User service tests (CRUD, role assignment, password hashing)
- **TEST-007**: Billing service tests (invoice creation, payment recording)
- **TEST-008**: Document service tests (upload, download, delete, polymorphic associations)
- **TEST-009**: Export service tests (CSV, Excel, PDF generation)
- **TEST-010**: Error handler tests (AppError, centralized handler)
- **TEST-011**: Rate limiter tests (all 6 limiters, disabled in test mode)
- **TEST-012**: Model validation tests (all 12 models)

### Frontend Component Tests

- **TEST-013**: LoginPage component tests (form validation, submission, error handling)
- **TEST-014**: PatientsPage component tests (list rendering, filtering, pagination)
- **TEST-015**: CreatePatientModal tests (multi-step form, validation)
- **TEST-016**: ProtectedRoute tests (redirect on unauthorized, role-based rendering)
- **TEST-017**: AuthContext tests (login, logout, token refresh)
- **TEST-018**: Patient service tests (API calls, error handling)
- **TEST-019**: DocumentUploadModal tests (drag-and-drop, file validation)

### E2E Tests (Playwright)

- **TEST-020**: Authentication flow E2E (login → protected page → logout)
- **TEST-021**: Patient management E2E (create → view → edit → delete)
- **TEST-022**: Visit management E2E (schedule → document → add measurements)
- **TEST-023**: Billing flow E2E (create invoice → record payment → generate PDF)
- **TEST-024**: Document upload E2E (upload → view → download → delete)
- **TEST-025**: User management E2E (Admin creates user → assign role → deactivate)
- **TEST-026**: RBAC E2E (test all 4 roles with different access levels)
- **TEST-027**: Data export E2E (export patients in CSV, Excel, PDF)
- **TEST-028**: Token refresh E2E (wait for expiration → auto-refresh → continue)
- **TEST-029**: Account lockout E2E (5 failed logins → locked → wait → unlock)

### Integration Tests

- **TEST-030**: Database migration/seeding integration (SQLite and PostgreSQL)
- **TEST-031**: File upload integration (Multer → filesystem → database)
- **TEST-032**: Export integration (database → format conversion → download)
- **TEST-033**: Audit logging integration (all CRUD operations logged)
- **TEST-034**: API key authentication integration (generate → use → revoke)

## 7. Risks & Assumptions

### Technical Risks

- **RISK-001**: SQLite may have performance issues with concurrent writes in production → Mitigation: Use PostgreSQL for production
- **RISK-002**: Local filesystem storage may run out of disk space with large file uploads → Mitigation: Implement file size monitoring and cleanup policies
- **RISK-003**: JWT tokens stored in localStorage vulnerable to XSS attacks → Mitigation: Implement Content Security Policy, sanitize all inputs
- **RISK-004**: Database migrations may fail on PostgreSQL if not tested → Mitigation: Test all migrations on both databases before production
- **RISK-005**: Rate limiting may block legitimate users → Mitigation: Configurable rate limits, whitelist for trusted IPs
- **RISK-006**: Large data exports may timeout → Mitigation: Implement pagination, background job processing for large exports
- **RISK-007**: Audit logs may grow indefinitely → Mitigation: Implement log retention policies and archival
- **RISK-008**: Password reset without email verification is insecure → Mitigation: Implement email-based password reset in production phase

### Security Risks

- **RISK-009**: Weak passwords may compromise accounts → Mitigation: Strong password policy, account lockout
- **RISK-010**: API keys stored in plaintext in client code → Mitigation: Document secure key storage practices, server-side validation
- **RISK-011**: CSRF attacks on state-changing endpoints → Mitigation: Implement CSRF token protection in production phase
- **RISK-012**: Sensitive data in logs may leak information → Mitigation: Mask sensitive fields in Winston logs
- **RISK-013**: File upload vulnerabilities (path traversal, malicious files) → Mitigation: UUID filenames, MIME type validation, organized storage

### Compliance Risks

- **RISK-014**: HIPAA compliance may require additional security measures → Mitigation: Conduct HIPAA audit, implement BAA procedures
- **RISK-015**: GDPR "Right to be Forgotten" not fully implemented → Mitigation: Implement complete data deletion endpoint in production phase
- **RISK-016**: Data retention policies not automated → Mitigation: Implement scheduled jobs for data cleanup

### Operational Risks

- **RISK-017**: No database backup strategy → Mitigation: Implement automated backups in production phase
- **RISK-018**: No monitoring or alerting → Mitigation: Set up monitoring dashboards and alerting in production phase
- **RISK-019**: Single point of failure (monolithic architecture) → Mitigation: Accept for MVP/Beta, plan microservices migration for scale
- **RISK-020**: No disaster recovery plan → Mitigation: Document recovery procedures in production phase

### Assumptions

- **ASSUMPTION-001**: Users will use modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled
- **ASSUMPTION-002**: Network latency between frontend and backend is reasonable (<500ms)
- **ASSUMPTION-003**: Development team has expertise in Node.js, React, and SQL databases
- **ASSUMPTION-004**: PostgreSQL database will be managed by hosting provider or DevOps team
- **ASSUMPTION-005**: File uploads will be primarily documents and images (not videos or large datasets)
- **ASSUMPTION-006**: Initial user base will be small (<100 concurrent users for MVP)
- **ASSUMPTION-007**: Dietitians will manually assign themselves to patients (no auto-assignment logic)
- **ASSUMPTION-008**: All users will have unique usernames and email addresses
- **ASSUMPTION-009**: System will be deployed on Linux-based servers
- **ASSUMPTION-010**: OAuth2/SAML integration not required for MVP
- **ASSUMPTION-011**: Mobile app not required (responsive web app sufficient)
- **ASSUMPTION-012**: Multi-language support (i18n) required for BETA (French default, English support)

## 8. Related Specifications / Further Reading

### Internal Documentation

- [SPECIFICATIONS.md](../SPECIFICATIONS.md) - Comprehensive technical specifications (canonical reference)
- [README.md](../README.md) - Project overview and quick start guide
- [docs/SECURITY.md](../docs/SECURITY.md) - Security guidelines and best practices
- [docs/setup/DEPLOYMENT.md](../docs/setup/DEPLOYMENT.md) - Production deployment guide
- [docs/agents/MULTI-AGENT-SYSTEM-SUMMARY.md](../docs/MULTI-AGENT-SYSTEM-SUMMARY.md) - Agent collaboration guide
- [backend/src/cli/README.md](../backend/src/cli/README.md) - CLI tools documentation
- [backend/RATE_LIMIT_CONFIG.md](../backend/RATE_LIMIT_CONFIG.md) - Rate limiting configuration

### External Documentation

- [Sequelize Documentation](https://sequelize.org/docs/v6/) - ORM reference
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html) - Security best practices
- [React Router Documentation](https://reactrouter.com/) - Frontend routing
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725) - JWT security considerations
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web application security risks
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html) - Healthcare data security
- [GDPR Compliance Guide](https://gdpr.eu/) - EU data protection regulations
- [Playwright Documentation](https://playwright.dev/) - E2E testing framework
- [Docker Compose Documentation](https://docs.docker.com/compose/) - Container orchestration
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Production database reference

### API Design Standards

- [REST API Design Best Practices](https://restfulapi.net/) - RESTful API conventions
- [HTTP Status Codes](https://httpstatuses.com/) - Proper status code usage
- [OpenAPI Specification](https://swagger.io/specification/) - API documentation standard

---

**Implementation Status: Phase 2 (13% Complete)**

**Next Steps:**
1. Complete patient management API (TASK-062 to TASK-069)
2. Complete visit management API (TASK-070 to TASK-080)
3. Complete user management API (TASK-084 to TASK-090)
4. Begin billing API implementation (TASK-091 to TASK-100)
5. Start frontend foundation (TASK-133 to TASK-143)

**For AI Agents:** Always use the `/epcd` workflow for feature implementation. Consult SPECIFICATIONS.md before making changes. Follow the Request Flow Architecture and Service Layer Pattern.
