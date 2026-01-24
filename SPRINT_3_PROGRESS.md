# Sprint 3 Progress - Measures Tracking Foundation

**Sprint Start**: 2026-01-24
**Status**: 🚧 IN PROGRESS
**Current Phase**: Phase 1 Complete, Starting Phase 2

---

## Overview

Sprint 3 focuses on building the foundation for time-series health measure tracking. This includes defining custom measures (weight, BP, glucose, etc.), logging measure values with timestamps, and optimizing for time-series queries.

### User Stories
- **US-5.3.1**: Define Custom Measures (HIGH) - ✅ Phase 1 Complete
- **US-5.3.2**: Log Measure Values (HIGH) - 🔄 Next
- **US-5.3.3**: CSV Bulk Import (HIGH) - 📋 Planned
- **US-5.3.4**: Time-Series Optimization (HIGH) - 📋 Planned

---

## Phase 1: Database & Models ✅ COMPLETE

### Completed (2026-01-24)

#### 1. Database Migration
**File**: `backend/migrations/20260124120000-create-measures-tables.js`
- ✅ Created `measure_definitions` table
  - 13 columns: id, name, display_name, description, category, measure_type, unit, min/max values, decimal_places, flags
  - Soft delete support (paranoid mode)
  - Measure types: numeric, text, boolean, calculated
  - Categories: vitals, lab_results, symptoms, anthropometric, lifestyle, other
- ✅ Created `patient_measures` table
  - Time-series data storage
  - Polymorphic value fields (numeric_value, text_value, boolean_value)
  - Links to patient, measure_definition, visit (optional), recorded_by
  - Timestamp: measured_at
- ✅ Indexes optimized for time-series queries:
  - patient_id + measured_at (time-series by patient)
  - measure_definition_id + measured_at (by measure type)
  - Composite: patient + measure + date
  - visit_id, measured_at

**Result**: Migration executed successfully ✅

#### 2. Sequelize Models
**Files**:
- `backend/src/models/MeasureDefinition.js` (195 lines)
- `backend/src/models/PatientMeasure.js` (175 lines)

**MeasureDefinition Features**:
- Validation rules (name format, min/max logic, category enum)
- getValue() method for polymorphic value retrieval
- validateValue() method for type-specific validation
- BeforeDestroy hook prevents deletion of system measures

**PatientMeasure Features**:
- Polymorphic value storage
- getValue(measureType) and setValue(measureType, value) methods
- formatValue(measureDefinition) for display
- BeforeValidate hook ensures at least one value field set
- Timestamp validation (no future dates)

**Result**: Models created successfully ✅

#### 3. Default Measures Seed
**File**: `backend/seeders/20260124120100-default-measures.js`
- ✅ 22 pre-configured system measures:
  - **Vitals** (6): weight, height, BP (systolic/diastolic), heart rate, temperature
  - **Lab Results** (6): blood glucose, HbA1c, cholesterol (total, LDL, HDL), triglycerides
  - **Anthropometric** (4): waist/hip circumference, body fat %, muscle mass
  - **Lifestyle** (3): sleep hours, water intake, exercise minutes
  - **Symptoms** (3): fatigue, headache, nausea (boolean)

**Result**: 22 measures inserted successfully ✅

---

## Phase 2: Backend Services & API 🔄 IN PROGRESS

### Todo

#### Services to Create
- [ ] `backend/src/services/measureDefinition.service.js`
  - getAllDefinitions(user, filters)
  - getDefinitionById(id, user)
  - createDefinition(data, user)
  - updateDefinition(id, data, user)
  - deleteDefinition(id, user) - soft delete
  - getByCategory(category, user)

- [ ] `backend/src/services/patientMeasure.service.js`
  - logMeasure(patientId, data, user)
  - getMeasures(patientId, filters, user)
  - getMeasureHistory(patientId, measureDefId, dateRange, user)
  - updateMeasure(id, data, user)
  - deleteMeasure(id, user) - soft delete
  - getMeasuresByVisit(visitId, user)
  - bulkImportMeasures(patientId, csvData, user)

