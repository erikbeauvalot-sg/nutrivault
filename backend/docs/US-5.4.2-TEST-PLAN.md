# Test Plan: US-5.4.2 - Calculated Measures

**Sprint:** 4 - Health Analytics & Trends
**Feature:** Calculated Measures with Formula Engine
**Date:** 2026-01-24
**Status:** Ready for Testing

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Manual Testing Scenarios](#manual-testing-scenarios)
3. [API Testing](#api-testing)
4. [Frontend Component Testing](#frontend-component-testing)
5. [Integration Testing](#integration-testing)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)
7. [Performance Testing](#performance-testing)
8. [Test Data Setup](#test-data-setup)
9. [Acceptance Criteria Verification](#acceptance-criteria-verification)

---

## Test Environment Setup

### Prerequisites

1. **Database Migration Applied**
   ```bash
   cd backend
   npm run migrate
   ```
   - Verify `formula`, `dependencies`, `last_formula_change` columns exist in `measure_definitions`
   - Check index on `measure_type` column

2. **Backend Server Running**
   ```bash
   cd backend
   npm run dev
   ```
   - Verify server starts on port 3001
   - Check no errors in console

3. **Frontend Server Running**
   ```bash
   cd frontend
   npm run dev
   ```
   - Verify frontend starts on port 5173
   - Check no compilation errors

4. **Admin User Credentials**
   - Username: `admin`
   - Password: (use existing admin password)
   - Only admins can create/edit measure definitions

---

## Manual Testing Scenarios

### Scenario 1: Create Simple Calculated Measure (BMI)

**Objective:** Create a BMI calculated measure using cross-measure formula

**Steps:**
1. Login as admin user
2. Navigate to Measures page
3. Click "Create Measure Definition" button
4. Fill in form:
   - Category: `Anthropometric`
   - Measure Type: `Calculated`
   - Name: `bmi`
   - Display Name: `Body Mass Index (BMI)`
   - Description: `Calculated as weight / height²`
   - Unit: `kg/m²`
   - Decimal Places: `2`
5. In Formula Configuration section:
   - Click "📋 Templates" button
   - Select "Body Mass Index (BMI)" template
   - Verify formula auto-populated: `{weight} / ({height} * {height})`
6. Observe real-time validation
7. Click "🔍 Preview Calculation"
   - Enter weight: `70` (kg)
   - Enter height: `1.75` (m)
   - Click "Calculate"
   - Verify result: `22.86`
8. Click "Create Measure"

**Expected Results:**
- ✅ Measure created successfully
- ✅ Formula validated without errors
- ✅ Dependencies badge shows: `weight, height`
- ✅ Preview calculation correct: 70 / (1.75 * 1.75) = 22.86
- ✅ Success message appears
- ✅ Measure appears in measures list

**Verification:**
- Refresh page, verify measure still exists
- Check measure type badge shows "Calculated"

---

### Scenario 2: Create Time-Series Calculated Measure (Weight Change)

**Objective:** Create a weight change measure using time-series formula

**Steps:**
1. Navigate to Measures page
2. Click "Create Measure Definition"
3. Fill in form:
   - Category: `Anthropometric`
   - Measure Type: `Calculated`
   - Name: `weight_change`
   - Display Name: `Weight Change`
   - Description: `Change from previous weight measurement`
   - Unit: `kg`
   - Decimal Places: `2`
4. Click "📋 Templates" button
5. Select "Weight Change" template
6. Verify formula: `{current:weight} - {previous:weight}`
7. Observe validation shows dependencies: `current:weight, previous:weight`
8. Click "Create Measure"

**Expected Results:**
- ✅ Measure created successfully
- ✅ Time-series syntax validated correctly
- ✅ Dependencies extracted including modifiers

---

### Scenario 3: Test Auto-Recalculation with Patient Data

**Objective:** Verify calculated measures auto-update when dependencies change

**Prerequisites:**
- BMI measure created (from Scenario 1)
- Patient exists in system

**Steps:**

**Part A: Create Prerequisite Measures**
1. Ensure `weight` measure exists (numeric, kg, 0-500 range)
2. Ensure `height` measure exists (numeric, m, 0-3 range)

**Part B: Log Patient Measures**
1. Navigate to a patient's detail page
2. Go to Measures tab
3. Click "Log Measure" button
4. Log Weight:
   - Measure: `Weight`
   - Value: `70`
   - Date/Time: (current date/time)
   - Click "Save"
5. Log Height:
   - Measure: `Height`
   - Value: `1.75`
   - Date/Time: (same date/time as weight)
   - Click "Save"

**Part C: Verify Auto-Calculation**
6. Refresh the measures table
7. Look for BMI entry with same timestamp

**Expected Results:**
- ✅ BMI measure automatically created
- ✅ BMI value: `22.86 kg/m²`
- ✅ BMI has "🧮 Calculated" badge
- ✅ BMI timestamp matches weight/height
- ✅ No edit button on BMI row (read-only)

**Part D: Test Recalculation on Update**
8. Edit the weight measure, change to `80` kg
9. Save the change
10. Refresh measures table

**Expected Results:**
- ✅ BMI automatically recalculated to `26.12 kg/m²`
- ✅ Updated BMI value reflects new weight

---

### Scenario 4: Test Time-Series Calculation (Weight Change)

**Objective:** Verify time-series formulas work correctly

**Prerequisites:**
- Weight Change measure created (from Scenario 2)
- Patient exists

**Steps:**
1. Navigate to patient's measures
2. Log first weight:
   - Measure: `Weight`
   - Value: `70`
   - Date: Today, 8:00 AM
   - Save
3. Log second weight:
   - Measure: `Weight`
   - Value: `72`
   - Date: Today, 10:00 AM
   - Save
4. Refresh measures table
5. Look for Weight Change entry at 10:00 AM

**Expected Results:**
- ✅ Weight Change calculated: `2.00 kg` (72 - 70)
- ✅ Weight Change has same timestamp as second weight (10:00 AM)
- ✅ Calculated badge shown

**Part B: Test with More Data Points**
6. Log third weight:
   - Value: `71`
   - Date: Today, 12:00 PM
7. Refresh table

**Expected Results:**
- ✅ New Weight Change entry: `-1.00 kg` (71 - 72)
- ✅ Previous Weight Change unchanged: `2.00 kg`

---

### Scenario 5: Test Formula Validation

**Objective:** Verify real-time validation catches errors

**Steps:**

**Test 1: Invalid Syntax**
1. Create new calculated measure
2. Enter formula: `{weight} / {height`
3. Observe validation

**Expected:** ❌ Error: "Unbalanced braces in formula"

**Test 2: Invalid Variable Name**
1. Enter formula: `{my-weight} / {height}`
2. Observe validation

**Expected:** ❌ Error: Invalid variable name

**Test 3: Division by Zero**
1. Enter formula: `{weight} / 0`
2. Click Preview
3. Enter weight: `70`
4. Click Calculate

**Expected:** ❌ Error: "Division by zero"

**Test 4: Invalid Time-Series Modifier**
1. Enter formula: `{future:weight} - {current:weight}`
2. Observe validation

**Expected:** ❌ Error: "Invalid time-series modifiers: future"

**Test 5: Missing Dependencies**
1. Enter formula: `{weight} / ({height} * {height})`
2. Preview with only weight (no height)

**Expected:** ❌ Error or null result

**Test 6: Valid Complex Formula**
1. Enter formula: `sqrt(({height} * {weight}) / 3600)`
2. Observe validation

**Expected:** ✅ Valid formula, dependencies: height, weight

---

### Scenario 6: Test Formula Templates

**Objective:** Verify all templates work correctly

**Steps:**
1. Create new calculated measure
2. Click "📋 Templates" button
3. Test each template:

**Template 1: BMI**
- Select template
- Verify formula: `{weight} / ({height} * {height})`
- Preview with weight=70, height=1.75
- Expected result: `22.86`

**Template 2: Weight Change**
- Select template
- Verify formula: `{current:weight} - {previous:weight}`
- Contains time-series variables

**Template 3: BSA (Mosteller)**
- Formula: `sqrt(({height} * {weight}) / 3600)`
- Preview with weight=70, height=175 (cm)
- Expected result: ~`1.85 m²`

**Template 4: Mean Arterial Pressure**
- Formula: `{diastolic_bp} + ({systolic_bp} - {diastolic_bp}) / 3`
- Preview with systolic=120, diastolic=80
- Expected result: `93.33 mmHg`

**Expected Results:**
- ✅ All templates load without errors
- ✅ Formulas auto-populate correctly
- ✅ Unit auto-fills when template applied
- ✅ Calculations accurate

---

### Scenario 7: Test Cascading Calculations

**Objective:** Verify dependent calculated measures work (diamond dependency)

**Setup:**
1. Create measures:
   - `weight` (numeric, kg)
   - `height` (numeric, m)
   - `bmi` (calculated: `{weight} / ({height} * {height})`)
   - `bmi_category` (calculated: uses bmi value)

**Formula for BMI Category (simplified numeric):**
```
{bmi} < 18.5 ? 1 : ({bmi} < 25 ? 2 : ({bmi} < 30 ? 3 : 4))
```
(Note: Formula engine may not support ternary. Alternative: use min/max)

**Alternative Simple Test:**
- `bmi_doubled` (calculated: `{bmi} * 2`)

**Steps:**
1. Create BMI measure
2. Create BMI Doubled measure with formula: `{bmi} * 2`
3. Log weight=70, height=1.75 for a patient
4. Check measures table

**Expected Results:**
- ✅ BMI calculated: `22.86`
- ✅ BMI Doubled calculated: `45.72`
- ✅ Both have calculated badges
- ✅ Calculations in correct order (topological sort)

---

### Scenario 8: Test Editing Calculated Measures

**Objective:** Verify calculated measures cannot be edited manually

**Steps:**
1. Navigate to patient measures table
2. Find a calculated measure (has 🧮 badge)
3. Try to click edit button

**Expected Results:**
- ✅ No edit button visible for calculated measures
- ✅ Delete button still available (admin only)

**Alternative Test:**
4. If edit button somehow appears, click it

**Expected Results:**
- ✅ Alert message: "Calculated measures cannot be edited. Update the source measures instead."

---

### Scenario 9: Test Bulk Recalculation

**Objective:** Verify bulk recalculation when formula changes

**Prerequisites:**
- BMI measure exists with multiple patient values

**Steps:**
1. Navigate to Measure Definitions
2. Edit BMI measure
3. Change formula to: `{weight} / ({height} * {height} * {height})` (intentionally wrong)
4. Save measure
5. Check if recalculation triggered (check console or API response)

**Expected Results:**
- ✅ System indicates recalculation started
- ✅ All BMI values for all patients recalculated
- ✅ `last_formula_change` timestamp updated

**Verification:**
6. Check patient BMI values have changed
7. Revert formula back to correct one: `{weight} / ({height} * {height})`
8. Save again

**Expected Results:**
- ✅ All BMI values corrected

---

### Scenario 10: Test Circular Dependency Prevention

**Objective:** Verify circular dependencies are rejected

**Steps:**

**Test 1: Direct Circular Dependency**
1. Create measure `test_a` with formula: `{test_b} * 2`
2. Create measure `test_b` with formula: `{test_a} * 2`

**Expected Results:**
- ✅ Second measure creation fails
- ✅ Error message: "Circular dependency detected"

**Test 2: Indirect Circular Dependency (A→B→C→A)**
1. Create `measure_a`: `{measure_b} + 1`
2. Create `measure_b`: `{measure_c} + 1`
3. Create `measure_c`: `{measure_a} + 1` (creates cycle)

**Expected Results:**
- ✅ Third measure creation fails
- ✅ Clear error message about cycle

---

## API Testing

### Test API Endpoints

Use Postman, curl, or Bruno API client.

**Setup:**
```bash
# Login first to get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Save token for subsequent requests
TOKEN="your_jwt_token_here"
```

---

### API Test 1: Validate Formula

**Endpoint:** `POST /api/formulas/validate`

**Valid Formula Test:**
```bash
curl -X POST http://localhost:3001/api/formulas/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "formula": "{weight} / ({height} * {height})"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "error": null,
    "dependencies": ["weight", "height"]
  }
}
```

**Invalid Formula Test:**
```bash
curl -X POST http://localhost:3001/api/formulas/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "formula": "{weight} / {height"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "error": "Unbalanced braces in formula",
    "dependencies": []
  }
}
```

**Time-Series Formula Test:**
```bash
curl -X POST http://localhost:3001/api/formulas/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "formula": "{current:weight} - {previous:weight}"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "error": null,
    "dependencies": ["current:weight", "previous:weight"]
  }
}
```

---

### API Test 2: Preview Formula

**Endpoint:** `POST /api/formulas/preview`

```bash
curl -X POST http://localhost:3001/api/formulas/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "formula": "{weight} / ({height} * {height})",
    "values": {
      "weight": 70,
      "height": 1.75
    },
    "decimalPlaces": 2
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "result": 22.86,
    "error": null
  }
}
```

---

### API Test 3: Get Formula Templates

**Endpoint:** `GET /api/formulas/templates/measures`

```bash
curl http://localhost:3001/api/formulas/templates/measures \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bmi",
      "name": "Body Mass Index (BMI)",
      "formula": "{weight} / ({height} * {height})",
      "dependencies": ["weight", "height"],
      "unit": "kg/m²",
      "category": "anthropometric"
    },
    {
      "id": "weight_change",
      "name": "Weight Change",
      "formula": "{current:weight} - {previous:weight}",
      "dependencies": ["weight"],
      "unit": "kg",
      "category": "trends"
    }
    // ... more templates
  ]
}
```

**Verification:**
- ✅ At least 10 templates returned
- ✅ Each template has id, name, formula, dependencies, unit, category
- ✅ BMI template included
- ✅ Weight Change template included

---

### API Test 4: Create Calculated Measure

**Endpoint:** `POST /api/measures`

```bash
curl -X POST http://localhost:3001/api/measures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "bmi_test",
    "display_name": "BMI Test",
    "description": "Test calculated measure",
    "category": "anthropometric",
    "measure_type": "calculated",
    "unit": "kg/m²",
    "decimal_places": 2,
    "formula": "{weight} / ({height} * {height})",
    "is_active": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "bmi_test",
    "display_name": "BMI Test",
    "measure_type": "calculated",
    "formula": "{weight} / ({height} * {height})",
    "dependencies": ["weight", "height"],
    "last_formula_change": "2026-01-24T...",
    "created_at": "2026-01-24T...",
    "updated_at": "2026-01-24T..."
  }
}
```

**Verification:**
- ✅ Measure created successfully
- ✅ Dependencies auto-extracted
- ✅ last_formula_change timestamp set

---

### API Test 5: Log Measure and Trigger Recalculation

**Setup:** Ensure weight, height, and BMI measures exist

**Step 1: Log Weight**
```bash
curl -X POST http://localhost:3001/api/patients/{patientId}/measures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "measure_definition_id": "{weight_measure_id}",
    "numeric_value": 70,
    "measured_at": "2026-01-24T10:00:00Z"
  }'
```

**Step 2: Log Height**
```bash
curl -X POST http://localhost:3001/api/patients/{patientId}/measures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "measure_definition_id": "{height_measure_id}",
    "numeric_value": 1.75,
    "measured_at": "2026-01-24T10:00:00Z"
  }'
```

**Step 3: Get Patient Measures**
```bash
curl "http://localhost:3001/api/patients/{patientId}/measures?start_date=2026-01-24&end_date=2026-01-24" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "measure_definition_id": "{weight_id}",
      "numeric_value": 70,
      "measured_at": "2026-01-24T10:00:00Z",
      "measureDefinition": {
        "name": "weight",
        "measure_type": "numeric"
      }
    },
    {
      "measure_definition_id": "{height_id}",
      "numeric_value": 1.75,
      "measured_at": "2026-01-24T10:00:00Z",
      "measureDefinition": {
        "name": "height",
        "measure_type": "numeric"
      }
    },
    {
      "measure_definition_id": "{bmi_id}",
      "numeric_value": 22.86,
      "measured_at": "2026-01-24T10:00:00Z",
      "measureDefinition": {
        "name": "bmi",
        "measure_type": "calculated"
      }
    }
  ]
}
```

**Verification:**
- ✅ BMI measure automatically created
- ✅ BMI value correct: 22.86
- ✅ BMI timestamp matches weight/height
- ✅ measure_type is "calculated"

---

### API Test 6: Recalculate Patient Measures

**Endpoint:** `POST /api/patient-measures/:patientId/recalculate`

```bash
curl -X POST http://localhost:3001/api/patient-measures/{patientId}/recalculate \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "count": 5,
    "calculated": [
      {
        "measure_name": "bmi",
        "value": 22.86,
        "measured_at": "2026-01-24T10:00:00Z"
      }
      // ... more calculated measures
    ]
  }
}
```

---

### API Test 7: Bulk Recalculate Measure Across All Patients

**Endpoint:** `POST /api/measures/:id/recalculate-all`

```bash
curl -X POST http://localhost:3001/api/measures/{bmi_measure_id}/recalculate-all \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "patientsAffected": 15,
    "valuesCalculated": 47
  }
}
```

**Verification:**
- ✅ Response indicates patients affected
- ✅ Response shows total values calculated
- ✅ Check console logs for calculation messages

---

## Frontend Component Testing

### Component Test 1: FormulaValidator

**Manual Test:**
1. Navigate to Create Measure Definition
2. Select Measure Type: Calculated
3. Enter various formulas and observe validation

**Test Cases:**

| Formula | Expected Result |
|---------|----------------|
| `{weight} / {height}` | ✅ Valid, dependencies: weight, height |
| `{weight / {height}` | ❌ Unbalanced braces |
| `{weight} + {height` | ❌ Unbalanced braces |
| `{current:weight}` | ✅ Valid, dependencies: current:weight |
| `{invalid-name}` | ❌ Invalid variable name |
| ` ` (empty) | No validation shown |
| `sqrt({weight})` | ✅ Valid, dependencies: weight |

**Verification:**
- ✅ Validation appears after 500ms (debounced)
- ✅ Spinner shows during validation
- ✅ Success alert shows checkmark ✓
- ✅ Error alert shows ✗ with error message
- ✅ Dependencies list shows correctly

---

### Component Test 2: FormulaPreviewModal

**Manual Test:**
1. Create calculated measure
2. Enter formula: `{weight} / ({height} * {height})`
3. Click "🔍 Preview Calculation"
4. Enter values and test

**Test Cases:**

| Weight | Height | Expected Result |
|--------|--------|----------------|
| 70 | 1.75 | 22.86 |
| 80 | 1.80 | 24.69 |
| 0 | 1.75 | 0 |
| 70 | 0 | Error: Division by zero |
| (blank) | 1.75 | Button disabled until all filled |

**Verification:**
- ✅ Modal opens when button clicked
- ✅ Input fields for each dependency
- ✅ Calculate button disabled until all values entered
- ✅ Result displayed correctly
- ✅ Error messages shown for invalid calculations
- ✅ Modal closes on "Close" button

---

### Component Test 3: FormulaTemplatesModal

**Manual Test:**
1. Create calculated measure
2. Click "📋 Templates" button

**Verification:**
- ✅ Modal opens
- ✅ Templates grouped by category
- ✅ Each template shows: name, description, formula, dependencies, unit
- ✅ Templates selectable (highlights on click)
- ✅ Apply button enabled when template selected
- ✅ Apply button disabled when nothing selected
- ✅ Clicking Apply populates formula field
- ✅ Modal closes after applying

**Test Applying Templates:**
1. Select BMI template
2. Click Apply
3. Verify formula field populated: `{weight} / ({height} * {height})`
4. Verify unit field populated: `kg/m²`

---

### Component Test 4: MeasureDefinitionModal - Formula Editor

**Manual Test:**
1. Navigate to Measures page
2. Click Create Measure Definition
3. Select Measure Type: Calculated

**Verification:**
- ✅ Formula Configuration card appears
- ✅ Formula textarea with monospace font
- ✅ Templates button visible
- ✅ Help text shows syntax examples
- ✅ FormulaValidator component renders below textarea
- ✅ Dependencies badge appears when formula valid
- ✅ Preview button appears when dependencies detected
- ✅ Formula field has validation error if empty on submit

**Test Formula Changes:**
1. Type formula: `{weight}`
2. Observe dependencies: `weight`
3. Add to formula: ` / {height}`
4. Observe dependencies update: `weight, height`
5. Type invalid syntax: `{weight / height`
6. Observe validation error

---

### Component Test 5: PatientMeasuresTable - Calculated Badge

**Manual Test:**
1. Navigate to patient with calculated measures
2. View measures table

**Verification:**
- ✅ Calculated measures have "🧮 Calculated" badge
- ✅ Badge has info (blue) color
- ✅ Badge has tooltip: "Auto-calculated value"
- ✅ No edit button on calculated measure rows
- ✅ Delete button still present (admin only)
- ✅ Calculated measures clearly distinguishable from manual ones

**Test Edit Prevention:**
1. Click on a calculated measure row (if edit button somehow visible)
2. Verify alert: "Calculated measures cannot be edited. Update the source measures instead."

---

## Integration Testing

### Integration Test 1: End-to-End BMI Calculation

**Complete Workflow:**
1. **Setup Phase**
   - Login as admin
   - Create weight measure (if not exists)
   - Create height measure (if not exists)
   - Create BMI calculated measure

2. **Data Entry Phase**
   - Navigate to patient
   - Log weight: 70 kg
   - Log height: 1.75 m
   - Both at same timestamp

3. **Verification Phase**
   - Refresh patient measures
   - Verify BMI auto-calculated: 22.86
   - Verify BMI has calculated badge
   - Verify BMI timestamp matches

4. **Update Phase**
   - Edit weight to 80 kg
   - Refresh patient measures
   - Verify BMI recalculated: 26.12

5. **Delete Phase**
   - Delete weight measure
   - Refresh patient measures
   - Verify BMI still exists (not auto-deleted)
   - Note: BMI becomes stale but preserved

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Calculations accurate at each step
- ✅ Auto-recalculation works on update

---

### Integration Test 2: Time-Series Calculation Flow

**Complete Workflow:**
1. **Setup**
   - Create weight measure
   - Create weight_change calculated measure: `{current:weight} - {previous:weight}`

2. **Sequential Data Entry**
   - Log weight 1: 70 kg @ 8:00 AM
   - Log weight 2: 72 kg @ 10:00 AM
   - Log weight 3: 71 kg @ 12:00 PM

3. **Verification**
   - Check weight_change at 10:00 AM = 2 kg (72-70)
   - Check weight_change at 12:00 PM = -1 kg (71-72)
   - Verify no weight_change at 8:00 AM (no previous)

**Expected Results:**
- ✅ Time-series modifiers work correctly
- ✅ Previous value correctly identified
- ✅ Calculations accurate

---

### Integration Test 3: Cascading Calculations

**Complete Workflow:**
1. **Setup Measures**
   - weight (numeric)
   - height (numeric)
   - bmi (calculated: `{weight} / ({height} * {height})`)
   - bmi_doubled (calculated: `{bmi} * 2`)

2. **Log Data**
   - Log weight: 70 kg
   - Log height: 1.75 m

3. **Verification**
   - Check BMI calculated: 22.86
   - Check BMI_doubled calculated: 45.72
   - Verify both created (topological sort)

4. **Update Test**
   - Change weight to 80 kg
   - Verify BMI recalculates: 26.12
   - Verify BMI_doubled recalculates: 52.24

**Expected Results:**
- ✅ Dependent measures calculate in correct order
- ✅ Cascading updates work on change

---

### Integration Test 4: Formula Change Bulk Recalculation

**Workflow:**
1. **Setup**
   - Create BMI measure
   - Log weight/height for 3 different patients
   - Verify BMI calculated for all

2. **Change Formula**
   - Edit BMI measure
   - Change formula to: `({weight} + {height}) * 10` (intentionally different)
   - Save

3. **Verification**
   - Check console for recalculation logs
   - Verify all patients' BMI values updated
   - Verify last_formula_change timestamp updated

4. **Revert**
   - Change formula back to correct: `{weight} / ({height} * {height})`
   - Save
   - Verify all BMI values corrected

**Expected Results:**
- ✅ Bulk recalculation triggered on formula change
- ✅ All historical values updated
- ✅ Formula change timestamp tracked

---

## Edge Cases & Error Handling

### Edge Case 1: Missing Dependencies

**Scenario:** Create calculated measure but dependencies don't exist

**Test:**
1. Try to create BMI measure when weight/height measures don't exist
2. Formula: `{weight} / ({height} * {height})`

**Expected Result:**
- ✅ Validation error: "Measure not found: weight" (or height)
- ✅ Cannot save measure until dependencies exist

---

### Edge Case 2: Partial Dependencies

**Scenario:** Patient has only some dependency values

**Test:**
1. BMI measure exists
2. Log only weight (no height) for patient
3. Check for BMI calculation

**Expected Result:**
- ✅ No BMI value created (missing dependencies)
- ✅ Console log: "Missing dependencies for bmi, skipping calculation"

---

### Edge Case 3: Null/Zero Values

**Test Cases:**

| Weight | Height | Expected BMI |
|--------|--------|-------------|
| 0 | 1.75 | 0 |
| 70 | 0 | Error (division by zero) |
| null | 1.75 | No calculation |
| 70 | null | No calculation |

**Expected Results:**
- ✅ Division by zero handled gracefully
- ✅ Null values skip calculation
- ✅ Zero weight allowed (result 0)

---

### Edge Case 4: Same Timestamp, Multiple Values

**Scenario:** Multiple weight measurements at exact same timestamp

**Test:**
1. Log weight: 70 kg @ 10:00:00.000
2. Log weight: 72 kg @ 10:00:00.000 (same timestamp)
3. Log height: 1.75 m @ 10:00:00.000

**Expected Result:**
- ✅ BMI calculated using latest weight (created_at DESC)
- ✅ No duplicate BMI values at same timestamp

---

### Edge Case 5: Very Large/Small Numbers

**Test Cases:**

| Weight | Height | Notes |
|--------|--------|-------|
| 0.001 | 0.001 | Very small values |
| 999 | 2.5 | Very large weight |
| 70 | 0.01 | Very small height → very large BMI |

**Expected Results:**
- ✅ Calculations handle extreme values
- ✅ Decimal places respected
- ✅ No overflow errors

---

### Edge Case 6: Special Characters in Formula

**Test formulas:**
- `{weight_in_kg} / {height}`
- `{blood_pressure_systolic} + {blood_pressure_diastolic}`
- `{test-measure}` (should fail - hyphen not allowed)

**Expected Results:**
- ✅ Underscores allowed in measure names
- ✅ Hyphens rejected
- ✅ Spaces rejected

---

### Edge Case 7: Circular Dependencies

**Already tested in Scenario 10, but verify:**
- ✅ Direct circular dependency rejected
- ✅ Indirect circular dependency (A→B→C→A) rejected
- ✅ Clear error message with cycle path

---

### Edge Case 8: Deleted Dependencies

**Scenario:** Measure dependency is deleted (soft delete)

**Test:**
1. Create BMI measure (depends on weight, height)
2. Soft delete weight measure
3. Try to log height for patient
4. Check if BMI calculates

**Expected Result:**
- ✅ BMI calculation skipped (dependency deleted)
- ✅ No errors thrown
- ✅ Console log warning

---

### Edge Case 9: Time-Series with Insufficient History

**Scenario:** Use {previous:weight} when only one weight exists

**Test:**
1. Weight_change measure exists
2. Log first weight (no previous)
3. Check for weight_change calculation

**Expected Result:**
- ✅ No weight_change created (no previous value)
- ✅ Log message: "Missing dependencies, skipping calculation"

---

### Edge Case 10: Complex Time-Series Combinations

**Test formula:** `{current:weight} - {avg30:weight}`

**Test:**
1. Log weights over 30 days
2. Check calculation uses rolling average

**Expected Result:**
- ✅ avg30 calculated correctly (30-day average)
- ✅ Delta from average accurate

---

## Performance Testing

### Performance Test 1: Bulk Recalculation Speed

**Objective:** Measure time to recalculate across many patients

**Setup:**
1. Create 100 patients with weight/height data
2. BMI measure exists for all

**Test:**
1. Change BMI formula
2. Trigger bulk recalculation
3. Measure time

**Expected Results:**
- ✅ Recalculation completes in < 10 seconds for 100 patients
- ✅ No errors during bulk operation
- ✅ Console shows progress

**Monitor:**
- Database query count
- Memory usage
- CPU usage

---

### Performance Test 2: Cascading Calculation Performance

**Objective:** Test performance with deep dependency chains

**Setup:**
- Create chain: A → B → C → D → E (5 levels)
- 50 patients with data

**Test:**
1. Log measure A for all patients
2. Measure time for cascade

**Expected Results:**
- ✅ All 5 levels calculate correctly
- ✅ Completes in < 5 seconds
- ✅ Topological sort efficient

---

### Performance Test 3: Real-Time Validation Performance

**Objective:** Ensure validation doesn't lag UI

**Test:**
1. Type long formula in editor
2. Observe validation delay

**Expected Results:**
- ✅ 500ms debounce working
- ✅ No UI freezing
- ✅ Validation completes quickly (<100ms)

---

### Performance Test 4: Large Patient Measures Table

**Objective:** Test UI performance with many measures

**Setup:**
- Patient with 500+ measure entries
- Multiple calculated measures

**Test:**
1. Load patient measures page
2. Scroll through table
3. Filter measures

**Expected Results:**
- ✅ Page loads in < 2 seconds
- ✅ Pagination works smoothly
- ✅ Calculated badges render quickly

---

## Test Data Setup

### SQL Scripts for Test Data

**Create Test Measures:**
```sql
-- Weight measure
INSERT INTO measure_definitions (id, name, display_name, category, measure_type, unit, min_value, max_value, decimal_places, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'weight', 'Weight', 'anthropometric', 'numeric', 'kg', 0, 500, 1, 1);

-- Height measure
INSERT INTO measure_definitions (id, name, display_name, category, measure_type, unit, min_value, max_value, decimal_places, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440002', 'height', 'Height', 'anthropometric', 'numeric', 'm', 0, 3, 2, 1);

-- BMI calculated measure
INSERT INTO measure_definitions (id, name, display_name, category, measure_type, unit, decimal_places, formula, dependencies, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'bmi',
  'Body Mass Index (BMI)',
  'anthropometric',
  'calculated',
  'kg/m²',
  2,
  '{weight} / ({height} * {height})',
  '["weight", "height"]',
  1
);
```

**Create Test Patient Data:**
```sql
-- Log weight and height for test patient
INSERT INTO patient_measures (id, patient_id, measure_definition_id, numeric_value, measured_at, recorded_by)
VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'patient-uuid-here', '550e8400-e29b-41d4-a716-446655440001', 70, '2026-01-24 10:00:00', 'admin-user-id'),
  ('660e8400-e29b-41d4-a716-446655440002', 'patient-uuid-here', '550e8400-e29b-41d4-a716-446655440002', 1.75, '2026-01-24 10:00:00', 'admin-user-id');
```

---

## Acceptance Criteria Verification

### ✅ Acceptance Criterion 1: Formula Creation

**Criterion:** Admins can create calculated measure definitions with formulas

**Tests:**
- ✅ Scenario 1 (Create BMI)
- ✅ Scenario 2 (Create Weight Change)
- ✅ API Test 4 (Create via API)

**Verification:**
- ✅ UI provides formula editor
- ✅ Templates available
- ✅ Real-time validation works
- ✅ Formula saved to database

---

### ✅ Acceptance Criterion 2: Auto-Recalculation

**Criterion:** Calculated measures automatically update when dependencies change

**Tests:**
- ✅ Scenario 3 (Auto-calculation)
- ✅ Integration Test 1 (End-to-end)
- ✅ API Test 5 (Log and trigger)

**Verification:**
- ✅ BMI calculated when weight/height logged
- ✅ BMI recalculated when weight updated
- ✅ Correct timestamp on calculated values

---

### ✅ Acceptance Criterion 3: Time-Series Support

**Criterion:** Formulas support time-series modifiers (current, previous, delta, avgN)

**Tests:**
- ✅ Scenario 4 (Weight change)
- ✅ Integration Test 2 (Time-series flow)
- ✅ API Test 1 (Validate time-series)

**Verification:**
- ✅ {current:measure} works
- ✅ {previous:measure} works
- ✅ {delta:measure} works
- ✅ {avg30:measure} works

---

### ✅ Acceptance Criterion 4: Validation

**Criterion:** Formula syntax validated before saving

**Tests:**
- ✅ Scenario 5 (Validation tests)
- ✅ API Test 1 (Validate API)
- ✅ Component Test 1 (FormulaValidator)

**Verification:**
- ✅ Real-time validation in UI
- ✅ Server-side validation on save
- ✅ Clear error messages
- ✅ Invalid formulas rejected

---

### ✅ Acceptance Criterion 5: Dependency Detection

**Criterion:** System automatically detects and tracks dependencies

**Tests:**
- ✅ Scenario 1 (Dependencies badge)
- ✅ API Test 1 (Dependencies in response)
- ✅ Scenario 10 (Circular detection)

**Verification:**
- ✅ Dependencies auto-extracted from formula
- ✅ Dependencies stored in database
- ✅ Circular dependencies prevented
- ✅ Dependencies validated to exist

---

### ✅ Acceptance Criterion 6: Read-Only Display

**Criterion:** Calculated measures shown as read-only in patient records

**Tests:**
- ✅ Scenario 8 (Edit prevention)
- ✅ Component Test 5 (Calculated badge)

**Verification:**
- ✅ Calculated badge displayed
- ✅ Edit button hidden/disabled
- ✅ Alert shown if edit attempted

---

### ✅ Acceptance Criterion 7: Bulk Recalculation

**Criterion:** Admins can recalculate when formula changes

**Tests:**
- ✅ Scenario 9 (Bulk recalculation)
- ✅ Integration Test 4 (Formula change)
- ✅ API Test 7 (Bulk recalculate API)

**Verification:**
- ✅ Recalculation triggered on formula change
- ✅ All historical values updated
- ✅ last_formula_change timestamp updated

---

### ✅ Acceptance Criterion 8: Template Library

**Criterion:** Pre-built templates available for common calculations

**Tests:**
- ✅ Scenario 6 (Template testing)
- ✅ API Test 3 (Get templates)
- ✅ Component Test 3 (Templates modal)

**Verification:**
- ✅ At least 10 templates available
- ✅ Templates cover common use cases (BMI, BSA, MAP, etc.)
- ✅ Templates apply correctly
- ✅ Template formulas accurate

---

## Test Execution Checklist

### Pre-Testing Checklist

- [ ] Backend server running without errors
- [ ] Frontend server running without errors
- [ ] Database migration applied successfully
- [ ] Admin user credentials available
- [ ] Test patient(s) created
- [ ] API client ready (Postman/curl)

### Manual Testing Checklist

- [ ] Scenario 1: Create BMI measure
- [ ] Scenario 2: Create Weight Change measure
- [ ] Scenario 3: Test auto-recalculation
- [ ] Scenario 4: Test time-series calculation
- [ ] Scenario 5: Test formula validation
- [ ] Scenario 6: Test all templates
- [ ] Scenario 7: Test cascading calculations
- [ ] Scenario 8: Test edit prevention
- [ ] Scenario 9: Test bulk recalculation
- [ ] Scenario 10: Test circular dependency prevention

### API Testing Checklist

- [ ] API Test 1: Validate formula (valid, invalid, time-series)
- [ ] API Test 2: Preview formula
- [ ] API Test 3: Get templates
- [ ] API Test 4: Create calculated measure
- [ ] API Test 5: Log measure and auto-recalculate
- [ ] API Test 6: Recalculate patient measures
- [ ] API Test 7: Bulk recalculate across all patients

### Component Testing Checklist

- [ ] Component Test 1: FormulaValidator
- [ ] Component Test 2: FormulaPreviewModal
- [ ] Component Test 3: FormulaTemplatesModal
- [ ] Component Test 4: MeasureDefinitionModal formula editor
- [ ] Component Test 5: PatientMeasuresTable calculated badge

### Integration Testing Checklist

- [ ] Integration Test 1: End-to-end BMI calculation
- [ ] Integration Test 2: Time-series calculation flow
- [ ] Integration Test 3: Cascading calculations
- [ ] Integration Test 4: Formula change bulk recalculation

### Edge Cases Testing Checklist

- [ ] Edge Case 1: Missing dependencies
- [ ] Edge Case 2: Partial dependencies
- [ ] Edge Case 3: Null/zero values
- [ ] Edge Case 4: Same timestamp, multiple values
- [ ] Edge Case 5: Very large/small numbers
- [ ] Edge Case 6: Special characters
- [ ] Edge Case 7: Circular dependencies
- [ ] Edge Case 8: Deleted dependencies
- [ ] Edge Case 9: Insufficient history
- [ ] Edge Case 10: Complex time-series

### Performance Testing Checklist

- [ ] Performance Test 1: Bulk recalculation speed
- [ ] Performance Test 2: Cascading calculation performance
- [ ] Performance Test 3: Real-time validation performance
- [ ] Performance Test 4: Large measures table

### Acceptance Criteria Checklist

- [ ] AC1: Formula creation ✅
- [ ] AC2: Auto-recalculation ✅
- [ ] AC3: Time-series support ✅
- [ ] AC4: Validation ✅
- [ ] AC5: Dependency detection ✅
- [ ] AC6: Read-only display ✅
- [ ] AC7: Bulk recalculation ✅
- [ ] AC8: Template library ✅

---

## Bug Reporting Template

If you find a bug during testing, report using this format:

**Bug Report:**

```
Title: [Brief description]

Environment:
- Browser/OS:
- Backend version:
- Frontend version:

Steps to Reproduce:
1.
2.
3.

Expected Result:


Actual Result:


Severity: [Critical/High/Medium/Low]

Screenshots/Logs:
[Attach if applicable]

Additional Notes:

```

---

## Test Results Summary Template

After completing all tests, fill out this summary:

```
US-5.4.2 - Calculated Measures Test Results
Date: _____________
Tester: _____________

SUMMARY:
- Total Tests: ___
- Passed: ___
- Failed: ___
- Blocked: ___
- Skipped: ___

PASS RATE: ___%

CRITICAL ISSUES:
1.
2.

MEDIUM/LOW ISSUES:
1.
2.

RECOMMENDATIONS:
1.
2.

READY FOR PRODUCTION: [YES/NO]

NOTES:


```

---

## Conclusion

This test plan covers:
- ✅ 10 Manual testing scenarios
- ✅ 7 API endpoint tests
- ✅ 5 Component tests
- ✅ 4 Integration tests
- ✅ 10 Edge case tests
- ✅ 4 Performance tests
- ✅ 8 Acceptance criteria verifications

**Total: 48+ Test Cases**

Execute tests in order, document results, and report any issues using the bug template.

**Good luck with testing! 🧪**
