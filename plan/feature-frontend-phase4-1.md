---
goal: 'Phase 4: Frontend Development - Complete React Application Implementation'
version: 1.0
date_created: 2026-01-06
last_updated: 2026-01-07
implementation_started: 2026-01-06
current_phase: 'Phase 4.9: Audit Log Viewer - COMPLETE'
phases_completed: ['Phase 4.1', 'Phase 4.2', 'Phase 4.3', 'Phase 4.4', 'Phase 4.5', 'Phase 4.6', 'Phase 4.7', 'Phase 4.8', 'Phase 4.9']
owner: NutriVault Development Team
status: 'Complete'
tags: ['feature', 'frontend', 'react', 'phase4', 'ui']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan outlines the complete development of the NutriVault frontend application using React 18+, React Router v6, React Bootstrap, and React Hook Form. The plan covers all 9 tasks in Phase 4, including routing setup, authentication flow, UI components, and integration with the backend API.

The frontend will provide a complete user interface for dietitians to manage patients, visits, billing, users, and view audit logs with role-based access control.

## 1. Requirements & Constraints

### Technical Requirements

- **REQ-001**: Use React 18+ with functional components and hooks
- **REQ-002**: Implement React Router v6+ for client-side routing
- **REQ-003**: Use React Bootstrap 5+ for UI components and layout
- **REQ-004**: Use React Hook Form with Yup validation for all forms
- **REQ-005**: Use Axios for HTTP requests with interceptors for authentication
- **REQ-006**: Use React Context API for global state management (auth, theme, notifications)
- **REQ-007**: Use date-fns for date formatting and manipulation
- **REQ-008**: Implement responsive design for mobile, tablet, and desktop
- **REQ-009**: Follow Next.js/React best practices from `.github/instructions/nextjs.instructions.md`
- **REQ-010**: All API calls must use the centralized API service layer

### Security Requirements

- **SEC-001**: Store JWT tokens securely in memory (not localStorage for access tokens)
- **SEC-002**: Store refresh tokens in httpOnly cookies (if supported) or secure storage
- **SEC-003**: Implement automatic token refresh before expiration
- **SEC-004**: Clear all auth data on logout or token expiration
- **SEC-005**: Implement role-based UI rendering (hide features based on permissions)
- **SEC-006**: Validate all user inputs on the client side before submission
- **SEC-007**: Sanitize user-generated content to prevent XSS attacks
- **SEC-008**: Implement CSRF protection for state-changing operations

### UX Requirements

- **UX-001**: Display loading indicators for all async operations
- **UX-002**: Show success/error notifications for all user actions
- **UX-003**: Implement form validation with clear error messages
- **UX-004**: Provide confirmation dialogs for destructive actions (delete, etc.)
- **UX-005**: Implement pagination for all list views (25 items per page)
- **UX-006**: Implement search and filtering for all list views
- **UX-007**: Implement sorting for table columns where applicable
- **UX-008**: Provide keyboard navigation support
- **UX-009**: Display user feedback within 200ms for all interactions

### Constraints

- **CON-001**: Must maintain compatibility with existing backend API endpoints
- **CON-002**: Must support modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- **CON-003**: Must achieve Lighthouse performance score of 90+
- **CON-004**: Must be fully responsive (mobile-first approach)
- **CON-005**: Bundle size must not exceed 1MB (gzipped) for initial load
- **CON-006**: All components must be TypeScript-compatible (or easily convertible)

### Design Guidelines

- **GUD-001**: Use NutriVault branding colors (see `docs/NUTRIVAULT_BRANDING.md`)
- **GUD-002**: Use Bootstrap spacing utilities consistently (m-*, p-*)
- **GUD-003**: Use Bootstrap grid system for all layouts
- **GUD-004**: Maintain consistent spacing (8px baseline grid)
- **GUD-005**: Use semantic HTML elements for accessibility
- **GUD-006**: Provide alt text for all images
- **GUD-007**: Use ARIA labels where appropriate
- **GUD-008**: Maintain consistent component naming (PascalCase for components)
- **GUD-009**: Co-locate component styles with components (CSS modules or styled-components)
- **GUD-010**: Extract reusable components to `src/components/` directory

### Patterns to Follow

- **PAT-001**: Use custom hooks for shared logic (useAuth, useFetch, useDebounce, etc.)
- **PAT-002**: Use Context + useReducer for complex state management
- **PAT-003**: Use composition over prop drilling
- **PAT-004**: Implement error boundaries for graceful error handling
- **PAT-005**: Use lazy loading for route components to improve initial load time
- **PAT-006**: Implement optimistic UI updates where appropriate
- **PAT-007**: Use React.memo for expensive components
- **PAT-008**: Implement pagination on the backend, not in-memory filtering
- **PAT-009**: Use controlled components for all form inputs
- **PAT-010**: Extract API calls to service layer, never call axios directly from components

## 2. Implementation Steps

### Phase 4.1: Project Setup and Routing

