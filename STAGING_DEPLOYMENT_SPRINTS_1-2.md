# Staging Deployment - Sprints 1 & 2

**Deployment Date**: 2026-01-24
**Branch**: `v5.0-features`
**Sprints**: Sprint 1 (Foundation & Quick Wins) + Sprint 2 (Calculated Fields)
**Status**: ✅ Ready for QA Testing

---

## Summary

This staging deployment includes all completed features from Sprints 1 and 2 of the V5 development cycle. The deployment is ready for QA testing before production release.

---

## Features Included

### Sprint 1: Foundation & Quick Wins (100% Complete)

#### US-5.1.1: RBAC Management UI ✅
- Full admin interface for role and permission management
- 7 RESTful API endpoints
- React components: RolesManagementPage, RoleModal, PermissionTree
- 134 translation keys (EN + FR)
- Soft delete, audit logging, RBAC protection

#### US-5.1.2: Remove Birth Date from Patient Views ✅
- Removed birth date column from patient list
- Removed from patient cards (mobile)
- Removed from patient detail modal
- Privacy/GDPR compliance improvement
- Birth date field remains in edit forms

#### US-5.1.3: Custom Fields in Patient List View ✅
- Added `show_in_list` column to custom_field_definitions
- Dynamic table columns in patient list
- Max 5 custom field columns enforced
- Backend + Frontend integration

#### US-5.1.4: Fix Alerts - Visits Without Custom Fields ✅
- Fixed broken alert system (deprecated notes field)
- Rewrote alerts.service.js for custom fields
- Shows visits without custom field data
- Auto-dismisses when fields filled

### Sprint 2: Calculated Fields (100% Complete)

#### US-5.2.1: Calculated Field Type ✅
- New "calculated" field type
- Formula engine (441 lines, 50 unit tests)
- Operators: +, -, *, /, ^ (power)
- Functions: sqrt, abs, round, floor, ceil, min, max
- Circular dependency detection
- Auto-recalculation on dependency changes
- Real-time formula preview API

#### US-5.2.2: Common Calculated Fields ✅
- 10 pre-built formula templates
- Categories: Health & Nutrition, Progress Tracking, Nutrition, Demographics
- Date functions: today(), year(), month(), day()
- Templates: BMI, Weight Loss, Waist-to-Hip Ratio, Age, etc.
- Template selector in UI with auto-population

#### US-5.2.3: Calculated Field Dependencies ✅
- DependencyTree.jsx component for visualization
- Hierarchical tree view of dependencies
- Performance optimizations:
  - Caching layer (5-minute TTL)
  - Topological ordering for cascading
  - Batch audit log insertion
  - Batch recalculation for formula updates
- Performance: <500ms for 1000 evaluations

---

## Database Migrations

### New Migrations

1. **add-calculated-fields-support.js** (from US-5.2.1)
   - Adds 4 columns to `custom_field_definitions`:
     - `is_calculated` (BOOLEAN)
     - `formula` (TEXT)
     - `dependencies` (TEXT, JSON array)
     - `decimal_places` (INTEGER)

### Migration Commands

```bash
# Backend migrations
cd backend
npm run db:migrate

# Verify migrations
sqlite3 backend/data/nutrivault.db ".schema custom_field_definitions"
```

---

## Environment Setup

### Prerequisites
- Node.js 18+
- SQLite3
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

Backend runs on: http://localhost:3001

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173 (or 5174 if 5173 in use)

