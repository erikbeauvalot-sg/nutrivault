# Sprint 2: Calculated Fields - Implementation Plan

**Sprint Theme:** Extend custom fields with formula capabilities
**BMAD Focus:** Build formula engine + Measure calculation accuracy
**Duration:** 2 weeks
**Status:** IN PROGRESS (Phase 1 Complete)

---

## Overview

Sprint 2 adds calculated field capabilities to the custom fields system, allowing admins to create fields that automatically compute values based on formulas (e.g., BMI, Age, custom ratios).

---

## Phase 1: Database & Formula Engine ✅ COMPLETE

### Completed Work

**Database Migration** ✅
- Created `20260123233314-add-calculated-fields-support.js`
- Added 4 new columns to `custom_field_definitions`:
  - `formula` (TEXT) - Stores calculation formula
  - `dependencies` (JSON) - Tracks which fields this calculated field depends on
  - `decimal_places` (INTEGER) - Controls precision (0-4)
  - `is_calculated` (BOOLEAN) - Flags calculated fields
- Migration successfully applied to database

**Branch:** `feature/US-5.2.1-calculated-fields`
**Commit:** 8996352

---

## Remaining Work Summary

**20-28 hours of development across 6 phases:**

1. **Formula Engine Service** (3-4 hrs) - Core calculation logic
2. **Backend Integration** (2-3 hrs) - Models & services
3. **Frontend Components** (4-5 hrs) - FormulaEditor, UI updates
4. **API Endpoints** (1-2 hrs) - Validation & preview APIs
5. **Common Templates** (2-3 hrs) - BMI, Age presets
6. **Auto-Calculation** (3-4 hrs) - Dependency tracking & triggers
7. **Testing** (2-3 hrs) - Unit & integration tests

See full details below for step-by-step implementation guide.

---

## File Checklist

### Backend
- [x] migrations/20260123233314-add-calculated-fields-support.js ✅
- [ ] src/services/formulaEngine.service.js
- [ ] src/services/calculatedFieldTemplates.service.js
- [ ] tests/formulaEngine.test.js
- [ ] Update: models/CustomFieldDefinition.js
- [ ] Update: src/services/customFieldDefinition.service.js
- [ ] Update: src/services/patientCustomField.service.js

### Frontend
- [ ] components/FormulaEditor.jsx
- [ ] components/DependencyTree.jsx
- [ ] Update: components/CustomFieldDefinitionModal.jsx
- [ ] Update: components/CustomFieldInput.jsx

**Total Estimated Time:** 20-28 hours

---

## Quick Start Guide (When Resuming)

1. Create `formulaEngine.service.js` (Phase 2)
2. Update `CustomFieldDefinition` model
3. Build `FormulaEditor.jsx` component
4. Add calculated type to definition modal
5. Test with BMI formula

**Current Status:** Database ready, can start coding Phase 2