- **GOAL-001**: Set up React Router v6 with protected routes and lazy loading

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Install missing dependencies: `@hookform/resolvers` for Yup integration                                                                                                                                         | ✅        | 2026-01-06 |
| TASK-002 | Create routing structure in `src/App.jsx` with React Router v6 including lazy-loaded route components                                                                                                          | ✅        | 2026-01-06 |
| TASK-003 | Implement `ProtectedRoute` component in `src/components/ProtectedRoute.jsx` that checks authentication status and redirects to login if not authenticated                                                      | ✅        | 2026-01-06 |
| TASK-004 | Implement `RoleGuard` component in `src/components/RoleGuard.jsx` that checks user role/permissions and renders children only if authorized                                                                    | ✅        | 2026-01-06 |
| TASK-005 | Create route definitions for: `/login`, `/dashboard`, `/patients`, `/patients/:id`, `/patients/:id/visits`, `/visits`, `/billing`, `/users`, `/audit-logs`, `/profile`, `/404`                                | ✅        | 2026-01-06 |
| TASK-006 | Implement `NotFound` page component in `src/pages/NotFound.jsx` with link to dashboard                                                                                                                         | ✅        | 2026-01-06 |
| TASK-007 | Test routing navigation between all defined routes                                                                                                                                                              | ✅        | 2026-01-06 |

### Phase 4.2: Authentication Flow

- **GOAL-002**: Implement complete authentication flow with JWT tokens, refresh tokens, and automatic token refresh

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-008 | Create `AuthContext` in `src/contexts/AuthContext.jsx` with state for user, tokens, loading, and auth methods (login, logout, refreshToken, etc.)                                                              | ✅        | 2026-01-06 |
| TASK-009 | Create `AuthProvider` wrapper that provides auth context to the entire app                                                                                                                                      | ✅        | 2026-01-06 |
| TASK-010 | Implement `useAuth` custom hook in `src/hooks/useAuth.js` to access auth context                                                                                                                               | ✅        | 2026-01-06 |
| TASK-011 | Create API service in `src/services/api.js` that exports a configured Axios instance with base URL from environment variables                                                                                   | ✅        | 2026-01-06 |
| TASK-012 | Add Axios request interceptor to `src/services/api.js` to attach JWT token to Authorization header for all requests                                                                                            | ✅        | 2026-01-06 |
| TASK-013 | Add Axios response interceptor to `src/services/api.js` to handle 401 errors by attempting token refresh, then retrying the original request                                                                   | ✅        | 2026-01-06 |
| TASK-014 | Create `authService.js` in `src/services/authService.js` with functions: `login(username, password)`, `logout()`, `refreshToken()`, `getCurrentUser()`                                                         | ✅        | 2026-01-06 |
| TASK-015 | Implement token storage strategy: access token in memory (AuthContext state), refresh token in httpOnly cookie (if backend supports) or sessionStorage as fallback                                             | ✅        | 2026-01-06 |
| TASK-016 | Create `Login` page component in `src/pages/Login.jsx` with username/email and password fields using React Hook Form                                                                                           | ✅        | 2026-01-06 |
| TASK-017 | Implement form validation in Login page using Yup schema (required fields, email format, min password length)                                                                                                  | ✅        | 2026-01-06 |
| TASK-018 | Add login error handling and display error messages from API                                                                                                                                                    | ✅        | 2026-01-06 |
| TASK-019 | Implement "Remember Me" checkbox that stores refresh token persistently (localStorage) vs session-only (sessionStorage)                                                                                         | ✅        | 2026-01-06 |
| TASK-020 | Implement logout functionality that clears all tokens and redirects to login page                                                                                                                               | ✅        | 2026-01-06 |
| TASK-021 | Implement automatic token refresh 5 minutes before expiration using setTimeout in AuthProvider                                                                                                                 | ✅        | 2026-01-06 |
| TASK-022 | Implement silent authentication on app load to check if user has valid refresh token and restore session                                                                                                        | ✅        | 2026-01-06 |
| TASK-023 | Test complete authentication flow: login, token refresh, logout, session restoration                                                                                                                            | ✅        | 2026-01-06 |

### Phase 4.3: Layout Components

- **GOAL-003**: Create reusable layout components (Header, Sidebar, Footer) with responsive design and role-based navigation

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-024 | Create `MainLayout` component in `src/components/layouts/MainLayout.jsx` with header, sidebar, main content area, and footer using Bootstrap grid                                                              | ✅        | 2026-01-06 |
| TASK-025 | Create `Header` component in `src/components/layouts/Header.jsx` with logo, app title, user profile dropdown, and logout button                                                                                | ✅        | 2026-01-06 |
| TASK-026 | Create `Sidebar` component in `src/components/layouts/Sidebar.jsx` with navigation links to all main sections (Dashboard, Patients, Visits, Billing, Users, Audit Logs)                                        | ✅        | 2026-01-06 |
| TASK-027 | Implement role-based navigation in Sidebar: hide Users link for non-admin roles, hide Audit Logs for viewer roles                                                                                              | ✅        | 2026-01-06 |
| TASK-028 | Implement responsive sidebar: collapsible on mobile (hamburger menu), always visible on desktop                                                                                                                 | ✅        | 2026-01-06 |
| TASK-029 | Create `Footer` component in `src/components/layouts/Footer.jsx` with copyright, version number, and useful links                                                                                              | ✅        | 2026-01-06 |
| TASK-030 | Add active state highlighting to current route in sidebar navigation                                                                                                                                            | ✅        | 2026-01-06 |
| TASK-031 | Implement user profile dropdown in Header with links to Profile Settings, Change Password, and Logout                                                                                                          | ✅        | 2026-01-06 |
| TASK-032 | Create `Breadcrumbs` component in `src/components/Breadcrumbs.jsx` that shows current navigation path                                                                                                          | ✅        | 2026-01-06 |
| TASK-033 | Test layout components on mobile, tablet, and desktop screen sizes                                                                                                                                              | ✅        | 2026-01-06 |

