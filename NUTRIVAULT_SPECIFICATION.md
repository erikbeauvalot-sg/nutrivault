# NutriVault - Complete Specification

## Project Overview
**NutriVault** - A secure, full-stack web application for dietitians to manage patient data, appointments, billing, and visit records with comprehensive audit logging and role-based access control.

**Tagline**: *Your complete nutrition practice management system*

---

## 1. TECHNOLOGY STACK

### Frontend
- **Framework**: React 18+
- **UI Library**: Bootstrap 5+ with React-Bootstrap
- **State Management**: Redux Toolkit or React Context API
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form with Yup validation
- **Date Handling**: date-fns or Day.js
- **Routing**: React Router v6+
- **Build Tool**: Vite or Create React App

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **API Style**: RESTful API
- **Authentication**: JWT (JSON Web Tokens) + Refresh Tokens
- **Password Hashing**: bcrypt
- **API Documentation**: Swagger/OpenAPI 3.0
- **Validation**: express-validator or Joi
- **Rate Limiting**: express-rate-limit
- **CORS**: cors middleware

### Database
- **Development DB**: SQLite 3+ (lightweight, file-based, zero-configuration)
- **Production DB**: PostgreSQL 14+ (relational data, scalable)
- **Alternative Production DB**: MySQL 8+ or MongoDB 6+ (if document-based preferred)
- **ORM**: Sequelize (SQL) or Prisma (SQL) - both support SQLite and PostgreSQL
- **Migrations**: Built-in ORM migration tools
- **Backup Strategy**: Daily automated backups with retention policy (production only)

### Logging & Monitoring
- **Application Logging**: Winston or Pino
- **HTTP Logging**: Morgan
- **Log Levels**: ERROR, WARN, INFO, DEBUG, TRACE
- **Log Storage**: File system (rotating logs) + optional ELK stack or cloud logging

---

## 2. DATA ARCHITECTURE

### 2.1 Database Configuration

#### Development Database: SQLite
For local development, use SQLite for its simplicity and zero-configuration setup:

**Benefits:**
- No separate database server installation required
- File-based storage (`nutrivault_dev.db`)
- Fast setup for development and testing
- Perfect for single-developer environments
- Easy to reset and seed with test data
- Supports all required SQL features

**Configuration:**
```javascript
// config/database.js
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './data/nutrivault_dev.db',
    logging: console.log
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:', // In-memory for tests
    logging: false
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    logging: false
  }
};
```

**SQLite Limitations to Note:**
- No native UUID type (use TEXT and application-level UUID generation)
- No INET type (use TEXT for IP addresses)
- Limited ALTER TABLE support (handle in migrations)
- Case-insensitive LIKE by default (acceptable for development)

**Migration Strategy:**
- Write migrations compatible with both SQLite and PostgreSQL
- Test migrations on both databases before production deployment
- Use ORM abstractions to handle dialect differences

#### Production Database: PostgreSQL
For production, PostgreSQL provides:
- Robust concurrent access
- Advanced indexing and query optimization
- Native UUID and INET types
- JSON/JSONB support for flexible data
- Full ACID compliance
- Horizontal scalability

### 2.2 Database Schema (SQL)

#### Table: `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

#### Table: `roles`
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `permissions`
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- 'patients.read', 'patients.write', 'billing.read', etc.
    resource VARCHAR(50) NOT NULL, -- 'patients', 'visits', 'billing', 'users'
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'list'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `role_permissions`
```sql
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);
```

#### Table: `api_keys`
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Descriptive name for the key
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

#### Table: `patients`
```sql
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20), -- 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    medical_notes TEXT,
    dietary_preferences TEXT,
    allergies TEXT,
    is_active BOOLEAN DEFAULT true,
    assigned_dietitian_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

#### Table: `visits`
```sql
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    dietitian_id UUID REFERENCES users(id),
    visit_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL,
    visit_type VARCHAR(50), -- 'INITIAL_CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ONLINE', 'IN_PERSON'
    status VARCHAR(50) DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
    chief_complaint TEXT,
    assessment TEXT,
    recommendations TEXT,
    next_visit_date DATE,
    private_notes TEXT, -- Only visible to dietitian
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

#### Table: `visit_measurements`
```sql
CREATE TABLE visit_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    bmi DECIMAL(4,2),
    waist_circumference_cm DECIMAL(5,2),
    body_fat_percentage DECIMAL(4,2),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `billing`
```sql
CREATE TABLE billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'
    payment_method VARCHAR(50), -- 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'INSURANCE'
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