### Docker Setup (Optional)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Access application
# Backend: http://localhost:3001
# Frontend: http://localhost (port 80)
```

---

## QA Testing Checklist

### Sprint 1 Testing

#### RBAC Management UI (US-5.1.1)
- [ ] Navigate to Roles Management page
- [ ] Create a new role with custom permissions
- [ ] Edit existing role and modify permissions
- [ ] Delete a role (soft delete)
- [ ] Verify permission tree display
- [ ] Check audit logs for role changes
- [ ] Test role assignment to users
- [ ] Verify translations (EN/FR)

#### Remove Birth Date (US-5.1.2)
- [ ] Open patient list - verify no birth date column
- [ ] Switch to mobile view - verify no birth date in cards
- [ ] Open patient detail modal - verify no birth date shown
- [ ] Edit patient - verify birth date field still present in form
- [ ] Save patient - verify birth date persists in database

#### Custom Fields in List (US-5.1.3)
- [ ] Navigate to Custom Field Definitions
- [ ] Toggle `show_in_list` for 1-5 fields
- [ ] Return to patient list - verify columns appear
- [ ] Try enabling 6th field - should warn about max 5
- [ ] Verify field values display correctly
- [ ] Test sorting by custom field columns
- [ ] Check mobile responsiveness

#### Fix Alerts (US-5.1.4)
- [ ] Create visit without custom field data
- [ ] Verify alert appears in dashboard widget
- [ ] View alert details - shows missing fields count
- [ ] Add custom field values to visit
- [ ] Verify alert auto-dismisses
- [ ] Create multiple visits - verify batch alerts

### Sprint 2 Testing

#### Calculated Field Type (US-5.2.1)
- [ ] Create new custom field with type "calculated"
- [ ] Enter formula: `{weight} / ({height} * {height})`
- [ ] Test formula preview endpoint
- [ ] Save calculated field
- [ ] Edit patient with weight/height values
- [ ] Verify BMI auto-calculates
- [ ] Change weight - verify BMI recalculates
- [ ] Test circular dependency prevention
- [ ] Verify audit logs for calculations

#### Common Templates (US-5.2.2)
- [ ] Create calculated field
- [ ] Open template selector dropdown
- [ ] Select "BMI (kg/m²)" template
- [ ] Verify formula auto-populates
- [ ] Verify dependencies auto-populate
- [ ] Verify decimal places set
- [ ] Test other templates (Age, Weight Loss %)
- [ ] Verify date functions work (today(), year(), etc.)
- [ ] Test template with patient data

#### Dependency Tree (US-5.2.3)
- [ ] Create calculated field with dependencies
- [ ] View dependency tree in modal
- [ ] Verify visual tree structure displays
- [ ] Verify all dependencies listed
- [ ] Verify formula shows in tree
- [ ] Check auto-recalculation notice
- [ ] Test with complex dependency chains
- [ ] Verify performance (<500ms for calculations)

---

## Performance Testing

### Metrics to Verify

1. **Formula Evaluation**
   - Single calculation: <50ms
   - 100 calculations: <100ms
   - 1000 calculations: <500ms

2. **API Endpoints**
   - GET /api/custom-field-definitions: <200ms
   - POST /api/formulas/preview: <100ms
   - PUT /api/patient-custom-fields/{id}: <300ms

3. **Auto-recalculation**
   - Single field update triggers recalc: <200ms
   - Cascading recalc (5 levels): <500ms
   - Batch update (10 fields): <1s

### Performance Test Commands

```bash
cd backend
npm test -- calculatedFields.performance.test.js
```

Expected output:
- ✅ All tests passing
- ✅ Performance thresholds met

---

## Security Testing

### Areas to Test

1. **RBAC Protection**
   - [ ] Non-admin cannot access role management
   - [ ] API endpoints require proper permissions
   - [ ] Audit logs capture all changes

2. **Formula Security**
   - [ ] No code injection possible
   - [ ] Invalid formulas rejected
   - [ ] Circular dependencies blocked

3. **Input Validation**
   - [ ] Custom field values validated
   - [ ] Formula syntax validated
   - [ ] API payloads validated

---

## Known Issues

### None Critical
- All features tested and working in development

### Minor Observations
- DependencyTree component uses inline styles (could be moved to CSS)
- Cache is in-memory (won't persist across server restarts)

---

## Rollback Plan

### If Critical Issues Found

1. **Stop Services**
   ```bash
   # If using Docker
   docker-compose down

   # If using npm dev
   # Kill backend and frontend processes
   ```

2. **Revert Database**
   ```bash
   cd backend
   npm run db:migrate:undo
   ```

3. **Switch to Previous Branch**
   ```bash
   git checkout main
   npm install
   npm run dev
   ```

4. **Document Issues**
   - Create GitHub issues for critical bugs
   - Update sprint retrospective

---

## Deployment Verification

### Health Checks

1. **Backend Health**
   ```bash
   curl http://localhost:3001/health
   # Expected: {"status":"ok"}
   ```

2. **Frontend Health**
   ```bash
   curl http://localhost:5173 (or appropriate port)
   # Expected: 200 OK
   ```

3. **Database Connection**
   ```bash
   cd backend
   sqlite3 data/nutrivault.db "SELECT COUNT(*) FROM custom_field_definitions WHERE is_calculated = 1;"
   # Expected: Number of calculated fields (if any created)
   ```

### Smoke Tests

- [ ] Login works
- [ ] Patient list loads
- [ ] Custom fields display
- [ ] Calculated fields compute
- [ ] Alerts show correctly
- [ ] Role management accessible (admin)

---

## Post-Deployment Tasks

### Monitoring

1. **Application Logs**
   - Monitor backend console for errors
   - Check frontend console for warnings
   - Review audit logs for suspicious activity

2. **Performance Metrics**
   - Monitor API response times
   - Track formula evaluation times
   - Watch for memory leaks

3. **User Feedback**
   - Collect QA tester feedback
   - Document usability issues
   - Note feature requests

### Documentation Updates

- [ ] Update user guide with new features
- [ ] Create video tutorials for calculated fields
- [ ] Document template formulas
- [ ] Update API documentation

---

## Next Steps

1. **QA Testing** (Current Phase)
   - Complete all checklists above
   - Document any bugs or issues
   - Performance validation

2. **Sprint 1-2 Retrospective**
   - Analyze metrics and feedback
   - Identify improvements
   - Adjust Sprint 3 planning

3. **Sprint 3 Planning**
   - Begin Measures Tracking Foundation
   - Review Sprint 1-2 lessons learned
   - Estimate Sprint 3 timeline

---

## Contact & Support

### For QA Issues
- Create GitHub issue with label "QA"
- Include steps to reproduce
- Attach screenshots if applicable

### For Critical Bugs
- Label as "critical"
- Notify development team immediately
- Consider rollback if blocking

---

## Changelog

### Sprint 1 (US-5.1.1 to US-5.1.4)
- Added RBAC Management UI
- Removed birth date from patient views
- Added custom fields to patient list
- Fixed alerts for custom fields

### Sprint 2 (US-5.2.1 to US-5.2.3)
- Implemented calculated field type
- Added 10 formula templates
- Created dependency tree visualization
- Performance optimizations

---

**Deployment Status**: ✅ READY FOR QA
**Branch**: v5.0-features
**Commit**: 84f0071
**Date**: 2026-01-24