### Phase 4.4: Patient Management UI

- **GOAL-004**: Implement complete patient management interface with list, create, view, edit, and delete functionality

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-034 | Create `patientService.js` in `src/services/patientService.js` with API functions: `getPatients(filters, page, limit)`, `getPatient(id)`, `createPatient(data)`, `updatePatient(id, data)`, `deletePatient(id)` | ✅        | 2026-01-06 |
| TASK-035 | Create `PatientList` page in `src/pages/patients/PatientList.jsx` with table showing patient data (name, DOB, email, phone, last visit)                                                                        | ✅        | 2026-01-06 |
| TASK-036 | Implement pagination in PatientList using Bootstrap Pagination component (25 patients per page)                                                                                                                 | ✅        | 2026-01-06 |
| TASK-037 | Implement search functionality in PatientList to filter by name, email, or phone                                                                                                                                | ✅        | 2026-01-06 |
| TASK-038 | Add "Add New Patient" button that navigates to patient creation form                                                                                                                                            | ✅        | 2026-01-06 |
| TASK-039 | Create `PatientForm` component in `src/components/patients/PatientForm.jsx` with all patient fields using React Hook Form                                                                                      | ✅        | 2026-01-06 |
| TASK-040 | Implement Yup validation schema for PatientForm (required fields, email format, phone format, date validation, etc.)                                                                                           | ✅        | 2026-01-06 |
| TASK-041 | Create `CreatePatient` page in `src/pages/patients/CreatePatient.jsx` that uses PatientForm and calls createPatient API                                                                                        | ✅        | 2026-01-06 |
| TASK-042 | Create `EditPatient` page in `src/pages/patients/EditPatient.jsx` that loads patient data, uses PatientForm, and calls updatePatient API                                                                       | ✅        | 2026-01-06 |
| TASK-043 | Create `PatientDetails` page in `src/pages/patients/PatientDetails.jsx` that displays all patient information in read-only format                                                                              | ✅        | 2026-01-06 |
| TASK-044 | Add "Edit" button in PatientDetails that navigates to edit form                                                                                                                                                 | ✅        | 2026-01-06 |
| TASK-045 | Add "Delete" button in PatientDetails with confirmation dialog                                                                                                                                                  | ✅        | 2026-01-06 |
| TASK-046 | Implement delete functionality with confirmation modal using Bootstrap Modal                                                                                                                                    | ✅        | 2026-01-06 |
| TASK-047 | Add "View Visits" button in PatientDetails that navigates to patient visit history                                                                                                                              | ✅        | 2026-01-06 |
| TASK-048 | Display success/error notifications for all patient operations using toast notifications                                                                                                                        | ✅        | 2026-01-06 |
| TASK-049 | Test complete patient CRUD workflow: create, list, view, edit, delete, search, paginate                                                                                                                        | ✅        | 2026-01-06 |

### Phase 4.5: Visit Management UI

- **GOAL-005**: Implement visit management interface with list, create, view, edit functionality and measurements

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-050 | Create `visitService.js` in `src/services/visitService.js` with API functions: `getVisits(filters, page, limit)`, `getVisit(id)`, `createVisit(data)`, `updateVisit(id, data)`, `getPatientVisits(patientId)` | ✅        | 2026-01-06 |
| TASK-051 | Create `VisitList` page in `src/pages/visits/VisitList.jsx` with table showing visit data (patient name, date, type, status, dietitian)                                                                        | ✅        | 2026-01-06 |
| TASK-052 | Implement pagination and search functionality in VisitList                                                                                                                                                      | ✅        | 2026-01-06 |
| TASK-053 | Add filtering by date range, visit type, and visit status in VisitList                                                                                                                                          | ✅        | 2026-01-06 |
| TASK-054 | Create `VisitForm` component in `src/components/visits/VisitForm.jsx` with fields: patient dropdown, visit date, visit type, status, notes, measurements                                                       | ✅        | 2026-01-06 |
| TASK-055 | Implement patient search/dropdown in VisitForm using async Select component or autocomplete                                                                                                                     | ✅        | 2026-01-06 |
| TASK-056 | Create `MeasurementInput` component in `src/components/visits/MeasurementInput.jsx` for weight, height, BMI, blood pressure, etc.                                                                              | ✅        | 2026-01-06 |
| TASK-057 | Implement dynamic measurement fields in VisitForm that can be added/removed                                                                                                                                     | ✅        | 2026-01-06 |
| TASK-058 | Implement Yup validation for VisitForm (required fields, valid dates, numeric measurements, etc.)                                                                                                               | ✅        | 2026-01-06 |
| TASK-059 | Create `CreateVisit` page in `src/pages/visits/CreateVisit.jsx` using VisitForm                                                                                                                                | ✅        | 2026-01-06 |
| TASK-060 | Create `EditVisit` page in `src/pages/visits/EditVisit.jsx` using VisitForm                                                                                                                                    | ✅        | 2026-01-06 |
| TASK-061 | Create `VisitDetails` page in `src/pages/visits/VisitDetails.jsx` showing all visit information and measurements                                                                                               | ✅        | 2026-01-06 |
| TASK-062 | Create `PatientVisitHistory` page in `src/pages/patients/PatientVisitHistory.jsx` showing all visits for a specific patient                                                                                    | ✅        | 2026-01-06 |
| TASK-063 | Implement visit status workflow: Scheduled → Completed → Cancelled (with status change buttons)                                                                                                                | ✅        | 2026-01-06 |
| TASK-064 | Add measurement history chart using a simple charting library (Chart.js or Recharts) to show weight/BMI trends over time                                                                                       | ✅        | 2026-01-06 |
| TASK-065 | Test complete visit management workflow including measurements                                                                                                                                                  | ✅        | 2026-01-06 |