#### Table: `audit_logs`
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN'
    resource_type VARCHAR(50) NOT NULL, -- 'patient', 'visit', 'billing', 'user', etc.
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10), -- 'GET', 'POST', 'PUT', 'DELETE'
    request_path TEXT,
    changes JSONB, -- Store before/after values for updates
    status VARCHAR(20), -- 'SUCCESS', 'FAILURE'
    error_message TEXT,
    severity VARCHAR(20), -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    session_id VARCHAR(255),
    api_key_id UUID REFERENCES api_keys(id)
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### Table: `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);
```

### 2.2 Entity Relationships
- One User has One Role (Many-to-One)
- One Role has Many Permissions (Many-to-Many via role_permissions)
- One Patient has Many Visits (One-to-Many)
- One Visit has One Patient (Many-to-One)
- One Visit has One Dietitian/User (Many-to-One)
- One Visit can have Multiple Measurements (One-to-Many)
- One Patient has Many Billing Records (One-to-Many)
- One Visit can have One Billing Record (One-to-One or One-to-Many)
- One User can have Multiple API Keys (One-to-Many)

---

## 3. AUTHENTICATION & AUTHORIZATION

### 3.1 Authentication Mechanisms

#### Username/Password Authentication
1. User submits username and password to `/api/auth/login`
2. Server validates credentials against `users` table
3. On success:
   - Generate JWT access token (short-lived, 15-30 minutes)
   - Generate refresh token (long-lived, 7-30 days)
   - Store refresh token hash in database
   - Return both tokens to client
   - Log successful login in audit_logs
4. On failure:
   - Increment failed_login_attempts
   - Lock account after 5 failed attempts for 30 minutes
   - Log failed login attempt

#### API Key Authentication
1. User generates API key via `/api/auth/api-keys` endpoint
2. Server generates random key (e.g., `diet_ak_randomstring`)
3. Store hash of key in database with prefix
4. Return full key ONCE to user
5. For API requests, key sent in `X-API-Key` header
6. Server validates key hash and checks expiration
7. Log API key usage

#### Token Refresh Flow
1. Client sends refresh token to `/api/auth/refresh`
2. Server validates token from database
3. If valid, issue new access token
4. Return new access token
5. Optionally rotate refresh token

### 3.2 Role-Based Access Control (RBAC)

#### Predefined Roles

**ADMIN**
- Full system access
- User management (create, update, delete users)
- Role and permission management
- System configuration
- View all audit logs
- Access all patient data

**DIETITIAN**
- Manage assigned patients (create, read, update)
- Create and manage visits for assigned patients
- Create and manage billing for assigned patients
- View own activity logs
- Cannot delete patients or users
- Cannot access system configuration

**ASSISTANT**
- View assigned patient data (read-only for medical notes)
- Create visits and schedule appointments
- Create billing records
- Limited update permissions
- Cannot delete records

**VIEWER**
- Read-only access to patient data
- View visit history
- View billing information
- Cannot create or modify any data

#### Permission Naming Convention
Format: `resource.action`

Examples:
- `patients.create`
- `patients.read`
- `patients.update`
- `patients.delete`
- `patients.list`
- `visits.create`
- `billing.read`
- `users.manage`
- `roles.manage`
- `audit_logs.read`
- `api_keys.create`

### 3.3 Authorization Middleware Implementation

```javascript
// Pseudocode for permission check
function requirePermission(permission) {
    return async (req, res, next) => {
        const user = req.user; // From JWT or API key
        const userPermissions = await getUserPermissions(user.role_id);

        if (userPermissions.includes(permission)) {
            next();
        } else {
            logAuditEvent({
                user_id: user.id,
                action: 'AUTHORIZATION_FAILURE',
                resource: permission,
                severity: 'WARNING'
            });
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
    };
}

// Usage in routes
router.post('/patients',
    authenticate,
    requirePermission('patients.create'),
    createPatient
);
```

---

## 4. API ENDPOINTS SPECIFICATION

### 4.1 Authentication Endpoints

#### POST `/api/auth/register` (Admin only)
- Create new user account
- Request: `{ username, email, password, first_name, last_name, role_id }`
- Response: `{ user: {...}, message: "User created successfully" }`
- Audit: Log user creation

#### POST `/api/auth/login`
- Authenticate user
- Request: `{ username, password }`
- Response: `{ access_token, refresh_token, user: {...} }`
- Audit: Log login attempt (success/failure)

#### POST `/api/auth/logout`
- Invalidate refresh token
- Request: `{ refresh_token }`
- Response: `{ message: "Logged out successfully" }`
- Audit: Log logout

#### POST `/api/auth/refresh`
- Get new access token
- Request: `{ refresh_token }`
- Response: `{ access_token }`
- Audit: Log token refresh

#### POST `/api/auth/api-keys`
- Generate new API key
- Request: `{ name, expires_at }`
- Response: `{ api_key, key_id, message: "Save this key securely" }`
- Audit: Log API key creation

#### GET `/api/auth/api-keys`
- List user's API keys
- Response: `{ api_keys: [{id, name, prefix, created_at, expires_at, last_used_at}] }`

#### DELETE `/api/auth/api-keys/:id`
- Revoke API key
- Audit: Log API key deletion

### 4.2 User Management Endpoints

#### GET `/api/users`
- List all users (Admin only)
- Query params: `?page=1&limit=20&role=DIETITIAN&search=john`
- Response: `{ users: [...], total, page, limit }`
- Audit: Log list access

#### GET `/api/users/:id`
- Get user details
- Permission: `users.read` or own profile
- Response: `{ user: {...} }`
- Audit: Log user view

#### PUT `/api/users/:id`
- Update user
- Permission: `users.update` or own profile (limited fields)
- Request: `{ email, first_name, last_name, role_id, is_active }`
- Response: `{ user: {...} }`
- Audit: Log changes with before/after values

#### DELETE `/api/users/:id`
- Deactivate user (soft delete)
- Permission: `users.delete`
- Response: `{ message: "User deactivated" }`
- Audit: Log user deletion

### 4.3 Patient Management Endpoints

#### GET `/api/patients`
- List patients
- Permission: `patients.list`
- Query params: `?page=1&limit=20&search=smith&dietitian_id=uuid&is_active=true`
- Response: `{ patients: [...], total, page, limit }`
- Audit: Log list access with filters

#### POST `/api/patients`
- Create patient
- Permission: `patients.create`
- Request: `{ first_name, last_name, date_of_birth, email, phone, ... }`
- Response: `{ patient: {...}, id }`
- Audit: Log patient creation with full data

#### GET `/api/patients/:id`
- Get patient details
- Permission: `patients.read`
- Response: `{ patient: {...}, visit_count, last_visit_date }`
- Audit: Log patient view

#### PUT `/api/patients/:id`
- Update patient
- Permission: `patients.update`
- Request: Partial patient object
- Response: `{ patient: {...} }`
- Audit: Log changes with before/after values

#### DELETE `/api/patients/:id`
- Deactivate patient (soft delete)
- Permission: `patients.delete`
- Response: `{ message: "Patient deactivated" }`
- Audit: Log patient deletion

### 4.4 Visit Management Endpoints

#### GET `/api/visits`
- List visits
- Permission: `visits.list`
- Query params: `?patient_id=uuid&dietitian_id=uuid&from_date=2024-01-01&to_date=2024-12-31&status=COMPLETED`
- Response: `{ visits: [...], total }`
- Audit: Log list access with filters

#### POST `/api/visits`
- Create visit
- Permission: `visits.create`
- Request: `{ patient_id, dietitian_id, visit_date, duration_minutes, visit_type, ... }`
- Response: `{ visit: {...}, id }`
- Audit: Log visit creation

#### GET `/api/visits/:id`
- Get visit details
- Permission: `visits.read`
- Response: `{ visit: {...}, measurements: {...} }`
- Audit: Log visit view

#### PUT `/api/visits/:id`
- Update visit
- Permission: `visits.update`
- Request: Partial visit object
- Response: `{ visit: {...} }`
- Audit: Log changes with before/after values

#### DELETE `/api/visits/:id`
- Delete visit (hard delete or soft)
- Permission: `visits.delete`
- Response: `{ message: "Visit deleted" }`
- Audit: Log visit deletion

#### POST `/api/visits/:id/measurements`
- Add measurements to visit
- Permission: `visits.update`
- Request: `{ weight_kg, height_cm, bmi, ... }`
- Response: `{ measurement: {...} }`
- Audit: Log measurement addition

### 4.5 Billing Endpoints

#### GET `/api/billing`
- List invoices
- Permission: `billing.list`
- Query params: `?patient_id=uuid&status=PENDING&from_date=2024-01-01`
- Response: `{ invoices: [...], total_amount, total }`
- Audit: Log list access

#### POST `/api/billing`
- Create invoice
- Permission: `billing.create`
- Request: `{ patient_id, visit_id, amount, due_date, ... }`
- Response: `{ invoice: {...}, id }`
- Audit: Log invoice creation

#### GET `/api/billing/:id`
- Get invoice details
- Permission: `billing.read`
- Response: `{ invoice: {...} }`
- Audit: Log invoice view

#### PUT `/api/billing/:id`
- Update invoice
- Permission: `billing.update`
- Request: Partial invoice object
- Response: `{ invoice: {...} }`
- Audit: Log changes with before/after values

#### POST `/api/billing/:id/payment`
- Record payment
- Permission: `billing.update`
- Request: `{ payment_method, payment_date, amount }`
- Response: `{ invoice: {...} }`
- Audit: Log payment recording

### 4.6 Audit & Reporting Endpoints

#### GET `/api/audit-logs`
- View audit logs
- Permission: `audit_logs.read`
- Query params: `?user_id=uuid&action=UPDATE&resource_type=patient&from=timestamp&to=timestamp&severity=ERROR`
- Response: `{ logs: [...], total }`
- Audit: Log audit log access (meta-logging)

#### GET `/api/reports/patient-statistics`
- Patient statistics
- Permission: `reports.read`
- Response: `{ total_patients, active_patients, by_age_group, by_dietitian }`

#### GET `/api/reports/revenue`
- Revenue reports
- Permission: `billing.read`
- Query params: `?from_date=2024-01-01&to_date=2024-12-31&group_by=month`
- Response: `{ total_revenue, by_month: [...], by_status: {...} }`

---

## 5. AUDIT LOGGING REQUIREMENTS

### 5.1 Logging Levels

**ERROR** - Application errors, failed operations
- Database connection failures
- Unhandled exceptions
- Failed critical operations

**WARN** - Warning conditions, authorization failures
- Failed login attempts
- Permission denied actions
- Invalid input data
- Expired tokens

**INFO** - Important business events
- User login/logout
- CRUD operations on sensitive data (patients, billing)
- Permission changes
- Configuration changes

**DEBUG** - Detailed information for debugging
- API requests and responses
- Database queries
- Middleware execution
- Validation results

**TRACE** - Very detailed diagnostic information
- Function entry/exit
- Variable values
- Loop iterations

### 5.2 What to Log

#### Authentication Events
- User login (success/failure)
- User logout
- Password changes
- Token generation/refresh
- API key creation/usage/deletion
- Account lockouts

#### Authorization Events
- Permission denied attempts
- Role changes
- Permission modifications

#### Data Access & Modification
- Patient creation/update/deletion
- Visit creation/update/deletion
- Billing record creation/update/payment
- User creation/update/deletion
- All DELETE operations

#### System Events
- Application start/stop
- Configuration changes
- Database migrations
- Backup operations

### 5.3 Log Entry Format

```javascript
{
    timestamp: "2024-01-15T10:30:45.123Z",
    level: "INFO",
    user_id: "uuid",
    username: "john.doe",
    action: "UPDATE",
    resource_type: "patient",
    resource_id: "uuid",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0...",
    request_method: "PUT",
    request_path: "/api/patients/uuid",
    changes: {
        before: { email: "old@example.com" },
        after: { email: "new@example.com" }
    },
    status: "SUCCESS",
    duration_ms: 45,
    session_id: "session-uuid",
    api_key_id: null,
    correlation_id: "req-uuid" // For tracing requests across services
}
```

### 5.4 Log Storage & Rotation

- Store application logs in files: `logs/app-{date}.log`
- Store audit logs in database table: `audit_logs`
- Rotate daily logs, keep 90 days
- Archive old logs to cold storage after 90 days
- Separate error logs: `logs/error-{date}.log`
- JSON format for structured logging
- Optional: Stream to centralized logging service (ELK, CloudWatch, etc.)

---

## 6. SECURITY REQUIREMENTS

### 6.1 Authentication Security
- Passwords must be hashed with bcrypt (cost factor 12+)
- Minimum password requirements: 8 chars, uppercase, lowercase, number, special char
- JWT access tokens expire in 15-30 minutes
- Refresh tokens expire in 7-30 days
- Store only token hashes in database
- Implement account lockout after 5 failed attempts
- Rate limit login endpoint: 5 attempts per minute per IP

### 6.2 API Security
- HTTPS only in production (TLS ->1.2)
- CORS configuration restricting allowed origins
- Rate limiting on all endpoints (100 req/min per user)
- Input validation on all endpoints (sanitize, validate types)
- SQL injection prevention via parameterized queries (ORM)
- XSS prevention via output encoding and CSP headers
- CSRF protection for state-changing operations
- Request size limits (prevent DoS)

### 6.3 Data Privacy
- Encrypt sensitive data at rest (medical notes, SSN if stored)
- Encrypt data in transit (HTTPS)
- Implement data retention policies
- GDPR compliance: data export, right to deletion
- HIPAA compliance considerations for medical data
- Mask sensitive data in logs (passwords, tokens, PII)
- Implement field-level access control for sensitive fields

### 6.4 API Key Security
- Generate cryptographically secure random keys (32+ bytes)
- Store only hashed versions (bcrypt or HMAC-SHA256)
- Include key prefix for identification (e.g., `diet_ak_`)
- Support key expiration dates
- Allow key revocation
- Log all API key usage
- Limit active keys per user

---

## 7. FRONTEND REQUIREMENTS

### 7.1 Pages & Components

#### Public Pages
- Login page (`/login`)
- Password reset request (`/forgot-password`)
- Password reset form (`/reset-password/:token`)

#### Authenticated Pages
- Dashboard (`/dashboard`)
  - Statistics cards (total patients, visits this month, pending invoices)
  - Recent activity feed
  - Upcoming appointments calendar

- Patient Management (`/patients`)
  - Patient list with search, filter, pagination
  - Patient detail view (`/patients/:id`)
  - Patient creation form (`/patients/new`)
  - Patient edit form (`/patients/:id/edit`)

- Visit Management (`/visits`)
  - Visit calendar view
  - Visit list with filters
  - Visit detail view (`/visits/:id`)
  - Visit creation form (`/visits/new`)
  - Visit edit form (`/visits/:id/edit`)

- Billing Management (`/billing`)
  - Invoice list with filters
  - Invoice detail view (`/billing/:id`)
  - Invoice creation form (`/billing/new`)
  - Payment recording form

- User Management (`/users`) - Admin only
  - User list
  - User creation form
  - User edit form
  - Role management

- Reports (`/reports`)
  - Patient statistics
  - Revenue reports
  - Visit analytics

- Audit Logs (`/audit-logs`) - Admin only
  - Searchable log viewer
  - Export functionality

- Profile Settings (`/profile`)
  - User profile edit
  - Password change
  - API key management

### 7.2 UI/UX Requirements

- Responsive design (mobile, tablet, desktop)
- Accessible (WCAG 2.1 AA compliance)
- Loading states for all async operations
- Error handling with user-friendly messages
- Success notifications for CRUD operations
- Confirmation dialogs for destructive actions
- Form validation with real-time feedback
- Breadcrumb navigation
- Global search functionality
- Dark mode support (optional)

### 7.3 State Management

- User authentication state (token, user info, permissions)
- Current patient/visit/invoice context
- Form state management
- Loading/error states
- Cache API responses appropriately
- Implement optimistic updates where appropriate

### 7.4 API Integration

```javascript
// Example API service structure
class ApiService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL;
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 10000
        });

        // Request interceptor (add auth token)
        this.axiosInstance.interceptors.request.use(config => {
            const token = getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Response interceptor (handle token refresh)
        this.axiosInstance.interceptors.response.use(
            response => response,
            async error => {
                if (error.response?.status === 401) {
                    // Attempt token refresh
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Retry original request
                        return this.axiosInstance(error.config);
                    } else {
                        // Redirect to login
                        redirectToLogin();
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    // CRUD methods for each resource
    patients = {
        list: (params) => this.axiosInstance.get('/patients', { params }),
        get: (id) => this.axiosInstance.get(`/patients/${id}`),
        create: (data) => this.axiosInstance.post('/patients', data),
        update: (id, data) => this.axiosInstance.put(`/patients/${id}`, data),
        delete: (id) => this.axiosInstance.delete(`/patients/${id}`)
    };

    // Similar structures for visits, billing, users, etc.
}
```

---

## 8. MULTI-AGENT DEVELOPMENT APPROACH

This project is designed to be built using a multi-agent development system where specialized AI agents work collaboratively, each focusing on their area of expertise. This approach ensures code quality, separation of concerns, and efficient parallel development.

### 8.1 Agent Roles & Responsibilities

#### Agent 1: PROJECT ARCHITECT
**Primary Role:** System design, architecture decisions, and project coordination

**Responsibilities:**
- Review and refine overall system architecture
- Make technology stack decisions
- Define module boundaries and interfaces
- Create and maintain project structure
- Design database schema and relationships
- Review code from other agents for architectural consistency
- Resolve integration conflicts between components
- Maintain technical documentation
- Ensure design patterns are followed consistently

**Deliverables:**
- Project folder structure
- Architecture decision records (ADRs)
- Database schema migrations
- API contract specifications
- Integration guidelines

**Works With:** All agents (coordination role)

---

#### Agent 2: BACKEND DEVELOPER
**Primary Role:** Core API development and business logic

**Responsibilities:**
- Implement Express.js server setup
- Build RESTful API endpoints
- Implement business logic and controllers
- Create service layer for data operations
- Implement middleware (authentication, authorization, logging)
- Handle error management
- Write API integration tests
- Optimize database queries

**Deliverables:**
- `/src/routes` - API route definitions
- `/src/controllers` - Request handlers
- `/src/services` - Business logic
- `/src/middleware` - Custom middleware
- Unit and integration tests

**Works With:**
- Project Architect (architecture guidance)
- Database Specialist (data layer integration)
- Security Specialist (security middleware)

---

#### Agent 3: DATABASE SPECIALIST
**Primary Role:** Database design, ORM configuration, and data layer

**Responsibilities:**
- Implement ORM models (Sequelize/Prisma)
- Create database migrations
- Write seed scripts for development data
- Optimize database indexes
- Implement data validation at model level
- Handle database transactions
- Create database utilities (connection pooling, etc.)
- Write data access layer tests
- Ensure SQLite/PostgreSQL compatibility

**Deliverables:**
- `/src/models` - ORM model definitions
- `/src/migrations` - Database migrations
- `/src/seeders` - Seed data scripts
- Database configuration files
- Data layer documentation

**Works With:**
- Project Architect (schema design)
- Backend Developer (data access patterns)
- Testing Agent (test data generation)

---

#### Agent 4: AUTHENTICATION & SECURITY SPECIALIST
**Primary Role:** Security implementation, authentication, and authorization

**Responsibilities:**
- Implement JWT authentication system
- Build refresh token mechanism
- Create API key authentication
- Implement RBAC (Role-Based Access Control)
- Build permission checking middleware
- Implement password hashing and validation
- Add rate limiting and DDoS protection
- Implement security headers (CORS, CSP, etc.)
- Conduct security audits
- Handle input sanitization and validation

**Deliverables:**
- `/src/auth` - Authentication modules
- `/src/middleware/auth.js` - Auth middleware
- `/src/middleware/rbac.js` - Authorization middleware
- `/src/utils/security.js` - Security utilities
- Security documentation and best practices

**Works With:**
- Backend Developer (middleware integration)
- Audit Logger (security event logging)
- Frontend Developer (auth flow integration)

---

#### Agent 5: FRONTEND DEVELOPER
**Primary Role:** React UI development and user experience

**Responsibilities:**
- Set up React project with Vite/CRA
- Implement component library with Bootstrap
- Build reusable UI components
- Create page layouts and navigation
- Implement forms with validation
- Build state management (Redux/Context)
- Implement API integration layer
- Handle client-side routing
- Ensure responsive design
- Implement accessibility features

**Deliverables:**
- `/frontend/src/components` - Reusable components
- `/frontend/src/pages` - Page components
- `/frontend/src/services` - API service layer
- `/frontend/src/store` - State management
- `/frontend/src/hooks` - Custom React hooks
- Component documentation

**Works With:**
- UI/UX Specialist (design implementation)
- Backend Developer (API integration)
- Testing Agent (component tests)

---

#### Agent 6: UI/UX SPECIALIST
**Primary Role:** User interface design and experience optimization

**Responsibilities:**
- Design page layouts and component structure
- Create responsive design specifications
- Ensure accessibility compliance (WCAG 2.1 AA)
- Design form interactions and validation UX
- Implement loading states and error handling
- Create user-friendly error messages
- Design navigation and information architecture
- Optimize user workflows
- Conduct usability reviews

**Deliverables:**
- UI component specifications
- Design system documentation
- Accessibility audit reports
- UX flow diagrams
- Style guide and theme configuration

**Works With:**
- Frontend Developer (implementation)
- Testing Agent (UX testing)

---

#### Agent 7: AUDIT LOGGING SPECIALIST
**Primary Role:** Comprehensive logging and audit trail implementation

**Responsibilities:**
- Implement Winston/Pino logging infrastructure
- Build audit logging service
- Create logging middleware for all API calls
- Implement different log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Design log storage and rotation strategy
- Build audit log viewer API endpoints
- Implement structured logging with correlation IDs
- Create log analysis utilities
- Ensure HIPAA/GDPR compliance in logging

**Deliverables:**
- `/src/services/logger.js` - Logging service
- `/src/services/audit.js` - Audit logging service
- `/src/middleware/logging.js` - Request logging middleware
- Log configuration files
- Audit log API endpoints

**Works With:**
- Backend Developer (middleware integration)
- Security Specialist (security event logging)
- Database Specialist (audit log storage)

---

#### Agent 8: TESTING & QUALITY ASSURANCE SPECIALIST
**Primary Role:** Comprehensive testing and quality assurance

**Responsibilities:**
- Write unit tests for backend services
- Create integration tests for API endpoints
- Build E2E tests for critical user flows
- Write frontend component tests (React Testing Library)
- Create test data fixtures
- Implement test automation
- Perform code coverage analysis
- Conduct performance testing
- Run security testing (OWASP)
- Create testing documentation

**Deliverables:**
- `/tests/unit` - Unit tests
- `/tests/integration` - Integration tests
- `/tests/e2e` - End-to-end tests
- Test configuration files
- Test coverage reports
- Testing documentation

**Works With:**
- All development agents (test their code)
- Database Specialist (test data setup)

---

#### Agent 9: DEVOPS & DEPLOYMENT SPECIALIST
**Primary Role:** Deployment, CI/CD, and infrastructure

**Responsibilities:**
- Set up development environment scripts
- Create Docker containers for services
- Build CI/CD pipelines (GitHub Actions/GitLab CI)
- Configure production environment
- Set up database backups
- Implement monitoring and alerting
- Create deployment scripts
- Write infrastructure documentation
- Manage environment configurations
- Set up log aggregation (optional)

**Deliverables:**
- `Dockerfile` and `docker-compose.yml`
- CI/CD pipeline configurations
- Deployment scripts and documentation
- Environment setup guides
- Monitoring dashboards

**Works With:**
- Project Architect (infrastructure design)
- All agents (deployment of their components)

---

#### Agent 10: DOCUMENTATION SPECIALIST
**Primary Role:** Comprehensive project documentation

**Responsibilities:**
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

**Deliverables:**
- `/docs/api` - API documentation
- `/docs/setup` - Setup guides
- `/docs/user-guide` - User manuals
- `/docs/admin-guide` - Admin documentation
- Inline code documentation
- README files

**Works With:**
- All agents (documenting their work)

---

### 8.2 Agent Collaboration Workflow

#### Phase-Based Collaboration

**Phase 1: Foundation (Weeks 1-2)**
- **Active Agents:** Project Architect, Database Specialist, DevOps Specialist
- **Tasks:**
  - Project Architect: Define architecture, create project structure
  - Database Specialist: Design schema, set up SQLite for development
  - DevOps Specialist: Set up development environment, version control

**Phase 2: Backend Core (Weeks 2-4)**
- **Active Agents:** Backend Developer, Security Specialist, Database Specialist, Audit Logger
- **Tasks:**
  - Backend Developer: Build API foundation, core endpoints
  - Security Specialist: Implement authentication system
  - Database Specialist: Create migrations and models
  - Audit Logger: Implement logging infrastructure

**Phase 3: Backend Features (Weeks 4-6)**
- **Active Agents:** Backend Developer, Security Specialist, Audit Logger, Testing Specialist
- **Tasks:**
  - Backend Developer: Complete all API endpoints
  - Security Specialist: Implement RBAC and API key auth
  - Audit Logger: Complete audit logging for all operations
  - Testing Specialist: Write backend tests

**Phase 4: Frontend Development (Weeks 6-9)**
- **Active Agents:** Frontend Developer, UI/UX Specialist, Testing Specialist
- **Tasks:**
  - UI/UX Specialist: Design all pages and components
  - Frontend Developer: Build React application
  - Testing Specialist: Write component and E2E tests

**Phase 5: Integration & Testing (Weeks 9-10)**
- **Active Agents:** Testing Specialist, All Developers
- **Tasks:**
  - Testing Specialist: Integration testing, E2E testing
  - All Developers: Bug fixes and integration issues
  - Security Specialist: Security audit

**Phase 6: Documentation & Deployment (Weeks 10-12)**
- **Active Agents:** Documentation Specialist, DevOps Specialist
- **Tasks:**
  - Documentation Specialist: Complete all documentation
  - DevOps Specialist: Production deployment, monitoring setup

---

### 8.3 Communication & Coordination

#### Inter-Agent Communication Protocol

**1. Interface Contracts**
- Agents must define and publish interfaces for their modules
- API contracts documented in Swagger/OpenAPI
- Database schema shared via migration files
- Type definitions shared (TypeScript interfaces if used)

**2. Code Reviews**
- Project Architect reviews architectural changes
- Peer reviews between related agents (e.g., Frontend ↔ Backend)
- Security Specialist reviews authentication/authorization code
- Testing Specialist reviews test coverage

**3. Shared Resources**
- `/docs/contracts` - Interface contracts and API specs
- `/docs/adrs` - Architecture Decision Records
- `/CHANGELOG.md` - Track all changes by agent
- `/docs/agent-status.md` - Track agent progress and blockers

**4. Dependency Management**
- Agents declare dependencies on other agents' work
- Use feature branches for independent development
- Merge to main only after integration testing
- Tag releases at phase completions

**5. Conflict Resolution**
- Technical conflicts resolved by Project Architect
- Schedule conflicts managed through phase planning
- Code conflicts resolved through PR review process

---

### 8.4 Development Environment Setup

Each agent should have access to:

**Local Development:**
```bash
# Clone repository
git clone <repo-url>
cd dietitian-app

# Backend setup
cd backend
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev

# Frontend setup (separate terminal)
cd frontend
npm install
cp .env.example .env
npm start
```

**Database:**
- SQLite file: `backend/data/dietitian_dev.db`
- Automatic creation on first migration
- Reset script: `npm run db:reset`

**Testing:**
```bash
# Backend tests
cd backend
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # Coverage report

# Frontend tests
cd frontend
npm test                   # Component tests
npm run test:e2e          # E2E tests
```

---

### 8.5 Agent Success Metrics

**Backend Developer:**
- All API endpoints implemented and documented
- >80% code coverage
- API response time <200ms (95th percentile)
- Zero critical security vulnerabilities

**Frontend Developer:**
- All pages and components implemented
- Responsive design (mobile, tablet, desktop)
- WCAG 2.1 AA compliance
- >80% component test coverage

**Database Specialist:**
- Schema supports all features
- Migrations run successfully on SQLite and PostgreSQL
- Query performance optimized (indexed)
- Seed data available for development

**Security Specialist:**
- Authentication system fully functional
- RBAC implemented and tested
- No security vulnerabilities in audit
- Rate limiting prevents DoS

**Testing Specialist:**
- >80% overall code coverage
- All critical paths have E2E tests
- CI/CD pipeline passes all tests
- Performance benchmarks met

**Audit Logger:**
- All CRUD operations logged
- Multiple log levels implemented
- Audit logs stored and retrievable
- HIPAA/GDPR compliance verified

---

### 8.6 Agent Handoff Checklist

When an agent completes their work, they must provide:

1. ✅ Code committed to version control
2. ✅ Unit tests written and passing
3. ✅ Documentation updated
4. ✅ Interface contracts published (if applicable)
5. ✅ Environment variables documented (if new ones added)
6. ✅ Migration scripts (if database changes)
7. ✅ Code reviewed by relevant agents
8. ✅ Integration tested with dependent modules
9. ✅ Known issues documented
10. ✅ Next steps or blockers communicated

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Foundation (Backend Core)
1. Set up Node.js/Express project structure
2. Configure SQLite database for development (PostgreSQL for production)
3. Implement database schema with migrations (SQLite & PostgreSQL compatible)
4. Create seed data for roles and permissions
5. Implement authentication (JWT + refresh tokens)
6. Implement basic RBAC middleware
7. Set up Winston logging infrastructure
8. Create basic audit logging service

### Phase 2: Core API Development
1. Implement user management endpoints
2. Implement patient management endpoints
3. Implement visit management endpoints
4. Implement billing endpoints
5. Add input validation to all endpoints
6. Implement comprehensive error handling
7. Add API documentation (Swagger)
8. Write unit tests for business logic

### Phase 3: Advanced Features
1. Implement API key authentication
2. Add advanced filtering and search
3. Implement reporting endpoints
4. Add audit log viewing endpoints
5. Implement rate limiting
6. Add file upload capability (patient documents)
7. Implement data export functionality

### Phase 4: Frontend Development
1. Set up React project with routing
2. Implement authentication flow (login, logout, token refresh)
3. Create layout components (header, sidebar, footer)
4. Implement patient management UI
5. Implement visit management UI
6. Implement billing management UI
7. Implement user management UI (admin)
8. Implement dashboard and reports
9. Add audit log viewer

### Phase 5: Security & Testing
1. Security audit and penetration testing
2. Implement rate limiting and DDoS protection
3. Add comprehensive error handling
4. Integration testing for all API endpoints
5. End-to-end testing for critical user flows
6. Performance testing and optimization
7. Accessibility testing

### Phase 6: Deployment & Monitoring
1. Set up production environment
2. Configure SSL/TLS certificates
3. Set up database backups
4. Configure log aggregation (optional: ELK stack)
5. Set up monitoring and alerting
6. Create deployment documentation
7. Implement CI/CD pipeline

---

## 9. VALIDATION & ERROR HANDLING

### 9.1 Input Validation Rules

#### Patient Fields
- `first_name`, `last_name`: Required, 1-100 chars, letters and spaces only
- `date_of_birth`: Required, valid date, not in future, reasonable age (0-120 years)
- `email`: Optional, valid email format
- `phone`: Optional, valid phone format
- `gender`: Optional, enum: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY

#### Visit Fields
- `patient_id`: Required, valid UUID, existing patient
- `visit_date`: Required, valid datetime
- `duration_minutes`: Required, integer, 5-480 minutes
- `visit_type`: Required, enum values
- `status`: Optional, enum values

#### Billing Fields
- `amount`: Required, positive number, max 2 decimal places
- `invoice_date`: Required, valid date
- `due_date`: Required, valid date, not before invoice_date
- `status`: Optional, enum values

### 9.2 Error Response Format

```javascript
{
    success: false,
    error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: [
            {
                field: "email",
                message: "Invalid email format",
                value: "invalid-email"
            }
        ]
    },
    timestamp: "2024-01-15T10:30:45.123Z",
    path: "/api/patients",
    request_id: "uuid"
}
```

### 9.3 HTTP Status Codes Usage

- `200 OK` - Successful GET, PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation errors, invalid input
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource (e.g., username exists)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server errors
- `503 Service Unavailable` - Maintenance mode

---

## 10. ADDITIONAL REQUIREMENTS

### 10.1 Data Export
- Export patient data to CSV/PDF (GDPR right to data portability)
- Export billing reports to PDF/Excel
- Export audit logs to CSV

### 10.2 Email Notifications (Optional)
- Send invoice reminders
- Send appointment reminders
- Send welcome emails for new patients
- Send password reset emails

### 10.3 Backup & Recovery
- Automated daily database backups
- Store backups encrypted
- Retention policy: daily (7 days), weekly (4 weeks), monthly (12 months)
- Document restore procedure
- Test recovery process quarterly

### 10.4 Performance Targets
- API response time <200ms for 95th percentile
- Database queries optimized with indexes
- Implement pagination for large datasets (default 20 items, max 100)
- Cache frequently accessed data (Redis optional)
- Lazy loading for frontend data tables

### 10.5 Documentation
- API documentation (Swagger/OpenAPI)
- Database schema documentation
- Deployment guide
- User manual
- Admin guide
- Developer setup guide

---

## 11. COMPLIANCE & LEGAL CONSIDERATIONS

### 11.1 HIPAA Compliance (if applicable in US)
- Encrypt PHI (Protected Health Information) at rest and in transit
- Implement access controls and audit logging
- Business Associate Agreements with third-party services
- Data breach notification procedures
- Regular security risk assessments

### 11.2 GDPR Compliance (if applicable in EU)
- Lawful basis for data processing (consent, contract, legitimate interest)
- Right to access, rectification, erasure, data portability
- Data retention policies
- Data Processing Agreement (DPA) with data processors
- Privacy policy and terms of service
- Cookie consent management

### 11.3 Data Retention Policy
- Patient records: Retain for 7 years after last visit (or as per local regulations)
- Audit logs: Retain for 3 years minimum
- Billing records: Retain for 7 years (tax purposes)
- User accounts: Soft delete, retain for 30 days, then hard delete

---

## 12. ENVIRONMENT CONFIGURATION

### 12.1 Environment Variables

```bash
# Server
NODE_ENV=development|production
PORT=3001
API_BASE_URL=http://localhost:3001

# Database
DB_DIALECT=sqlite|postgres  # Use 'sqlite' for development, 'postgres' for production
DB_STORAGE=./data/nutrivault_dev.db  # SQLite: file path (only for sqlite)

# PostgreSQL Configuration (production only)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nutrivault
DB_USER=dbuser
DB_PASSWORD=secure_password
DB_SSL=true|false

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
API_RATE_LIMIT=100
LOGIN_RATE_LIMIT=5
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m

# Logging
LOG_LEVEL=info|debug|error
LOG_DIR=./logs
LOG_MAX_FILES=30d

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASSWORD=password
SMTP_FROM=noreply@nutrivault.com

# Frontend
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development|production
```

---

## 13. TESTING REQUIREMENTS

### 13.1 Backend Testing
- Unit tests for all business logic (>80% coverage)
- Integration tests for API endpoints
- Database migration tests
- Authentication/authorization tests
- Input validation tests
- Error handling tests

### 13.2 Frontend Testing
- Component unit tests (React Testing Library)
- Integration tests for user flows
- E2E tests for critical paths (Cypress or Playwright)
- Accessibility tests (axe-core)
- Cross-browser testing

### 13.3 Test Data
- Create seed scripts for test data
- Anonymized production-like data for testing
- Automated test data cleanup

---

## SUMMARY

This specification provides a comprehensive blueprint for building **NutriVault**, a secure, scalable nutrition practice management system with:

1. **Robust authentication**: Username/password + API keys + JWT with refresh tokens
2. **Fine-grained authorization**: Role-based access control with granular permissions
3. **Comprehensive audit logging**: Track all data access and modifications with multiple verbosity levels
4. **Complete data architecture**: Patients, visits, measurements, billing, users, roles, permissions
5. **RESTful API**: Well-defined endpoints for all operations
6. **Modern frontend**: React with Bootstrap for responsive UI
7. **Security best practices**: Encryption, rate limiting, input validation, HTTPS
8. **Compliance ready**: HIPAA and GDPR considerations
9. **Production ready**: Logging, monitoring, backup, documentation
10. **Multi-agent development**: 10 specialized agents working collaboratively
11. **Development database**: SQLite for local development, PostgreSQL for production

The implementation should follow the phases outlined, starting with the backend foundation, then building out API endpoints, adding advanced features, developing the frontend, securing the application, and finally deploying with proper monitoring.

### Multi-Agent Development Benefits

By using a multi-agent approach, the development process gains:
- **Specialization**: Each agent focuses on their area of expertise
- **Parallel development**: Multiple agents can work simultaneously on different components
- **Code quality**: Specialized knowledge leads to better implementation
- **Clear ownership**: Each agent owns specific modules and deliverables
- **Efficient collaboration**: Well-defined interfaces and contracts between agents
- **Scalability**: Easy to add or reassign agents as project needs change

### Quick Start for Development

```bash
# Backend with SQLite
cd backend
npm install
npm run migrate     # Creates SQLite database automatically
npm run seed        # Populates with test data
npm run dev         # Start development server

# Frontend
cd frontend
npm install
npm start           # Start React development server
```

The SQLite database will be created at `backend/data/nutrivault_dev.db` on first migration, requiring zero database server setup for local development.
