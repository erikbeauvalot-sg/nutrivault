# NutriVault POC

**Proof of Concept** - Simple Patient Management System

## What's Included

This POC demonstrates the core value proposition of NutriVault with basic patient management functionality.

### Features

- ✅ Basic patient CRUD operations (Create, Read, Update, Delete)
- ✅ SQLite database for data persistence
- ✅ Express.js REST API
- ✅ React frontend with forms and patient list
- ❌ No authentication (POC only)
- ❌ No validation (POC only)
- ❌ No RBAC (POC only)

### Tech Stack

**Backend:**
- Node.js + Express.js
- Sequelize ORM
- SQLite database

**Frontend:**
- React 18
- Vite
- Axios

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will start on http://localhost:3001

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:5173

### 3. Use the Application

Open http://localhost:5173 in your browser and start managing patients!

## API Endpoints

- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

## Database

SQLite database is automatically created at:
```
backend/data/nutrivault_poc.db
```

## Next Steps (MVP)

The next phase will add:
- User authentication (JWT)
- Role-based access control (RBAC)
- Input validation
- Audit logging
- Visit tracking
- Billing management
- File uploads
- Much more!

## POC Status

✅ TASK-001: Repository structure with Express.js server
✅ TASK-002: SQLite database with patients table  
✅ TASK-003: Basic patient CRUD API endpoints
✅ TASK-004: React frontend with patient forms
🔄 TASK-005: End-to-end testing (manual)

---

**License:** GPL-2.0  
**Version:** 0.1.0 (POC)