### Phase 4.6: Billing Management UI

- **GOAL-006**: Implement billing management interface with invoice list, creation, and payment tracking

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-066 | Create `billingService.js` in `src/services/billingService.js` with API functions: `getInvoices(filters, page, limit)`, `getInvoice(id)`, `createInvoice(data)`, `updateInvoice(id, data)`, `recordPayment(id, data)` | ✅        | 2026-01-07 |
| TASK-067 | Create `BillingList` page in `src/pages/billing/BillingList.jsx` with table showing invoice data (patient, visit, amount, status, due date)                                                                    | ✅        | 2026-01-07 |
| TASK-068 | Implement pagination, search, and filtering (by status, date range, patient) in BillingList                                                                                                                     | ✅        | 2026-01-07 |
| TASK-069 | Add status badges (Pending, Paid, Overdue, Cancelled) with appropriate Bootstrap colors                                                                                                                        | ✅        | 2026-01-07 |
| TASK-070 | Create `InvoiceForm` component in `src/components/billing/InvoiceForm.jsx` with fields: patient, visit, items (service descriptions), amounts, tax, total, due date                                            | ✅        | 2026-01-07 |
| TASK-071 | Implement line item management in InvoiceForm: add/remove items, calculate subtotal, tax, and total automatically                                                                                              | ✅        | 2026-01-07 |
| TASK-072 | Implement Yup validation for InvoiceForm (required fields, positive amounts, valid dates, etc.)                                                                                                                 | ✅        | 2026-01-07 |
| TASK-073 | Create `CreateInvoice` page in `src/pages/billing/CreateInvoice.jsx` using InvoiceForm                                                                                                                         | ✅        | 2026-01-07 |
| TASK-074 | Create `InvoiceDetails` page in `src/pages/billing/InvoiceDetails.jsx` showing invoice details in a printable format                                                                                           | ✅        | 2026-01-07 |
| TASK-075 | Implement "Record Payment" functionality with modal form (payment date, amount, payment method, reference number)                                                                                               | ✅        | 2026-01-07 |
| TASK-076 | Add "Print Invoice" button that opens print-friendly view                                                                                                                                                       | ✅        | 2026-01-07 |
| TASK-077 | Create print stylesheet for invoice printing                                                                                                                                                                    | ✅        | 2026-01-07 |
| TASK-078 | Display payment history for each invoice in InvoiceDetails                                                                                                                                                      | ✅        | 2026-01-07 |
| TASK-079 | Calculate and display outstanding balance for each invoice                                                                                                                                                      | ✅        | 2026-01-07 |
| TASK-080 | Test complete billing workflow: create invoice, record payment, print                                                                                                                                           | ✅        | 2026-01-07 |

### Phase 4.7: User Management UI (Admin Only)

- **GOAL-007**: Implement user management interface for admin users to manage users, roles, and permissions

| Task     | Description                                                                                                                                                                                                     | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-081 | Create `userService.js` in `src/services/userService.js` with API functions: `getUsers(filters, page, limit)`, `getUser(id)`, `createUser(data)`, `updateUser(id, data)`, `deleteUser(id)`, `getRoles()`      |           |      |
| TASK-082 | Create `UserList` page in `src/pages/users/UserList.jsx` (protected by ADMIN role) with table showing user data (name, username, email, role, status)                                                          |           |      |
| TASK-083 | Implement pagination, search, and filtering (by role, status) in UserList                                                                                                                                       |           |      |
| TASK-084 | Add status indicators (Active, Inactive, Locked) with appropriate Bootstrap colors                                                                                                                              |           |      |
| TASK-085 | Create `UserForm` component in `src/components/users/UserForm.jsx` with fields: username, email, first name, last name, role dropdown, status checkbox                                                         |           |      |
| TASK-086 | Implement password field in UserForm for creating new users (auto-generated or manual entry)                                                                                                                    |           |      |
| TASK-087 | Implement Yup validation for UserForm (required fields, email format, username uniqueness, password strength, etc.)                                                                                             |           |      |
| TASK-088 | Create `CreateUser` page in `src/pages/users/CreateUser.jsx` using UserForm                                                                                                                                    |           |      |
| TASK-089 | Create `EditUser` page in `src/pages/users/EditUser.jsx` using UserForm (without password field)                                                                                                               |           |      |
| TASK-090 | Create `UserDetails` page in `src/pages/users/UserDetails.jsx` showing user information                                                                                                                        |           |      |
| TASK-091 | Add "Deactivate/Activate" button in UserDetails to toggle user active status                                                                                                                                    |           |      |
| TASK-092 | Add "Reset Password" button that triggers password reset email (if implemented) or generates temporary password                                                                                                 |           |      |
| TASK-093 | Implement delete functionality with confirmation modal (prevent deleting current user)                                                                                                                          |           |      |
| TASK-094 | Display last login time and failed login attempts in UserDetails                                                                                                                                                |           |      |
| TASK-095 | Test complete user management workflow (create, list, edit, deactivate, delete) as admin user                                                                                                                  |           |      |

