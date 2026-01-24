# Deployment Guide - Measures Feature (US-5.3.1)

**Feature**: Measures Tracking System
**Sprint**: Sprint 3
**Version**: v5.0
**Branch**: feature/US-5.3.1-measures-tracking

---

## ⚠️ CRITICAL - Required Steps

The measures feature requires **3 database operations** in a specific order:

### 1️⃣ Migration - Create Tables
### 2️⃣ Seeder - Default Measures
### 3️⃣ Seeder - Permissions ⚠️ **DO NOT SKIP**

**Skipping step 3 will cause 403 Forbidden errors on all measures endpoints!**

---

## 📋 Deployment Checklist

### Pre-Deployment Verification

- [ ] Branch `feature/US-5.3.1-measures-tracking` merged to target branch
- [ ] Backend server stopped (if running)
- [ ] Database backup created
- [ ] Node modules installed (`npm install` in backend/)
- [ ] Environment variables configured

---

## 🚀 Deployment Steps

### Step 1: Database Migration

**Creates 2 tables**:
- `measure_definitions` - Store measure types
- `patient_measures` - Store patient measure values

```bash
cd backend

# Run migration
npx sequelize-cli db:migrate

# Expected output:
# == 20260124120000-create-measures-tables: migrating =======
# == 20260124120000-create-measures-tables: migrated (X.XXXs)
```

**Verify migration**:
```bash
# Check tables exist
sqlite3 data/nutrivault.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%measure%';"

# Should show:
# measure_definitions
# patient_measures
```

---

### Step 2: Seed Default Measures

**Creates 22 system measures**:
- Vitals: weight, height, BP, heart rate, temperature
- Lab Results: glucose, HbA1c, cholesterol, etc.
- Anthropometric: waist, hip, body fat, muscle mass
- Lifestyle: sleep, water, exercise
- Symptoms: fatigue, headache, nausea

```bash
# Run seeder
npx sequelize-cli db:seed --seed 20260124120100-default-measures.js

# Expected output:
# == 20260124120100-default-measures: migrating =======
# Executing (default): INSERT INTO `measure_definitions` ...
# == 20260124120100-default-measures: migrated (X.XXXs)
```

**Verify measures**:
```bash
# Check measure count
sqlite3 data/nutrivault.db "SELECT COUNT(*) FROM measure_definitions WHERE is_system = 1;"

# Should show: 22
```

---

### Step 3: Seed Permissions ⚠️ CRITICAL

**Creates 4 permissions + 10 role assignments**:

**Permissions**:
- `measures.read` - View measures
- `measures.create` - Create measures
- `measures.update` - Update measures
- `measures.delete` - Delete measures

**Role Assignments**:
- ADMIN → all 4 permissions
- DIETITIAN → read, create, update
- ASSISTANT → read, create
- VIEWER → read only

```bash
# Run permissions seeder
npx sequelize-cli db:seed --seed 20260124134038-add-measures-permissions.js

# Expected output:
# ✅ Created 4 measures permissions
# ✅ Assigned all measures permissions to ADMIN
# ✅ Assigned read/create/update measures permissions to DIETITIAN
# ✅ Assigned read/create measures permissions to ASSISTANT
# ✅ Assigned read measures permission to VIEWER
# ✅ Created 10 role-permission assignments
```

**Verify permissions**:
```bash
# Check permissions created
sqlite3 data/nutrivault.db "SELECT code FROM permissions WHERE resource = 'measures';"

# Should show:
# measures.read
# measures.create
# measures.update
# measures.delete

# Check role assignments
sqlite3 data/nutrivault.db "SELECT COUNT(*) FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE resource = 'measures');"

# Should show: 10
```

---

### Step 4: Restart Backend Server

```bash
# If using nodemon (development)
# Server should auto-restart

# If using pm2 (production)
pm2 restart nutrivault-backend

# If using systemd
sudo systemctl restart nutrivault-backend
```

**Verify server**:
```bash
# Health check
curl http://localhost:3001/health

# Should return:
# {"status":"OK","message":"NutriVault POC Server is running"}
```

---

### Step 5: Deploy Frontend (if needed)

```bash
cd frontend

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Deploy dist/ folder to web server
```

---

### Step 6: Verify Deployment

#### Backend Verification

**1. Test measures endpoints**:
```bash
# Get auth token (replace credentials)
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | jq -r '.token')

# Test GET measures
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/measures

# Should return 22 measures
```

**2. Test permissions**:
```bash
# Should NOT return 403 Forbidden
# Should return JSON array of measures
```

#### Frontend Verification

**1. Login as admin**:
- Navigate to http://your-domain.com
- Login with admin credentials

**2. Check navigation**:
- Sidebar should show "📏 Measures" (admin only)

**3. Test Measures page**:
- Click Measures → should load `/settings/measures`
- Should show 22 default measures
- Should NOT show "Missing required permission" error

**4. Test patient measures**:
- Go to any patient
- Click Edit → Measures tab
- Should load without errors
- Chart should display
- Table should display