#### API Routes to Create
- [ ] `backend/src/routes/measures.js`
  - GET /api/measures - list all measure definitions
  - POST /api/measures - create new measure definition
  - GET /api/measures/:id - get specific measure
  - PUT /api/measures/:id - update measure
  - DELETE /api/measures/:id - soft delete measure
  - GET /api/measures/category/:category - get by category

- [ ] `backend/src/routes/patientMeasures.js`
  - POST /api/patients/:patientId/measures - log new measure
  - GET /api/patients/:patientId/measures - get all measures for patient
  - GET /api/patients/:patientId/measures/:measureDefId/history - get history
  - PUT /api/patient-measures/:id - update measure
  - DELETE /api/patient-measures/:id - delete measure
  - POST /api/patients/:patientId/measures/bulk-import - CSV import
  - GET /api/visits/:visitId/measures - get measures by visit

#### Controllers
- [ ] `backend/src/controllers/measureDefinitionController.js`
- [ ] `backend/src/controllers/patientMeasureController.js`

---

## Phase 3: Frontend Components 📋 PLANNED

### Components to Create
- [ ] `frontend/src/pages/MeasuresPage.jsx` - Measure definitions management
- [ ] `frontend/src/components/MeasureDefinitionModal.jsx` - Create/edit definitions
- [ ] `frontend/src/components/LogMeasureModal.jsx` - Quick measure entry
- [ ] `frontend/src/components/PatientMeasuresTable.jsx` - List patient measures
- [ ] `frontend/src/components/MeasureHistory.jsx` - Time-series display
- [ ] `frontend/src/services/measureService.js` - API client

### Integration Points
- [ ] Add "Measures" tab to EditPatientPage.jsx
- [ ] Add quick-log from VisitDetailPage.jsx
- [ ] Add measures navigation item

---

## Phase 4: CSV Import & Bulk Operations 📋 PLANNED

### Features
- [ ] CSV parser for historical data
- [ ] Import validation
- [ ] Batch insert optimization
- [ ] Progress tracking
- [ ] Error handling and rollback

---

## Phase 5: Testing & Documentation 📋 PLANNED

### Tests
- [ ] Unit tests for models (validation logic)
- [ ] Service layer tests
- [ ] API endpoint tests
- [ ] Performance tests for time-series queries
- [ ] CSV import tests

### Documentation
- [ ] API documentation
- [ ] User guide for measures
- [ ] CSV import format spec
- [ ] Completion report

---

## Technical Decisions Made

### Data Model
- **Polymorphic value storage**: Allows different data types without type-specific tables
- **Soft delete**: Preserves historical data when measures deprecated
- **System measures**: is_system flag prevents deletion of defaults
- **Time-series indexing**: Composite indexes for efficient date-range queries

### Performance Optimizations
- Indexes on patient_id + measured_at for patient timeline queries
- Indexes on measure_definition_id + measured_at for measure-type analytics
- Composite index for specific measure queries

### Validation Strategy
- Model-level validations (Sequelize)
- Service-level business logic
- MeasureDefinition.validateValue() for type-specific checks

---

## Metrics Tracked

### Development
- Time spent Phase 1: ~1.5 hours
- Lines of code (Phase 1): ~600 lines
- Models created: 2
- Database tables: 2
- Default measures: 22

### Performance (Estimated)
- Time-series query: <100ms (indexed)
- Bulk insert: <1s for 100 measures
- CSV import: <5s for 1000 rows

---

## Next Steps

### Immediate
1. Create measureDefinition.service.js
2. Create patientMeasure.service.js
3. Create API routes
4. Create controllers
5. Test all CRUD operations

### After Backend Complete
6. Create frontend components
7. Integrate with EditPatientPage
8. Build CSV import feature
9. Write tests
10. Document everything

---

## Issues & Blockers

### None Currently
- Phase 1 completed smoothly
- Migration executed without errors
- Models validated successfully

---

**Last Updated**: 2026-01-24 12:35
**Phase**: 1 of 5 Complete (20%)
**Status**: On Track ✅