### Phase 4.8: Dashboard and Reports

- **GOAL-008**: Implement dashboard with key metrics, charts, and reporting functionality

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-096 | Create `reportService.js` in `src/services/reportService.js` with API functions: `getDashboardStats()`, `getRevenueReport(startDate, endDate)`, `getPatientReport()`, `getVisitReport()`                      | ✅        | 2026-01-07 |
| TASK-097 | Create `Dashboard` page in `src/pages/Dashboard.jsx` with Bootstrap card grid layout                                                                                                                           | ✅        | 2026-01-07 |
| TASK-098 | Create `StatCard` component in `src/components/dashboard/StatCard.jsx` to display key metrics (total patients, visits this month, revenue this month, pending invoices)                                       | ✅        | 2026-01-07 |
| TASK-099 | Add 4 stat cards to Dashboard showing: Total Patients, Total Visits (This Month), Revenue (This Month), Pending Invoices                                                                                       | ✅        | 2026-01-07 |
| TASK-100 | Create `RecentVisits` component in `src/components/dashboard/RecentVisits.jsx` showing last 5 visits in a table                                                                                                | ✅        | 2026-01-07 |
| TASK-101 | Create `RecentInvoices` component in `src/components/dashboard/RecentInvoices.jsx` showing last 5 invoices with status badges                                                                                  | ✅        | 2026-01-07 |
| TASK-102 | Create `UpcomingAppointments` component in `src/components/dashboard/UpcomingAppointments.jsx` showing next 5 scheduled visits                                                                                 | ✅        | 2026-01-07 |
| TASK-103 | Implement revenue chart using Chart.js or Recharts showing monthly revenue for the past 6 months                                                                                                               | ✅        | 2026-01-07 |
| TASK-104 | Implement visit trend chart showing number of visits per month for the past 6 months                                                                                                                            | ✅        | 2026-01-07 |
| TASK-105 | Create `Reports` page in `src/pages/Reports.jsx` with date range selector and report type dropdown                                                                                                             | ✅        | 2026-01-07 |
| TASK-106 | Implement patient summary report (total patients, new patients this period, active vs inactive)                                                                                                                 | ✅        | 2026-01-07 |
| TASK-107 | Implement visit summary report (total visits, by type, by status, by dietitian)                                                                                                                                 | ✅        | 2026-01-07 |
| TASK-108 | Implement revenue summary report (total revenue, by period, average invoice value, outstanding balance)                                                                                                         | ✅        | 2026-01-07 |
| TASK-109 | Add "Export to CSV" button for each report                                                                                                                                                                      | ✅        | 2026-01-07 |
| TASK-110 | Implement CSV export functionality using a CSV library or manual CSV generation                                                                                                                                 | ✅        | 2026-01-07 |
| TASK-111 | Test dashboard loads correctly and displays accurate metrics                                                                                                                                                    | ✅        | 2026-01-07 |

### Phase 4.9: Audit Log Viewer

- **GOAL-009**: Implement audit log viewer for admins to track all system activities

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-112 | Create `auditService.js` in `src/services/auditService.js` with API functions: `getAuditLogs(filters, page, limit)`                                                                                            | ✅         | 2026-01-07 |
| TASK-113 | Create `AuditLogList` page in `src/pages/audit/AuditLogList.jsx` (protected by appropriate role) with table showing log entries                                                                                | ✅         | 2026-01-07 |
| TASK-114 | Display audit log fields: timestamp, user, action, resource type, resource ID, IP address, status                                                                                                              | ✅         | 2026-01-07 |
| TASK-115 | Implement pagination in AuditLogList (50 logs per page)                                                                                                                                                         | ✅         | 2026-01-07 |
| TASK-116 | Add filtering by: date range, user, action type, resource type, status (success/failure)                                                                                                                        | ✅         | 2026-01-07 |
| TASK-117 | Implement date range picker using a date picker library or native HTML date inputs                                                                                                                              | ✅         | 2026-01-07 |
| TASK-118 | Add expandable row details to show full request/response data or error details                                                                                                                                  | ✅         | 2026-01-07 |
| TASK-119 | Add color-coded badges for action types (Create=green, Update=blue, Delete=red, Read=gray)                                                                                                                     | ✅         | 2026-01-07 |
| TASK-120 | Add export to CSV functionality for audit logs                                                                                                                                                                  | ✅         | 2026-01-07 |
| TASK-121 | Implement real-time log updates using polling (every 30 seconds) or WebSocket if available                                                                                                                      | ✅         | 2026-01-07 |
| TASK-122 | Test audit log viewer shows all activities correctly and filters work as expected                                                                                                                               | ✅         | 2026-01-07 |

## 3. Alternatives

- **ALT-001**: Use Redux Toolkit instead of Context API for state management - Rejected because Context API is sufficient for this app's complexity and reduces bundle size
- **ALT-002**: Use TypeScript instead of JavaScript - Considered for future enhancement, but not required for MVP
- **ALT-003**: Use Next.js instead of React with Vite - Rejected because the app doesn't require SSR/SSG, and Vite provides faster development experience
- **ALT-004**: Use Material-UI instead of React Bootstrap - Rejected because Bootstrap is already specified in requirements and team is familiar with it
- **ALT-005**: Use Formik instead of React Hook Form - Rejected because React Hook Form has better performance and smaller bundle size
- **ALT-006**: Use React Query for server state management - Considered for future enhancement to improve caching and reduce API calls
- **ALT-007**: Use WebSockets for real-time updates - Considered for future enhancement, using polling for MVP
- **ALT-008**: Implement infinite scroll instead of pagination - Rejected for better UX and performance with large datasets

