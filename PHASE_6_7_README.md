# NutriVault Phase 6 & 7 Implementation Guide

## Overview

This guide covers the implementation of Phase 6 (Visit Management API) and Phase 7 (User Management API) for the NutriVault application, along with the corresponding frontend UI (Phases 15 & 18).

## Current Status

### Completed Components

**Backend (Phase 6 & 7)**
- ✅ Visit Management Service with RBAC and audit logging
- ✅ Visit Management Controller and Routes
- ✅ User Management Service with security
- ✅ User Management Controller and Routes
- ✅ Sample data seeders (patients, dietitian, assistant users)

**Frontend (Phase 15 & 18)**
- ✅ Visit Management Page with filters and pagination
- ✅ Visit Modal (Create, View, Edit) with measurements
- ✅ User Management Page (Admin only)
- ✅ User Modal (Create, Edit) with password strength meter
- ✅ Change Password Modal with admin bypass
- ✅ Dashboard integration with real API calls

## Quick Start

### Prerequisites
- Node.js 16+ installed
- SQLite3 (included with npm packages)
- Backend running on port 3001
- Frontend running on port 5173

### Setup

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd frontend
   npm install
   ```

2. **Create Database Schema**
   The database is created automatically with Sequelize migrations.

3. **Seed Initial Data**
   ```bash
   cd backend
   npm run seed
   ```

   This creates:
   - Roles: ADMIN, DIETITIAN, ASSISTANT, VIEWER
   - Permissions: All permissions for each role
   - Users:
     - admin / Admin123!
     - dietitian / Dietitian123!
     - assistant / Assistant123!
   - Patients: 4 sample patients (John, Sarah, Michael, Emily)

### Running the Application

**Terminal 1 - Backend Server**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend Server**
```bash
cd frontend
npm run dev
# Application runs on http://localhost:5173
```

## Test Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | Admin123! | ADMIN |
| dietitian | Dietitian123! | DIETITIAN |
| assistant | Assistant123! | ASSISTANT |

## API Endpoints

### Visit Management

**GET /api/visits**
- List all visits with RBAC filtering
- Query parameters: page, limit, search, patient_id, dietitian_id, status, start_date, end_date
- Response: `{ success: true, data: [...], pagination: {...} }`

**GET /api/visits/:id**
- Get single visit with associated data
- Response: `{ success: true, data: {...} }`

**POST /api/visits**
- Create new visit
- Body: `{ patient_id, dietitian_id, visit_date, visit_type, status, duration_minutes, chief_complaint, assessment, recommendations, notes, next_visit_date }`
- Validation: UUID IDs, ISO8601 dates, status enum
- Response: `{ success: true, data: {...} }`

**PUT /api/visits/:id**
- Update existing visit
- Same body parameters as POST
- Response: `{ success: true, data: {...} }`

**DELETE /api/visits/:id**
- Delete visit (hard delete)
- Response: `{ success: true, message: "Visit deleted" }`

**POST /api/visits/:id/measurements**
- Add measurements to visit
- Body: `{ weight_kg, height_cm, blood_pressure, waist_circumference, body_fat_percentage, muscle_mass_percentage }`
- Auto-calculates BMI: `weight_kg / (height_cm/100)²`
- Response: `{ success: true, data: {...} }`

### User Management

**GET /api/users** (Admin only)
- List all users with role and permission info
- Query parameters: page, limit, search, role_id, status
- Response: `{ success: true, data: [...], pagination: {...} }`

**GET /api/users/:id** (Admin or self)
- Get single user
- Response: `{ success: true, data: {...} }`

**POST /api/users** (Admin only)
- Create new user
- Body: `{ username, email, password, role_id, first_name, last_name, phone }`
- Password requirements: 8+ chars, uppercase, lowercase, number, special char
- Response: `{ success: true, data: {...} }`

**PUT /api/users/:id** (Admin or self)
- Update user (admin updates all fields, users update self only)
- Body: Subset of `{ email, first_name, last_name, phone, role_id }`
- Response: `{ success: true, data: {...} }`

**DELETE /api/users/:id** (Admin only)
- Soft delete user (sets is_active=false)
- Response: `{ success: true, message: "User deleted" }`

**POST /api/users/:id/change-password**
- Change password (self or admin)
- Body: `{ old_password, new_password }` (admin: new_password only)
- Response: `{ success: true, message: "Password changed" }`

**PUT /api/users/:id/status** (Admin only)
- Toggle user active/inactive status
- Body: `{ is_active: true/false }`
- Response: `{ success: true, data: {...} }`

## Frontend Pages

### Visits Page
- **Route:** `/visits`
- **Access:** DIETITIAN, ADMIN
- **Features:**
  - List all visits with pagination
  - Filters: Patient search, status dropdown, patient selector
  - Actions: Create, View, Edit, Delete
  - Modal with full visit details and measurements

### Users Page
- **Route:** `/users`
- **Access:** ADMIN only (non-admin redirected to dashboard)
- **Features:**
  - List all users with role and status
  - Filters: Username/email search, role, status
  - Actions: Create, Edit, Toggle Status, Reset Password, Delete
  - Two modals: UserModal for CRUD, ChangePasswordModal for password reset

### Dashboard
- **Updated Stats:**
  - Total Patients (with link to Patients page)
  - Scheduled Visits (today/upcoming)
  - Total Visits (all time)
  - Total Users (admin) or Your Role (non-admin)

## Testing

### Create a Visit (Step by Step)

1. **Login as Dietitian**
   - Username: `dietitian`
   - Password: `Dietitian123!`

2. **Navigate to Visits**
   - Click "Visits" in sidebar or dashboard

3. **Create New Visit**
   - Click "Create Visit" button
   - Fill form:
     - **Patient:** Select "John Smith" from dropdown
     - **Dietitian:** Auto-selected as current user
     - **Visit Date:** Pick today or future date with time
     - **Visit Type:** Select from dropdown
     - **Status:** Keep as "SCHEDULED"
     - **Duration:** Enter 30-60 minutes
   - Click "Create" button

4. **Add Measurements** (Optional)
   - Expand "Measurements" section
   - Enter Weight (kg) and Height (cm) for auto-BMI calculation
   - Enter optional vital signs

5. **View Created Visit**
   - Check table for new visit
   - Click "View" to see details in modal
   - Click "Edit" to modify

### Manage Users (Step by Step)

1. **Login as Admin**
   - Username: `admin`
   - Password: `Admin123!`

2. **Navigate to Users**
   - Click "Users" in sidebar

3. **Create New User**
   - Click "Create User" button
   - Fill form:
     - **Username:** e.g., `viewer1`
     - **Email:** e.g., `viewer@example.com`
     - **Role:** Select "VIEWER"
     - **Password:** Must meet requirements (shows strength meter)
     - **First Name:** e.g., "John"
     - **Last Name:** e.g., "Viewer"
   - Click "Create" button

4. **Edit User**
   - Find user in table
   - Click "Edit" button
   - Modify fields (except username)
   - Click "Save" button

5. **Reset Password**
   - Click "Reset Password" button
   - Admin mode: No old password required
   - Enter new password twice
   - Click "Change" button

6. **Toggle User Status**
   - Click "Deactivate" or "Activate" button
   - User will be marked inactive/active

## Data Validation

### Visit Validation
- **patient_id:** Required, must be valid UUID of active patient
- **dietitian_id:** Required, must be valid UUID of active dietitian/admin
- **visit_date:** Required, must be ISO8601 format
- **duration_minutes:** 1-480 minutes (1 minute to 8 hours)
- **status:** SCHEDULED, COMPLETED, CANCELLED, or NO_SHOW

### User Validation
- **username:** Required, alphanumeric + underscore/hyphen, unique
- **email:** Required, valid email format, unique
- **password:** 8+ chars, uppercase, lowercase, number, special character
- **role_id:** Must be valid UUID of existing role

### Measurement Validation
- **weight_kg:** Decimal, positive
- **height_cm:** Decimal, positive
- **blood_pressure:** Optional, format: "120/80"
- **waist_circumference:** Optional, decimal, positive

## Error Handling

### Common Errors and Solutions

**400 Bad Request - Validation Error**
- Message: "Patient ID must be a valid UUID"
- Solution: Ensure patient/dietitian dropdowns have selected values

**400 Bad Request - Patient not found**
- Message: "Patient not found or inactive"
- Solution: Select patient from dropdown, ensure patient is active in database

**403 Forbidden - Permission Denied**
- Message: "User does not have permission"
- Solution: Verify user role has required permission

**404 Not Found**
- Message: "Visit/User not found"
- Solution: Visit/user may have been deleted, refresh page

**409 Conflict - Unique Constraint**
- Message: "Email already in use"
- Solution: Use different email address

## Database Schema

### Patients Table
- `id` (UUID, primary key)
- `first_name`, `last_name` (String, required)
- `email` (String, unique)
- `phone` (String)
- `date_of_birth` (Date)
- `gender` (String)
- `assigned_dietitian_id` (UUID, foreign key to users)
- `is_active` (Boolean, default: true)

### Visits Table
- `id` (UUID, primary key)
- `patient_id` (UUID, foreign key)
- `dietitian_id` (UUID, foreign key)
- `visit_date` (DateTime)
- `visit_type` (String)
- `status` (Enum: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW)
- `duration_minutes` (Integer)
- `chief_complaint` (Text)
- `assessment` (Text)
- `recommendations` (Text)
- `notes` (Text)
- `next_visit_date` (DateTime)

### VisitMeasurements Table
- `id` (UUID, primary key)
- `visit_id` (UUID, foreign key)
- `weight_kg` (Decimal)
- `height_cm` (Decimal)
- `bmi` (Decimal, auto-calculated)
- `blood_pressure` (String)
- `waist_circumference` (Decimal)
- `body_fat_percentage` (Decimal)
- `muscle_mass_percentage` (Decimal)

### Users Table
- `id` (UUID, primary key)
- `username` (String, unique)
- `email` (String, unique)
- `password_hash` (String, bcrypt hashed)
- `role_id` (UUID, foreign key)
- `first_name`, `last_name` (String)
- `phone` (String)
- `is_active` (Boolean)
- `failed_login_attempts` (Integer)
- `locked_until` (DateTime)
- `last_login` (DateTime)

## RBAC (Role-Based Access Control)

### Dietitian Role
- **Permissions:**
  - CREATE_VISIT, READ_VISIT, UPDATE_VISIT, DELETE_VISIT
  - VIEW_PATIENTS, READ_PATIENT
  - VIEW_USERS (limited), READ_USER (self only)

- **Restrictions:**
  - Can only see/edit own visits
  - Cannot view all users
  - Cannot manage other users

### Admin Role
- **Permissions:** All permissions (unrestricted)
- **Access:** All endpoints, all resources

### Assistant Role
- **Permissions:** Limited view permissions
- **Access:** VIEW_VISIT, VIEW_PATIENTS, VIEW_USERS (read-only)

### Viewer Role
- **Permissions:** Minimal view permissions
- **Access:** Limited to viewing non-sensitive data

## Audit Logging

All CRUD operations are logged:
- User ID, operation, resource, timestamp
- IP address, user agent, method
- Changes: old values vs new values
- Stored in `audit_logs` table

## Performance Notes

- **Pagination:** Default 10 items per page, max 50
- **Filtering:** Indexed on patient_id, dietitian_id, status, user_id, role_id
- **Caching:** No caching implemented (for simplicity)
- **N+1 queries:** Prevented using `.include()` for associations

## Known Limitations

- No email verification on user creation
- No password reset email functionality
- No time zone handling (dates stored as provided)
- No visit conflict detection (double-booking)
- No real-time updates (requires page refresh)

## Future Enhancements

- [ ] Email verification and password reset flow
- [ ] Visit conflict detection and prevention
- [ ] Real-time updates using WebSocket
- [ ] Advanced search with date range pickers
- [ ] Visit analytics and reporting dashboard
- [ ] Bulk user import from CSV
- [ ] Session timeout and extension
- [ ] Two-factor authentication

## Support

For issues or questions:
1. Check error messages in browser console
2. Check backend server logs
3. Review visit service logs for operation details
4. Check audit logs for who accessed what when

---

**Last Updated:** January 9, 2026
**Phase Status:** 6, 7 (Backend) ✅ | 15, 18 (Frontend) ✅