---

## 🔄 Rollback Procedure

If deployment fails, rollback in reverse order:

### Rollback Step 1: Remove Permissions
```bash
npx sequelize-cli db:seed:undo --seed 20260124134038-add-measures-permissions.js

# Or manually:
sqlite3 data/nutrivault.db "DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE resource = 'measures');"
sqlite3 data/nutrivault.db "DELETE FROM permissions WHERE resource = 'measures';"
```

### Rollback Step 2: Remove Default Measures
```bash
npx sequelize-cli db:seed:undo --seed 20260124120100-default-measures.js

# Or manually:
sqlite3 data/nutrivault.db "DELETE FROM measure_definitions WHERE is_system = 1;"
```

### Rollback Step 3: Drop Tables
```bash
npx sequelize-cli db:migrate:undo --name 20260124120000-create-measures-tables.js

# Or manually:
sqlite3 data/nutrivault.db "DROP TABLE IF EXISTS patient_measures;"
sqlite3 data/nutrivault.db "DROP TABLE IF EXISTS measure_definitions;"
```

---

## 📝 Post-Deployment Tasks

### 1. Verify User Access

Test with different roles:

**ADMIN**:
- ✅ Can access `/settings/measures`
- ✅ Can create/edit/delete measure definitions
- ✅ Can log patient measures
- ✅ Can edit/delete patient measures

**DIETITIAN**:
- ❌ Cannot access `/settings/measures` (admin only page)
- ✅ Can view measures tab on patients
- ✅ Can log patient measures
- ✅ Can edit patient measures
- ❌ Cannot delete patient measures

**ASSISTANT**:
- ❌ Cannot access `/settings/measures`
- ✅ Can view measures tab
- ✅ Can log patient measures
- ❌ Cannot edit/delete measures

**VIEWER**:
- ❌ Cannot access `/settings/measures`
- ✅ Can view measures tab (read-only)
- ❌ Cannot log/edit/delete measures

### 2. Monitor Logs

Check for errors:
```bash
# Backend logs
tail -f backend/logs/app.log

# Or if using pm2
pm2 logs nutrivault-backend
```

### 3. Database Audit

Verify audit logs are being created:
```bash
sqlite3 data/nutrivault.db "SELECT * FROM audit_logs WHERE resource_type = 'measure_definitions' ORDER BY created_at DESC LIMIT 5;"
```

---

## 🐛 Troubleshooting

### Error: "Missing required permission: measures.read"

**Cause**: Step 3 (permissions seeder) was not run

**Fix**:
```bash
npx sequelize-cli db:seed --seed 20260124134038-add-measures-permissions.js
# Then restart backend and refresh browser
```

---

### Error: "Table measure_definitions does not exist"

**Cause**: Step 1 (migration) was not run

**Fix**:
```bash
npx sequelize-cli db:migrate
```

---

### Error: "No measures found"

**Cause**: Step 2 (default measures seeder) was not run

**Fix**:
```bash
npx sequelize-cli db:seed --seed 20260124120100-default-measures.js
```

---

### Frontend shows blank page at /settings/measures

**Check**:
1. Browser console for errors
2. Network tab - check API responses
3. Backend logs - check for 403/404 errors
4. User role - only ADMIN can access this page

---

### Permissions not applying after seeder

**Fix**: Users need to logout and login again to get fresh permissions

```bash
# Or restart backend to clear any permission cache
pm2 restart nutrivault-backend
```

---

## 📊 Success Criteria

Deployment is successful when:

- ✅ Migration created 2 tables
- ✅ Seeder inserted 22 default measures
- ✅ Seeder created 4 permissions + 10 role assignments
- ✅ Backend starts without errors
- ✅ Health check returns 200 OK
- ✅ GET /api/measures returns 22 measures (with valid token)
- ✅ Admin can access /settings/measures
- ✅ Admin can create new measure definition
- ✅ Dietitian can log patient measure
- ✅ Patient measures tab loads with chart
- ✅ No 403 Forbidden errors
- ✅ Audit logs being created

---

## 📞 Support

If issues persist after following this guide:

1. Check backend logs: `tail -f backend/logs/app.log`
2. Check browser console: F12 → Console tab
3. Verify database state:
   ```bash
   sqlite3 data/nutrivault.db
   .tables
   SELECT COUNT(*) FROM measure_definitions;
   SELECT COUNT(*) FROM permissions WHERE resource = 'measures';
   SELECT COUNT(*) FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE resource = 'measures');
   ```
4. Contact development team with error logs

---

## 🔐 Security Notes

- Permissions are enforced at the API level (backend)
- Frontend only hides UI elements for better UX
- All API endpoints require valid JWT token
- Audit logs track all measure operations
- System measures (is_system=true) cannot be deleted

---

**Deployment Completed By**: _______________
**Date**: _______________
**Environment**: ☐ Development ☐ Staging ☐ Production
**Verification Status**: ☐ Passed ☐ Failed

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24
**Feature**: US-5.3.1 - Define Custom Measures