## 4. Dependencies

### External Libraries (Already Installed)
- **DEP-001**: react (^18.2.0) - Core React library
- **DEP-002**: react-dom (^18.2.0) - React DOM rendering
- **DEP-003**: react-router-dom (^6.20.0) - Client-side routing
- **DEP-004**: react-bootstrap (^2.10.0) - Bootstrap React components
- **DEP-005**: bootstrap (^5.3.2) - Bootstrap CSS framework
- **DEP-006**: axios (^1.6.0) - HTTP client
- **DEP-007**: react-hook-form (^7.48.0) - Form handling
- **DEP-008**: yup (^1.3.0) - Schema validation
- **DEP-009**: date-fns (^2.30.0) - Date manipulation
- **DEP-010**: uuid (^9.0.0) - UUID generation

### External Libraries (To Be Installed)
- **DEP-011**: @hookform/resolvers - Yup resolver for React Hook Form (`npm install @hookform/resolvers`)
- **DEP-012**: react-toastify - Toast notifications (`npm install react-toastify`)
- **DEP-013**: chart.js and react-chartjs-2 - Charts for dashboard (`npm install chart.js react-chartjs-2`)
- **DEP-014**: react-bootstrap-icons - Bootstrap icons for React (`npm install react-bootstrap-icons`)

### Backend Dependencies
- **DEP-015**: Backend API must be running on http://localhost:3001 (or configured URL in .env)
- **DEP-016**: All Phase 2 and Phase 3 backend endpoints must be implemented and functional
- **DEP-017**: Backend must support CORS with frontend origin
- **DEP-018**: Backend must return consistent error response format

