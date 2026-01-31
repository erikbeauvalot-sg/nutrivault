# NutriVault Architecture Review

**Version:** 5.7.5
**Last Updated:** January 2026
**Document Type:** Technical Architecture Reference

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [API Design](#7-api-design)
8. [Core Features & Workflows](#8-core-features--workflows)
9. [External Integrations](#9-external-integrations)
10. [Security Architecture](#10-security-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [Performance Considerations](#13-performance-considerations)
14. [Appendix: Model Relationships](#appendix-model-relationships)

---

## 1. Executive Summary

NutriVault is a comprehensive practice management application designed for dietitians and nutritionists. The application provides patient management, visit scheduling, health measure tracking, billing, and AI-powered follow-up generation.

### Key Technical Highlights

| Aspect | Technology |
|--------|------------|
| **Frontend** | React 18 + Vite 5 |
| **Backend** | Node.js + Express |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **ORM** | Sequelize 6 |
| **Authentication** | JWT + Refresh Tokens |
| **Authorization** | Role-Based Access Control (RBAC) |
| **Internationalization** | i18next (French, English) |
| **AI Integration** | OpenAI, Anthropic, Mistral, Ollama |

### Architecture Pattern

NutriVault follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│          React Components + Pages + React Router             │
├─────────────────────────────────────────────────────────────┤
│                     API CLIENT LAYER                         │
│               Axios Services + Interceptors                  │
├─────────────────────────────────────────────────────────────┤
│                      HTTP / REST API                         │
├─────────────────────────────────────────────────────────────┤
│                     CONTROLLER LAYER                         │
│          Express Routes + Request Handling                   │
├─────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                           │
│              Business Logic + Validations                    │
├─────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                         │
│            Sequelize Models + Associations                   │
├─────────────────────────────────────────────────────────────┤
│                       DATABASE                               │
│                SQLite / PostgreSQL                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. System Overview

### 2.1 Project Structure

```
nutrivault/
├── backend/                      # Express API Server
│   ├── src/
│   │   ├── auth/                # Authentication strategies
│   │   ├── controllers/         # Request handlers (33 files)
│   │   ├── middleware/          # Auth, RBAC, rate limiting
│   │   ├── routes/              # API endpoints (27 files)
│   │   ├── services/            # Business logic (45+ files)
│   │   ├── utils/               # Helper utilities
│   │   └── server.js            # Express app entry point
│   ├── migrations/              # Database migrations (30+)
│   ├── seeders/                 # Default data seeders
│   └── data/                    # SQLite database files
│
├── frontend/                     # React Application
│   ├── src/
│   │   ├── components/          # Reusable UI components (73+)
│   │   ├── contexts/            # React Context (AuthContext)
│   │   ├── hooks/               # Custom React hooks (11)
│   │   ├── locales/             # i18n translations
│   │   ├── pages/               # Page components (42)
│   │   ├── services/            # API client services (28)
│   │   ├── styles/              # CSS modules
│   │   ├── utils/               # Utility functions
│   │   ├── App.jsx              # Main router component
│   │   ├── i18n.js              # i18next configuration
│   │   └── main.jsx             # React DOM entry
│   └── public/                  # Static assets
│
├── models/                       # Shared Sequelize models (37)
├── config/
│   └── database.js              # Database configuration
├── .sequelizerc                 # Sequelize CLI config
└── .env                         # Environment variables
```

### 2.2 Technology Stack

#### Frontend Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.2.0 | UI framework |
| React Router DOM | 6.30.3 | Client-side routing |
| React Bootstrap | 2.10.10 | UI components |
| Axios | 1.6.5 | HTTP client |
| React Hook Form | 7.70.0 | Form handling |
| Yup | 1.6.1 | Schema validation |
| i18next | 25.7.4 | Internationalization |
| Recharts | 3.6.0 | Data visualization |
| date-fns | 4.1.0 | Date manipulation |
| jsPDF | 4.0.0 | PDF generation |

#### Backend Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Express | 4.18.2 | Web framework |
| Sequelize | 6.35.2 | ORM |
| jsonwebtoken | 9.0.2 | JWT authentication |
| bcryptjs | 2.4.3 | Password hashing |
| nodemailer | 6.9.7 | Email sending |
| node-cron | 3.0.3 | Task scheduling |
| multer | 1.4.5 | File uploads |
| pdfkit | 0.15.0 | PDF generation |
| googleapis | 137.0.0 | Google Calendar API |

---

## 3. Frontend Architecture

### 3.1 Component Hierarchy

```
App.jsx
├── AuthProvider (Context)
│   ├── PublicRoutes
│   │   └── LoginPage
│   │
│   └── ProtectedRoutes
│       ├── Layout (Sidebar + Header)
│       │   ├── DashboardPage
│       │   ├── PatientsPage
│       │   │   ├── PatientDetailPage
│       │   │   └── EditPatientPage
│       │   ├── VisitsPage
│       │   │   ├── CreateVisitPage
│       │   │   ├── EditVisitPage
│       │   │   └── VisitDetailPage
│       │   ├── AgendaPage
│       │   ├── BillingPage
│       │   │   ├── InvoiceDetailPage
│       │   │   └── InvoiceCustomizationPage
│       │   ├── CustomFieldsPage
│       │   ├── MeasuresPage
│       │   ├── AnalyticsDashboardPage
│       │   └── [Admin Pages]
```

### 3.2 State Management

NutriVault uses **React Context API** for global state:

```javascript
// AuthContext.jsx
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {},
  logout: () => {},
  refreshToken: async () => {}
});
```

**Local state** is managed via:
- `useState` for component-level state
- `useReducer` for complex state logic
- `React Hook Form` for form state

### 3.3 Routing Configuration

Routes are protected based on authentication and permissions:

```jsx
// Route protection pattern
<Route element={<ProtectedRoute requiredPermission="patients.read" />}>
  <Route path="/patients" element={<PatientsPage />} />
</Route>
```

**Key Routes:**

| Path | Component | Permission |
|------|-----------|------------|
| `/login` | LoginPage | Public |
| `/dashboard` | DashboardPage | Authenticated |
| `/patients` | PatientsPage | `patients.read` |
| `/patients/:id` | PatientDetailPage | `patients.read` |
| `/visits` | VisitsPage | `visits.read` |
| `/billing` | BillingPage | `billing.read` |
| `/custom-fields` | CustomFieldsPage | `settings.manage` |
| `/measures` | MeasuresPage | `measures.read` |
| `/users` | UsersPage | `users.read` |
| `/roles` | RolesManagementPage | `roles.manage` |
| `/ai-config` | AIConfigPage | Admin only |

### 3.4 API Integration Layer

All API calls are centralized in the `services/` directory:

```javascript
// services/api.js - Axios configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// Request interceptor - adds JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handles 401, refreshes token
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await refreshTokenAndRetry(error.config);
    }
    return Promise.reject(error);
  }
);
```

### 3.5 Internationalization (i18n)

NutriVault supports French and English via i18next:

```javascript
// i18n.js configuration
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en, fr },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });
```

**Translation usage:**
```jsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('patient.title', 'Patients')}</h1>;
}
```

---

## 4. Backend Architecture

### 4.1 Express Application Structure

```javascript
// server.js - Main application setup
const app = express();

// Middleware stack
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
app.use('/api', authenticate);

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
// ... 24 more route modules

// Error handling
app.use(errorHandler);
```

### 4.2 Controller Layer

Controllers handle HTTP request/response:

```javascript
// controllers/patientController.js
exports.getAllPatients = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const patients = await patientService.getAllPatients({
      page, limit, search,
      userId: req.user.id,
      userRole: req.user.role
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 4.3 Service Layer

Business logic is encapsulated in services:

```javascript
// services/patient.service.js
class PatientService {
  async getAllPatients({ page, limit, search, userId, userRole }) {
    const where = this.buildWhereClause(search, userId, userRole);
    const { rows, count } = await Patient.findAndCountAll({
      where,
      include: this.defaultIncludes,
      limit,
      offset: (page - 1) * limit,
      order: [['last_name', 'ASC']]
    });
    return { patients: rows, total: count, page, totalPages: Math.ceil(count / limit) };
  }
}
```

### 4.4 Middleware Stack

| Middleware | File | Purpose |
|------------|------|---------|
| CORS | Built-in | Cross-origin handling |
| JSON Parser | Built-in | Parse JSON bodies |
| Authentication | `authenticate.js` | JWT/API key validation |
| RBAC | `rbac.js` | Permission checking |
| Rate Limiting | `rateLimiter.js` | API throttling |
| Error Handler | `errorHandler.js` | Global error handling |

### 4.5 Key Services (45+)

| Service | Responsibility |
|---------|----------------|
| `auth.service.js` | Login, tokens, API keys |
| `patient.service.js` | Patient CRUD, search |
| `visits.service.js` | Visit management |
| `customFields.service.js` | Field definitions |
| `customFieldCategory.service.js` | Categories |
| `patientCustomField.service.js` | Patient field values |
| `visitCustomField.service.js` | Visit field values |
| `measures.service.js` | Measure definitions |
| `patientMeasure.service.js` | Patient measurements |
| `measureAlerts.service.js` | Alert generation |
| `formulaEngine.service.js` | Calculated fields |
| `billing.service.js` | Invoices, payments |
| `invoicePDF.service.js` | PDF generation |
| `email.service.js` | Email sending |
| `emailTemplate.service.js` | Templates |
| `document.service.js` | File management |
| `googleCalendar.service.js` | Calendar sync |
| `aiProvider.service.js` | AI integrations |
| `aiFollowup.service.js` | Follow-up generation |
| `analytics.service.js` | Dashboard data |
| `export.service.js` | Data export |
| `scheduler.service.js` | Cron jobs |

---

## 5. Database Architecture

### 5.1 Database Configuration

```javascript
// config/database.js
module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './backend/data/nutrivault.db',
    logging: false
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true'
  }
};
```

### 5.2 Core Entity Models

#### User Management

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │     roles       │     │  permissions    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID, PK)   │     │ id (UUID, PK)   │     │ id (UUID, PK)   │
│ username        │     │ name            │     │ code            │
│ email           │────▶│ description     │◀────│ description     │
│ password_hash   │     └─────────────────┘     └─────────────────┘
│ role_id (FK)    │              │                      │
│ first_name      │              └──────────────────────┘
│ last_name       │                role_permissions (join)
│ is_active       │
│ google_* fields │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

#### Patient & Visit Management

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    patients     │     │     visits      │     │   visit_types   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID, PK)   │◀───┐│ id (UUID, PK)   │────▶│ id (UUID, PK)   │
│ first_name      │    ││ patient_id (FK) │     │ name            │
│ last_name       │    ││ dietitian_id    │     │ color           │
│ email           │    ││ visit_date      │     │ is_active       │
│ phone           │    ││ visit_type      │     └─────────────────┘
│ assigned_diet_id│    ││ status          │
│ is_active       │    ││ duration        │
│ language_pref   │    ││ visit_summary   │
│ unsubscribe_tok │    ││ google_* fields │
│ created_at      │    │└─────────────────┘
│ updated_at      │    │
└─────────────────┘    │  ┌─────────────────┐
                       │  │     billing     │
                       │  ├─────────────────┤
                       │  │ id (UUID, PK)   │
                       └──│ patient_id (FK) │
                          │ visit_id (FK)   │
                          │ invoice_number  │
                          │ amount_total    │
                          │ amount_paid     │
                          │ status          │
                          └─────────────────┘
```

#### Custom Fields System

```
┌─────────────────────┐     ┌─────────────────────────┐
│ custom_field_cat.   │     │ custom_field_definitions │
├─────────────────────┤     ├─────────────────────────┤
│ id (UUID, PK)       │◀───▶│ id (UUID, PK)           │
│ name                │     │ category_id (FK)        │
│ description         │     │ field_name              │
│ color               │     │ field_label             │
│ entity_types (JSON) │     │ field_type              │
│ visit_types (JSON)  │     │ is_required             │
│ display_layout      │     │ formula                 │
│ created_by (FK)     │     │ dependencies (JSON)     │
│ created_at          │     │ select_options (JSON)   │
│ updated_at          │     │ decimal_places          │
└─────────────────────┘     │ display_order           │
                            │ deleted_at              │
                            └─────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ patient_cf_values   │     │  visit_cf_values    │
├─────────────────────┤     ├─────────────────────┤
│ id (UUID, PK)       │     │ id (UUID, PK)       │
│ patient_id (FK)     │     │ visit_id (FK)       │
│ field_def_id (FK)   │     │ field_def_id (FK)   │
│ value (TEXT)        │     │ value (TEXT)        │
│ updated_by (FK)     │     │ updated_by (FK)     │
└─────────────────────┘     └─────────────────────┘
```

#### Health Measures System

```
┌─────────────────────┐     ┌─────────────────────┐
│ measure_definitions │     │   patient_measures  │
├─────────────────────┤     ├─────────────────────┤
│ id (UUID, PK)       │◀───▶│ id (UUID, PK)       │
│ name (unique)       │     │ patient_id (FK)     │
│ display_name        │     │ measure_def_id (FK) │
│ category            │     │ visit_id (FK, opt)  │
│ measure_type        │     │ numeric_value       │
│ unit                │     │ text_value          │
│ min/max_value       │     │ boolean_value       │
│ normal_range_*      │     │ recorded_by (FK)    │
│ alert_threshold_*   │     │ created_at          │
│ enable_alerts       │     └─────────────────────┘
│ formula             │              │
│ is_system           │              ▼
└─────────────────────┘     ┌─────────────────────┐
         │                  │   measure_alerts    │
         │                  ├─────────────────────┤
         │                  │ id (UUID, PK)       │
         └─────────────────▶│ patient_id (FK)     │
                            │ measure_def_id (FK) │
                            │ patient_meas_id(FK) │
                            │ alert_value         │
                            │ alert_type          │
                            │ status              │
                            │ acknowledged_by     │
                            └─────────────────────┘
```

### 5.3 Model Associations Summary

| Parent Model | Child Model | Relationship |
|--------------|-------------|--------------|
| User | Role | belongsTo |
| Role | Permission | belongsToMany |
| Patient | User (dietitian) | belongsTo |
| Patient | Visit | hasMany |
| Visit | User (dietitian) | belongsTo |
| Visit | VisitType | belongsTo |
| Patient | PatientCustomFieldValue | hasMany |
| Visit | VisitCustomFieldValue | hasMany |
| CustomFieldCategory | CustomFieldDefinition | hasMany |
| Patient | PatientMeasure | hasMany |
| MeasureDefinition | PatientMeasure | hasMany |
| Patient | Billing | hasMany |
| Visit | Billing | hasOne |
| Billing | Payment | hasMany |
| Document | DocumentShare | hasMany |
| EmailTemplate | EmailLog | hasMany |

### 5.4 Indexes

Strategic indexes for query optimization:

```sql
-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- Patients
CREATE INDEX idx_patients_dietitian ON patients(assigned_dietitian_id);
CREATE INDEX idx_patients_last_name ON patients(last_name);
CREATE INDEX idx_patients_email ON patients(email);

-- Visits
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_dietitian ON visits(dietitian_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_sync ON visits(google_calendar_sync_status);

-- Measures
CREATE INDEX idx_measures_patient ON patient_measures(patient_id);
CREATE INDEX idx_measures_definition ON patient_measures(measure_definition_id);
CREATE INDEX idx_measures_date ON patient_measures(created_at);

-- Custom Fields
CREATE INDEX idx_cf_category ON custom_field_definitions(category_id);
CREATE INDEX idx_cf_order ON custom_field_definitions(display_order);
```

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │  JWT     │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /login    │                │                │
     │ {user, pass}   │                │                │
     │───────────────▶│                │                │
     │                │ Verify user    │                │
     │                │───────────────────────────────▶│
     │                │                │                │
     │                │◀───────────────────────────────│
     │                │ User found     │                │
     │                │                │                │
     │                │ Compare hash   │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │ Generate tokens│                │
     │                │───────────────▶│                │
     │                │                │                │
     │ {accessToken,  │◀───────────────│                │
     │  refreshToken} │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │ Store tokens   │                │                │
     │ in localStorage│                │                │
```

### 6.2 Token Structure

**Access Token (JWT):**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid",
    "username": "string",
    "role": "ADMIN|DIETITIAN|STAFF",
    "permissions": ["patients.read", "patients.write", ...],
    "iat": 1234567890,
    "exp": 1234571490
  }
}
```

**Token Expiry:**
- Access Token: 1 hour
- Refresh Token: 7 days

### 6.3 Role-Based Access Control (RBAC)

**Built-in Roles:**

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| ADMIN | Full system access | All permissions |
| DIETITIAN | Practice management | patients.*, visits.*, billing.*, measures.* |
| STAFF | Limited access | patients.read, visits.read |

**Permission Codes:**

```
patients.read, patients.write, patients.delete
visits.read, visits.write, visits.delete
billing.read, billing.write, billing.delete
measures.read, measures.write, measures.delete
custom_fields.read, custom_fields.write
documents.read, documents.write, documents.share
users.read, users.write, users.delete
roles.manage
settings.manage
ai.configure
```

### 6.4 RBAC Middleware

```javascript
// middleware/rbac.js

// Single permission check
const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  next();
};

// OR logic - any permission passes
const requireAnyPermission = (permissions) => (req, res, next) => {
  if (!permissions.some(p => hasPermission(req.user, p))) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  next();
};

// AND logic - all permissions required
const requireAllPermissions = (permissions) => (req, res, next) => {
  if (!permissions.every(p => hasPermission(req.user, p))) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  next();
};

// Data-level access: assigned patients only
const requireAssignedDietitian = () => (req, res, next) => {
  // Non-admins can only access their assigned patients
  if (!isAdmin(req.user)) {
    req.query.dietitianId = req.user.id;
  }
  next();
};
```

---

## 7. API Design

### 7.1 REST API Endpoints

#### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Authenticate user |
| POST | `/logout` | Invalidate tokens |
| POST | `/refresh` | Refresh access token |
| POST | `/register` | Register new user (admin) |

#### Patients (`/api/patients`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all patients |
| GET | `/:id` | Get patient by ID |
| POST | `/` | Create patient |
| PUT | `/:id` | Update patient |
| DELETE | `/:id` | Delete patient |
| GET | `/:id/measures` | Get patient measures |
| GET | `/:id/visits` | Get patient visits |
| GET | `/:id/documents` | Get patient documents |

#### Visits (`/api/visits`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all visits |
| GET | `/:id` | Get visit by ID |
| POST | `/` | Create visit |
| PUT | `/:id` | Update visit |
| DELETE | `/:id` | Delete visit |
| POST | `/:id/complete` | Mark visit complete |
| GET | `/:id/custom-fields` | Get visit custom fields |

#### Custom Fields (`/api/custom-fields`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| GET | `/definitions` | List field definitions |
| POST | `/definitions` | Create definition |
| PUT | `/definitions/:id` | Update definition |
| DELETE | `/definitions/:id` | Soft delete definition |

#### Measures (`/api/measures`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/definitions` | List measure definitions |
| POST | `/definitions` | Create definition |
| PUT | `/definitions/:id` | Update definition |
| DELETE | `/definitions/:id` | Delete definition |

#### Patient Measures (`/api/patient-measures`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:patientId` | Get patient measures |
| POST | `/` | Record measure |
| PUT | `/:id` | Update measure |
| DELETE | `/:id` | Delete measure |
| GET | `/:patientId/history/:measureId` | Get measure history |

#### Billing (`/api/billing`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List invoices |
| GET | `/:id` | Get invoice |
| POST | `/` | Create invoice |
| PUT | `/:id` | Update invoice |
| DELETE | `/:id` | Delete invoice |
| POST | `/:id/send` | Send invoice by email |
| GET | `/:id/pdf` | Download PDF |
| POST | `/:id/payments` | Record payment |

### 7.2 Request/Response Format

**Standard Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Standard Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### 7.3 API Authentication

**Bearer Token (recommended):**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**API Key (for integrations):**
```http
X-API-Key: api_key_value
```

---

## 8. Core Features & Workflows

### 8.1 Patient Management Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Create    │────▶│   Assign    │────▶│   Track     │
│   Patient   │     │  Dietitian  │     │  Measures   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Export    │◀────│   Generate  │◀────│   Schedule  │
│    Data     │     │   Invoice   │     │   Visits    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 8.2 Visit Workflow

```
                    ┌─────────────┐
                    │   Create    │
                    │   Visit     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Schedule │ │  Record  │ │   Sync   │
        │   Date   │ │ Measures │ │ Calendar │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                    ┌──────────┐
                    │ Complete │
                    │  Visit   │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Generate │ │   Send   │ │ AI Follow│
        │ Invoice  │ │  Summary │ │   Up     │
        └──────────┘ └──────────┘ └──────────┘
```

### 8.3 Custom Fields System

**Field Types:**

| Type | Description | Example |
|------|-------------|---------|
| `text` | Single line text | Name |
| `textarea` | Multi-line text | Notes |
| `number` | Numeric value | Age |
| `date` | Date picker | Birth date |
| `select` | Dropdown list | Gender |
| `boolean` | Yes/No toggle | Smoker |
| `calculated` | Formula-based | BMI |
| `separator` | Visual divider | — |
| `blank` | Empty space | — |

**Formula Engine:**

```javascript
// Supported operators
+ - * / ^

// Mathematical functions
sqrt(x), abs(x), round(x, n), floor(x), ceil(x), min(a, b), max(a, b)

// Date functions
today(), year(date), month(date), day(date), age_years(date)

// Variable references
{field_name}           // Custom field value
{measure:measure_name} // Latest measure value

// Example: BMI calculation
10000 * {measure:weight} / ({measure:height} * {measure:height})
```

### 8.4 Measure Tracking Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Define    │────▶│    Record    │────▶│   Analyze    │
│   Measure    │     │    Value     │     │   Trends     │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Check     │
                    │   Thresholds │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌──────────┐              ┌──────────┐
        │  Normal  │              │  Alert   │
        │   Range  │              │ Generated│
        └──────────┘              └────┬─────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │  Notify  │
                                 │Dietitian │
                                 └──────────┘
```

### 8.5 Billing Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Create    │────▶│    Review    │────▶│    Send      │
│   Invoice    │     │    Draft     │     │   to Patient │
└──────────────┘     └──────────────┘     └──────────────┘
                                               │
                                               ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Archive    │◀────│   Record     │◀────│    Await     │
│   Invoice    │     │   Payment    │     │   Payment    │
└──────────────┘     └──────────────┘     └──────────────┘
                                               │
                                               ▼
                                         ┌──────────────┐
                                         │    Send      │
                                         │   Reminder   │
                                         └──────────────┘
```

---

## 9. External Integrations

### 9.1 Google Calendar Integration

**Features:**
- Bi-directional sync for visits
- Automatic event creation/update
- Conflict detection
- Error handling with status tracking

**Sync Flow:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  NutriVault │     │   Google    │     │   User's    │
│    Visit    │◀───▶│  Calendar   │◀───▶│   Calendar  │
│   (CRUD)    │     │     API     │     │    (View)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Sync Status:**
- `synced` - In sync with Google
- `pending` - Awaiting sync
- `conflict` - Manual resolution needed
- `error` - Sync failed

### 9.2 AI Integration

**Supported Providers:**

| Provider | Models | Use Case |
|----------|--------|----------|
| OpenAI | GPT-4, GPT-3.5 | Follow-up generation |
| Anthropic | Claude 3 (Haiku, Sonnet, Opus) | Follow-up generation |
| Mistral | Small, Medium, Large | Follow-up generation |
| Ollama | Local models | Privacy-focused usage |

**AI Follow-up Generation:**
```
Visit Data → AI Prompt → Generated Email → Review → Send
```

### 9.3 Email System (Nodemailer)

**Configuration:**
- SMTP Provider: Gmail (default)
- TLS: Enabled
- Authentication: App Password

**Email Types:**
- Appointment reminders
- Invoice delivery
- Payment reminders
- AI-generated follow-ups
- Custom templates

---

## 10. Security Architecture

### 10.1 Authentication Security

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcrypt (12 rounds) |
| Token Signing | HMAC-SHA256 |
| Token Expiry | Access: 1h, Refresh: 7d |
| Failed Login Lockout | 5 attempts, 30min lock |
| Session Invalidation | Refresh token rotation |

### 10.2 Authorization Security

| Measure | Implementation |
|---------|----------------|
| RBAC | Permission-based middleware |
| Data Isolation | Dietitian sees assigned patients |
| Admin Protection | Admin-only routes |
| Audit Logging | All sensitive actions logged |

### 10.3 Input Validation

| Layer | Validation |
|-------|------------|
| Frontend | Yup schema validation |
| API | express-validator |
| Database | Sequelize model validation |
| Formulas | Safe expression parser (no eval) |

### 10.4 Data Protection

| Measure | Implementation |
|---------|----------------|
| XSS Prevention | DOMPurify sanitization |
| SQL Injection | Sequelize parameterized queries |
| CORS | Origin whitelist |
| Rate Limiting | express-rate-limit |
| HTTPS | Required in production |

### 10.5 Sensitive Data Handling

| Data Type | Protection |
|-----------|------------|
| Passwords | bcrypt hash |
| API Keys | SHA-256 hash |
| Refresh Tokens | SHA-256 hash |
| Patient Data | Access control + audit |
| AI API Keys | Encrypted storage |

---

## 11. Deployment Architecture

### 11.1 Development Environment

```
┌────────────────────────────────────────────────────────┐
│                    Developer Machine                    │
├────────────────────────────────────────────────────────┤
│  ┌──────────────┐          ┌──────────────┐           │
│  │   Vite Dev   │   HTTP   │   Express    │           │
│  │   Server     │◀────────▶│   Server     │           │
│  │   :5173      │   Proxy  │   :3001      │           │
│  └──────────────┘          └──────┬───────┘           │
│                                   │                    │
│                            ┌──────┴───────┐           │
│                            │    SQLite    │           │
│                            │   Database   │           │
│                            └──────────────┘           │
└────────────────────────────────────────────────────────┘
```

### 11.2 Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production Server                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                         Nginx                               │ │
│  │    ┌──────────────┐         ┌──────────────┐              │ │
│  │    │  Static      │         │   API Proxy  │              │ │
│  │    │  Files (/)   │         │   (/api)     │              │ │
│  │    └──────┬───────┘         └──────┬───────┘              │ │
│  └───────────┼─────────────────────────┼─────────────────────┘ │
│              │                         │                        │
│       ┌──────┴───────┐          ┌──────┴───────┐              │
│       │   Frontend   │          │   Backend    │              │
│       │   (dist/)    │          │   Node.js    │              │
│       └──────────────┘          └──────┬───────┘              │
│                                        │                        │
│                                 ┌──────┴───────┐              │
│                                 │  PostgreSQL  │              │
│                                 │   Database   │              │
│                                 └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 Docker Deployment

```yaml
# docker-compose.yml structure
services:
  frontend:
    build: ./frontend
    ports: ["80:80"]

  backend:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      - DB_HOST=postgres
      - DB_NAME=nutrivault
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## 12. Data Flow Diagrams

### 12.1 Patient Creation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │   Axios  │     │  Express │     │ Sequelize│
│   Form   │     │  Service │     │ Controller│    │  Model   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Submit form    │                │                │
     │───────────────▶│                │                │
     │                │ POST /patients │                │
     │                │───────────────▶│                │
     │                │                │ Validate       │
     │                │                │ RBAC check     │
     │                │                │                │
     │                │                │ Service call   │
     │                │                │───────────────▶│
     │                │                │                │
     │                │                │                │ INSERT
     │                │                │                │─────▶ DB
     │                │                │                │
     │                │                │◀───────────────│
     │                │◀───────────────│                │
     │◀───────────────│                │                │
     │                │                │                │
     │ Update UI      │                │                │
```

### 12.2 Measure Recording with Alert

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │  Measure │     │  Alert   │     │ Database │
│   Form   │     │  Service │     │  Service │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Record value   │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │ Save measure   │                │
     │                │───────────────────────────────▶│
     │                │                │                │
     │                │ Check thresholds               │
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │ Value exceeds  │
     │                │                │ threshold?     │
     │                │                │ YES            │
     │                │                │                │
     │                │                │ Create alert   │
     │                │                │───────────────▶│
     │                │                │                │
     │◀───────────────│◀───────────────│◀───────────────│
     │                │                │                │
     │ Show alert     │                │                │
     │ notification   │                │                │
```

---

## 13. Performance Considerations

### 13.1 Database Optimization

- **Indexes** on frequently queried columns
- **Pagination** for large result sets (default: 20 items)
- **Selective loading** via `include` in Sequelize
- **Query optimization** with proper WHERE clauses

### 13.2 Frontend Optimization

- **Code splitting** with React.lazy()
- **Memoization** with useMemo/useCallback
- **Virtualization** for long lists
- **Image optimization** via proper sizing

### 13.3 API Optimization

- **Pagination** with limit/offset
- **Selective fields** in responses
- **Caching** headers for static content
- **Rate limiting** to prevent abuse

### 13.4 Caching Strategy

| Cache Type | Implementation | TTL |
|------------|----------------|-----|
| API responses | HTTP Cache-Control | 5 min |
| Static assets | Nginx caching | 1 year |
| Session data | Memory | Session lifetime |
| Translations | Browser localStorage | 24 hours |

---

## Appendix: Model Relationships

### Complete Entity Relationship Diagram

```
                                    ┌─────────────────┐
                                    │      roles      │
                                    ├─────────────────┤
                                    │ id              │
                          ┌────────▶│ name            │◀────────┐
                          │         │ description     │         │
                          │         └─────────────────┘         │
                          │                                     │
┌─────────────────┐       │                          ┌─────────────────┐
│     users       │───────┘                          │   permissions   │
├─────────────────┤                                  ├─────────────────┤
│ id              │                                  │ id              │
│ username        │                                  │ code            │
│ email           │                                  │ description     │
│ password_hash   │                                  └─────────────────┘
│ role_id (FK)    │                                           │
│ first_name      │                                           │
│ last_name       │                                           │
│ is_active       │                                           │
│ google_* fields │                              role_permissions
└────────┬────────┘                                  (join table)
         │
         │ assigned_dietitian_id
         ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│    patients     │          │     visits      │          │   visit_types   │
├─────────────────┤          ├─────────────────┤          ├─────────────────┤
│ id              │◀────────▶│ id              │─────────▶│ id              │
│ first_name      │          │ patient_id (FK) │          │ name            │
│ last_name       │          │ dietitian_id    │          │ color           │
│ email           │          │ visit_date      │          │ is_active       │
│ phone           │          │ visit_type      │          └─────────────────┘
│ assigned_diet_id│          │ status          │
│ is_active       │          │ duration        │
│ language_pref   │          │ visit_summary   │
│ unsubscribe_tok │          │ google_* fields │
└────────┬────────┘          └────────┬────────┘
         │                            │
         │                            │
         ▼                            ▼
┌─────────────────┐          ┌─────────────────┐
│ patient_cf_val  │          │  visit_cf_val   │
├─────────────────┤          ├─────────────────┤
│ id              │          │ id              │
│ patient_id (FK) │          │ visit_id (FK)   │
│ field_def_id    │          │ field_def_id    │
│ value           │          │ value           │
└────────┬────────┘          └────────┬────────┘
         │                            │
         └──────────────┬─────────────┘
                        │
                        ▼
         ┌─────────────────────────┐
         │ custom_field_definitions│
         ├─────────────────────────┤
         │ id                      │
         │ category_id (FK)        │◀──────────┐
         │ field_name              │           │
         │ field_label             │           │
         │ field_type              │  ┌─────────────────────┐
         │ formula                 │  │ custom_field_cat.   │
         │ dependencies            │  ├─────────────────────┤
         └─────────────────────────┘  │ id                  │
                                      │ name                │
                                      │ entity_types        │
┌─────────────────┐                   │ display_layout      │
│ measure_defs    │                   └─────────────────────┘
├─────────────────┤
│ id              │
│ name            │◀────────────────────┐
│ display_name    │                     │
│ measure_type    │          ┌─────────────────┐
│ unit            │          │ patient_measures│
│ alert_threshold │          ├─────────────────┤
│ formula         │◀────────▶│ id              │
└────────┬────────┘          │ patient_id (FK) │
         │                   │ measure_def_id  │
         │                   │ numeric_value   │
         ▼                   │ visit_id (opt)  │
┌─────────────────┐          └────────┬────────┘
│ measure_alerts  │                   │
├─────────────────┤◀──────────────────┘
│ id              │
│ patient_id (FK) │
│ measure_def_id  │
│ alert_value     │
│ status          │
└─────────────────┘

┌─────────────────┐          ┌─────────────────┐
│     billing     │          │    payments     │
├─────────────────┤          ├─────────────────┤
│ id              │◀────────▶│ id              │
│ patient_id (FK) │          │ billing_id (FK) │
│ visit_id (FK)   │          │ amount          │
│ invoice_number  │          │ payment_date    │
│ amount_total    │          │ payment_method  │
│ status          │          └─────────────────┘
└─────────────────┘

┌─────────────────┐          ┌─────────────────┐
│   documents     │          │ document_shares │
├─────────────────┤          ├─────────────────┤
│ id              │◀────────▶│ id              │
│ uploaded_by     │          │ document_id (FK)│
│ file_path       │          │ patient_id (FK) │
│ resource_type   │          │ shared_by       │
│ resource_id     │          │ access_level    │
└─────────────────┘          └─────────────────┘

┌─────────────────┐          ┌─────────────────┐
│ email_templates │          │   email_logs    │
├─────────────────┤          ├─────────────────┤
│ id              │◀────────▶│ id              │
│ name            │          │ template_id (FK)│
│ subject         │          │ patient_id      │
│ body_html       │          │ sent_by         │
│ body_text       │          │ recipient_email │
│ is_active       │          │ status          │
└─────────────────┘          └─────────────────┘
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Architecture Team | Initial document |

---

*This document is auto-generated and should be updated when significant architectural changes are made.*