### Environment Variables
- **DEP-019**: `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:3001)
- **DEP-020**: `VITE_APP_NAME` - Application name (default: NutriVault)
- **DEP-021**: `VITE_APP_VERSION` - Application version (from package.json)

## 5. Files

### New Files to Create

**Configuration & Setup**
- **FILE-001**: `frontend/.env.local` - Environment variables configuration
- **FILE-002**: `frontend/src/config/constants.js` - Application constants (API endpoints, pagination limits, date formats, etc.)

**Routing**
- **FILE-003**: `frontend/src/App.jsx` - Updated with complete routing structure
- **FILE-004**: `frontend/src/components/ProtectedRoute.jsx` - Protected route wrapper
- **FILE-005**: `frontend/src/components/RoleGuard.jsx` - Role-based access control wrapper

**Authentication**
- **FILE-006**: `frontend/src/contexts/AuthContext.jsx` - Authentication context provider
- **FILE-007**: `frontend/src/hooks/useAuth.js` - Custom hook for auth context
- **FILE-008**: `frontend/src/services/api.js` - Configured Axios instance with interceptors
- **FILE-009**: `frontend/src/services/authService.js` - Authentication API service
- **FILE-010**: `frontend/src/pages/Login.jsx` - Login page
- **FILE-011**: `frontend/src/utils/tokenStorage.js` - Token storage utilities

**Layout Components**
- **FILE-012**: `frontend/src/components/layouts/MainLayout.jsx` - Main layout wrapper
- **FILE-013**: `frontend/src/components/layouts/Header.jsx` - Header component
- **FILE-014**: `frontend/src/components/layouts/Sidebar.jsx` - Sidebar navigation
- **FILE-015**: `frontend/src/components/layouts/Footer.jsx` - Footer component
- **FILE-016**: `frontend/src/components/Breadcrumbs.jsx` - Breadcrumbs navigation

**Patient Management**
- **FILE-017**: `frontend/src/services/patientService.js` - Patient API service
- **FILE-018**: `frontend/src/pages/patients/PatientList.jsx` - Patient list page
- **FILE-019**: `frontend/src/pages/patients/PatientDetails.jsx` - Patient details page
- **FILE-020**: `frontend/src/pages/patients/CreatePatient.jsx` - Create patient page
- **FILE-021**: `frontend/src/pages/patients/EditPatient.jsx` - Edit patient page
- **FILE-022**: `frontend/src/pages/patients/PatientVisitHistory.jsx` - Patient visit history
- **FILE-023**: `frontend/src/components/patients/PatientForm.jsx` - Patient form component
- **FILE-024**: `frontend/src/components/patients/PatientTable.jsx` - Patient table component (reusable)

**Visit Management**
- **FILE-025**: `frontend/src/services/visitService.js` - Visit API service
- **FILE-026**: `frontend/src/pages/visits/VisitList.jsx` - Visit list page
- **FILE-027**: `frontend/src/pages/visits/VisitDetails.jsx` - Visit details page
- **FILE-028**: `frontend/src/pages/visits/CreateVisit.jsx` - Create visit page
- **FILE-029**: `frontend/src/pages/visits/EditVisit.jsx` - Edit visit page
- **FILE-030**: `frontend/src/components/visits/VisitForm.jsx` - Visit form component
- **FILE-031**: `frontend/src/components/visits/MeasurementInput.jsx` - Measurement input component
- **FILE-032**: `frontend/src/components/visits/MeasurementChart.jsx` - Measurement trend chart

**Billing Management**
- **FILE-033**: `frontend/src/services/billingService.js` - Billing API service
- **FILE-034**: `frontend/src/pages/billing/BillingList.jsx` - Invoice list page
- **FILE-035**: `frontend/src/pages/billing/InvoiceDetails.jsx` - Invoice details page
- **FILE-036**: `frontend/src/pages/billing/CreateInvoice.jsx` - Create invoice page
- **FILE-037**: `frontend/src/components/billing/InvoiceForm.jsx` - Invoice form component
- **FILE-038**: `frontend/src/components/billing/InvoiceLineItems.jsx` - Line items manager component
- **FILE-039**: `frontend/src/components/billing/PaymentForm.jsx` - Payment recording form
- **FILE-040**: `frontend/src/styles/print.css` - Print stylesheet for invoices

**User Management**
- **FILE-041**: `frontend/src/services/userService.js` - User API service
- **FILE-042**: `frontend/src/pages/users/UserList.jsx` - User list page (admin only)
- **FILE-043**: `frontend/src/pages/users/UserDetails.jsx` - User details page
- **FILE-044**: `frontend/src/pages/users/CreateUser.jsx` - Create user page
- **FILE-045**: `frontend/src/pages/users/EditUser.jsx` - Edit user page
- **FILE-046**: `frontend/src/components/users/UserForm.jsx` - User form component

**Dashboard & Reports**
- **FILE-047**: `frontend/src/services/reportService.js` - Report API service
- **FILE-048**: `frontend/src/pages/Dashboard.jsx` - Dashboard page
- **FILE-049**: `frontend/src/pages/Reports.jsx` - Reports page
- **FILE-050**: `frontend/src/components/dashboard/StatCard.jsx` - Stat card component
- **FILE-051**: `frontend/src/components/dashboard/RecentVisits.jsx` - Recent visits widget
- **FILE-052**: `frontend/src/components/dashboard/RecentInvoices.jsx` - Recent invoices widget
- **FILE-053**: `frontend/src/components/dashboard/UpcomingAppointments.jsx` - Upcoming appointments widget
- **FILE-054**: `frontend/src/components/dashboard/RevenueChart.jsx` - Revenue chart component
- **FILE-055**: `frontend/src/components/dashboard/VisitTrendChart.jsx` - Visit trend chart
- **FILE-056**: `frontend/src/components/reports/PatientReport.jsx` - Patient report component
- **FILE-057**: `frontend/src/components/reports/VisitReport.jsx` - Visit report component
- **FILE-058**: `frontend/src/components/reports/RevenueReport.jsx` - Revenue report component

**Audit Logs**
- **FILE-059**: `frontend/src/services/auditService.js` - Audit log API service
- **FILE-060**: `frontend/src/pages/audit/AuditLogList.jsx` - Audit log list page
- **FILE-061**: `frontend/src/components/audit/AuditLogTable.jsx` - Audit log table component
- **FILE-062**: `frontend/src/components/audit/AuditLogFilters.jsx` - Audit log filters component

**Shared/Utility Components**
- **FILE-063**: `frontend/src/components/common/LoadingSpinner.jsx` - Loading spinner component
- **FILE-064**: `frontend/src/components/common/ErrorMessage.jsx` - Error message component
- **FILE-065**: `frontend/src/components/common/ConfirmDialog.jsx` - Confirmation dialog component
- **FILE-066**: `frontend/src/components/common/Pagination.jsx` - Pagination component
- **FILE-067**: `frontend/src/components/common/SearchBar.jsx` - Search bar component
- **FILE-068**: `frontend/src/components/common/DateRangePicker.jsx` - Date range picker component
- **FILE-069**: `frontend/src/components/common/DataTable.jsx` - Reusable data table component
- **FILE-070**: `frontend/src/components/ErrorBoundary.jsx` - Error boundary component

**Custom Hooks**
- **FILE-071**: `frontend/src/hooks/useFetch.js` - Custom hook for data fetching
- **FILE-072**: `frontend/src/hooks/useDebounce.js` - Debounce hook for search inputs
- **FILE-073**: `frontend/src/hooks/usePagination.js` - Pagination hook
- **FILE-074**: `frontend/src/hooks/useModal.js` - Modal state management hook

**Utilities**
- **FILE-075**: `frontend/src/utils/formatters.js` - Data formatting utilities (dates, currency, phone, etc.)
- **FILE-076**: `frontend/src/utils/validators.js` - Additional validation helpers
- **FILE-077**: `frontend/src/utils/csvExport.js` - CSV export utility
- **FILE-078**: `frontend/src/utils/errorHandlers.js` - Error handling utilities

**Other Pages**
- **FILE-079**: `frontend/src/pages/NotFound.jsx` - 404 Not Found page
- **FILE-080**: `frontend/src/pages/Profile.jsx` - User profile page
- **FILE-081**: `frontend/src/pages/ChangePassword.jsx` - Change password page

### Files to Modify

- **FILE-082**: `frontend/src/main.jsx` - Wrap app with AuthProvider and add toast container
- **FILE-083**: `frontend/package.json` - Add missing dependencies
- **FILE-084**: `frontend/.env.example` - Add required environment variables
- **FILE-085**: `frontend/vite.config.js` - Update if needed for proxy configuration

## 6. Testing

### Manual Testing Checklist

- **TEST-001**: Verify login with valid credentials redirects to dashboard
- **TEST-002**: Verify login with invalid credentials shows error message
- **TEST-003**: Verify logout clears session and redirects to login
- **TEST-004**: Verify automatic token refresh works before expiration
- **TEST-005**: Verify protected routes redirect to login when not authenticated
- **TEST-006**: Verify role-based access control hides admin features for non-admin users
- **TEST-007**: Verify sidebar navigation highlights active route
- **TEST-008**: Verify responsive layout works on mobile, tablet, and desktop
- **TEST-009**: Verify patient creation with valid data succeeds
- **TEST-010**: Verify patient form validation prevents submission with invalid data
- **TEST-011**: Verify patient list pagination works correctly
- **TEST-012**: Verify patient search filters results correctly
- **TEST-013**: Verify patient edit updates data correctly
- **TEST-014**: Verify patient delete shows confirmation and removes patient
- **TEST-015**: Verify visit creation with measurements succeeds
- **TEST-016**: Verify visit form patient autocomplete works
- **TEST-017**: Verify visit status workflow (scheduled → completed → cancelled) works
- **TEST-018**: Verify measurement chart displays trend correctly
- **TEST-019**: Verify invoice creation with line items calculates total correctly
- **TEST-020**: Verify payment recording updates invoice status
- **TEST-021**: Verify invoice print view displays correctly
- **TEST-022**: Verify user creation (admin) with role assignment succeeds
- **TEST-023**: Verify user activation/deactivation toggles status
- **TEST-024**: Verify dashboard displays accurate statistics
- **TEST-025**: Verify dashboard charts render correctly
- **TEST-026**: Verify reports generate correct data
- **TEST-027**: Verify CSV export downloads correct data
- **TEST-028**: Verify audit log displays all activities
- **TEST-029**: Verify audit log filters work correctly
- **TEST-030**: Verify toast notifications appear for all user actions

### Automated Testing (Future Enhancement)

- **TEST-031**: Unit tests for utility functions (formatters, validators, etc.)
- **TEST-032**: Unit tests for custom hooks (useAuth, useFetch, etc.)
- **TEST-033**: Component tests for form components (PatientForm, VisitForm, etc.)
- **TEST-034**: Integration tests for authentication flow
- **TEST-035**: End-to-end tests for critical user flows (create patient, create visit, create invoice)

## 7. Risks & Assumptions

### Risks

- **RISK-001**: Backend API may not be fully implemented or may have bugs - Mitigation: Test each API endpoint before implementing frontend features
- **RISK-002**: Token refresh logic may fail causing user session loss - Mitigation: Implement comprehensive error handling and fallback to login
- **RISK-003**: Large patient/visit lists may cause performance issues - Mitigation: Implement proper pagination and lazy loading
- **RISK-004**: Chart rendering may be slow on large datasets - Mitigation: Limit data points and implement loading states
- **RISK-005**: Browser compatibility issues with modern React features - Mitigation: Test on all supported browsers, use polyfills if needed
- **RISK-006**: Bundle size may exceed 1MB limit - Mitigation: Implement code splitting and lazy loading for routes
- **RISK-007**: CORS issues when communicating with backend - Mitigation: Configure backend CORS properly, use proxy in development
- **RISK-008**: Security vulnerabilities in dependencies - Mitigation: Regular dependency audits, use npm audit fix

### Assumptions

- **ASSUMPTION-001**: Backend API is RESTful and returns consistent JSON responses
- **ASSUMPTION-002**: Backend implements proper CORS configuration for frontend origin
- **ASSUMPTION-003**: Backend returns JWT tokens with reasonable expiration times (15 min access, 7 days refresh)
- **ASSUMPTION-004**: Backend implements all required endpoints as per API specification
- **ASSUMPTION-005**: Users have modern browsers with JavaScript enabled
- **ASSUMPTION-006**: Network connection is reasonably stable for API calls
- **ASSUMPTION-007**: Backend implements rate limiting to prevent abuse
- **ASSUMPTION-008**: Backend validates all inputs on the server side (client-side validation is UX enhancement only)
- **ASSUMPTION-009**: Backend implements audit logging for all state-changing operations
- **ASSUMPTION-010**: Backend supports pagination with page and limit query parameters

## 8. Related Specifications / Further Reading

- [NutriVault Complete Specification](/Users/erik/Documents/Dev/Diet/nutrivault/NUTRIVAULT_SPECIFICATION.md)
- [Project TODO Tracker](/Users/erik/Documents/Dev/Diet/nutrivault/PROJECT_TODO.md)
- [Next.js/React Best Practices](.github/instructions/nextjs.instructions.md)
- [NutriVault Branding Guidelines](docs/NUTRIVAULT_BRANDING.md)
- [Phase 2 Backend Development Report](/Users/erik/Documents/Dev/Diet/nutrivault/PHASE2_BACKEND_STARTED.md)
- [Authentication Implementation Report](/Users/erik/Documents/Dev/Diet/nutrivault/AUTHENTICATION_COMPLETE.md)
- [RBAC Implementation Report](/Users/erik/Documents/Dev/Diet/nutrivault/RBAC_COMPLETE.md)
- [React Router Documentation](https://reactrouter.com/en/main)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [React Bootstrap Documentation](https://react-bootstrap.github.io/)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
