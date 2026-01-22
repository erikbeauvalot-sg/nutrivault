# i18n Remediation Plan - Sprint 1 Extension

**Date**: 2026-01-21
**Priority**: CRITICAL - Production Blocker
**Estimated Effort**: 8 hours (1 day)
**Assignee**: Development Team

---

## Executive Summary

Code review identified **6 critical i18n violations** that break the PRD requirement for French-first interface. All hardcoded user-facing strings must be translated using the i18n system before Sprint 1 can be considered complete.

**Impact**: French users currently see English text in dialogs, error messages, and UI labels.

---

## Part 1: Setup i18n Linting (1 hour)

### Task 1.1: Install ESLint Dependencies
```bash
cd frontend
npm install --save-dev eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-i18next @eslint/js
```

### Task 1.2: Create ESLint Configuration

Create `frontend/eslint.config.js`:

```javascript
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      i18next,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'i18next/no-literal-string': ['error', {
        markupOnly: true,
        ignoreAttribute: ['className', 'type', 'id', 'to', 'variant'],
      }],
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
];
```

### Task 1.3: Add NPM Scripts

Update `frontend/package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix"
  }
}
```

### Task 1.4: Test Linting
```bash
npm run lint
```

**Expected**: Should show all hardcoded strings as errors.

---

## Part 2: Fix Critical i18n Violations (5 hours)

### Issue #1: window.confirm() Dialogs (1 hour)

**Files to Fix**: 4 files
**Confidence**: 100
**Priority**: P0

#### 1.1 PatientsPage.jsx:74
**Current**:
```javascript
if (!window.confirm('Are you sure you want to delete this patient?')) {
  return;
}
```

**Fix**:
```javascript
if (!window.confirm(t('patients.confirmDelete'))) {
  return;
}
```

#### 1.2 BillingPage.jsx:129
**Current**:
```javascript
if (!window.confirm('Are you sure you want to delete this invoice?')) {
  return;
}
```

**Fix**:
```javascript
if (!window.confirm(t('billing.confirmDeleteInvoice'))) {
  return;
}
```

#### 1.3 EditVisitPage.jsx:306
**Current**:
```javascript
if (!window.confirm('Are you sure you want to delete this measurement?')) {
  return;
}
```

**Fix**:
```javascript
if (!window.confirm(t('visits.confirmDeleteMeasurement'))) {
  return;
}
```

#### 1.4 VisitsPage.jsx:104
**Current**:
```javascript
if (!window.confirm('Are you sure you want to delete this visit?')) return;
```

**Fix**:
```javascript
if (!window.confirm(t('visits.confirmDelete'))) return;
```

**Translation Keys to Add** (see Part 4):
- `patients.confirmDelete`
- `billing.confirmDeleteInvoice`
- `visits.confirmDeleteMeasurement`
- `visits.confirmDelete`

---

### Issue #2: Hardcoded Error Messages (2 hours)

**Files to Fix**: 5 files
**Confidence**: 95
**Priority**: P0

#### 2.1 PatientsPage.jsx:65, 83
**Current**:
```javascript
setError('Failed to load patients: ' + (err.response?.data?.error || err.message));
setError('Failed to delete patient: ' + (err.response?.data?.error || err.message));
```

**Fix**:
```javascript
setError(t('errors.failedToLoadPatients', {
  error: err.response?.data?.error || err.message
}));
setError(t('errors.failedToDeletePatient', {
  error: err.response?.data?.error || err.message
}));
```

#### 2.2 BillingPage.jsx:84, 100, 137
**Current**:
```javascript
setError('Failed to load invoice: ' + (err.response?.data?.error || err.message));
setError('Failed to load invoices: ' + (err.response?.data?.error || err.message));
setError('Failed to delete invoice: ' + (err.response?.data?.error || err.message));
```

**Fix**:
```javascript
setError(t('errors.failedToLoadInvoice', {
  error: err.response?.data?.error || err.message
}));
setError(t('errors.failedToLoadInvoices', {
  error: err.response?.data?.error || err.message
}));
setError(t('errors.failedToDeleteInvoice', {
  error: err.response?.data?.error || err.message
}));
```

#### 2.3 EditVisitPage.jsx:314
**Current**:
```javascript
setError(err.response?.data?.error || 'Failed to delete measurement');
```

**Fix**:
```javascript
setError(err.response?.data?.error || t('errors.failedToDeleteMeasurement'));
```

#### 2.4 VisitsPage.jsx:111
**Current**:
```javascript
alert(err.response?.data?.error || 'Failed to delete visit');
```

**Fix**:
```javascript
alert(err.response?.data?.error || t('errors.failedToDeleteVisit'));
```

**Translation Keys to Add** (see Part 4):
- `errors.failedToLoadPatients`
- `errors.failedToDeletePatient`
- `errors.failedToLoadInvoice`
- `errors.failedToLoadInvoices`
- `errors.failedToDeleteInvoice`
- `errors.failedToDeleteMeasurement`
- `errors.failedToDeleteVisit`

---

### Issue #3: Hardcoded Error Label (30 min)

**File**: PatientsPage.jsx:158
**Confidence**: 85
**Priority**: P0

**Current**:
```javascript
<strong>Error:</strong> {error}
```

**Fix**:
```javascript
<strong>{t('common.error')}:</strong> {error}
```

**Translation Key to Add**: `common.error`

---

### Issue #4: Audit All Pages for Missing i18n (1.5 hours)

Run comprehensive audit:
```bash
cd frontend/src
# Find all hardcoded strings in JSX
grep -r "window\.confirm\|alert(" pages/
grep -r ">\s*[A-Z][a-z].*</" pages/ | grep -v "t("
```

**Files to Audit**:
- [ ] CreatePatientPage.jsx
- [ ] EditPatientPage.jsx
- [ ] PatientDetailPage.jsx
- [ ] CreateVisitPage.jsx
- [ ] EditVisitPage.jsx
- [ ] VisitDetailPage.jsx
- [ ] InvoiceDetailPage.jsx
- [ ] ReportsPage.jsx
- [ ] DocumentsPage.jsx
- [ ] UsersPage.jsx

**Check for**:
- Alert/confirm dialogs
- Placeholder text without t()
- Button labels without t()
- Error messages
- Success messages
- Form validation messages

---

## Part 3: Backend Route Conflict Fix (30 min)

**File**: backend/src/routes/patients.js
**Confidence**: 90
**Priority**: P1

### Issue: Duplicate Routes

**Lines 341-346 vs 405-410**:
```javascript
// Line 341 - First registration
router.get('/tags', authenticate, requirePermission('patients.read'), patientTagController.getAllTags);

// Line 405 - Duplicate (UNREACHABLE)
router.get('/tags/all', authenticate, requirePermission('patients.read'), patientTagController.getAllTags);
```

**Fix**:
1. Remove lines 405-410 (duplicate route)
2. Verify route ordering: specific routes BEFORE parameterized routes

**Correct Order**:
```javascript
// Specific routes first
router.get('/tags', ...);           // BEFORE /:id
router.post('/tags', ...);          // BEFORE /:id
router.get('/:id/tags', ...);       // BEFORE /:id

// Parameterized routes last
router.get('/:id', ...);
router.put('/:id', ...);
router.delete('/:id', ...);
```

---

## Part 4: Add Translation Keys (1 hour)

### File: frontend/src/locales/fr.json

Add these keys:

```json
{
  "common": {
    "error": "Erreur",
    "success": "Succès",
    "confirm": "Confirmer",
    "cancel": "Annuler"
  },
  "patients": {
    "confirmDelete": "Êtes-vous sûr de vouloir supprimer ce patient ?",
    "deleteSuccess": "Patient supprimé avec succès",
    "deleteError": "Erreur lors de la suppression du patient"
  },
  "billing": {
    "confirmDeleteInvoice": "Êtes-vous sûr de vouloir supprimer cette facture ?",
    "deleteSuccess": "Facture supprimée avec succès",
    "deleteError": "Erreur lors de la suppression de la facture"
  },
  "visits": {
    "confirmDelete": "Êtes-vous sûr de vouloir supprimer cette visite ?",
    "confirmDeleteMeasurement": "Êtes-vous sûr de vouloir supprimer cette mesure ?",
    "deleteSuccess": "Visite supprimée avec succès",
    "deleteError": "Erreur lors de la suppression de la visite"
  },
  "errors": {
    "failedToLoadPatients": "Échec du chargement des patients : {{error}}",
    "failedToDeletePatient": "Échec de la suppression du patient : {{error}}",
    "failedToLoadInvoice": "Échec du chargement de la facture : {{error}}",
    "failedToLoadInvoices": "Échec du chargement des factures : {{error}}",
    "failedToDeleteInvoice": "Échec de la suppression de la facture : {{error}}",
    "failedToDeleteMeasurement": "Échec de la suppression de la mesure",
    "failedToDeleteVisit": "Échec de la suppression de la visite",
    "genericError": "Une erreur s'est produite : {{error}}"
  }
}
```

### File: frontend/src/locales/en.json

Add English equivalents:

```json
{
  "common": {
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm",
    "cancel": "Cancel"
  },
  "patients": {
    "confirmDelete": "Are you sure you want to delete this patient?",
    "deleteSuccess": "Patient deleted successfully",
    "deleteError": "Failed to delete patient"
  },
  "billing": {
    "confirmDeleteInvoice": "Are you sure you want to delete this invoice?",
    "deleteSuccess": "Invoice deleted successfully",
    "deleteError": "Failed to delete invoice"
  },
  "visits": {
    "confirmDelete": "Are you sure you want to delete this visit?",
    "confirmDeleteMeasurement": "Are you sure you want to delete this measurement?",
    "deleteSuccess": "Visit deleted successfully",
    "deleteError": "Failed to delete visit"
  },
  "errors": {
    "failedToLoadPatients": "Failed to load patients: {{error}}",
    "failedToDeletePatient": "Failed to delete patient: {{error}}",
    "failedToLoadInvoice": "Failed to load invoice: {{error}}",
    "failedToLoadInvoices": "Failed to load invoices: {{error}}",
    "failedToDeleteInvoice": "Failed to delete invoice: {{error}}",
    "failedToDeleteMeasurement": "Failed to delete measurement",
    "failedToDeleteVisit": "Failed to delete visit",
    "genericError": "An error occurred: {{error}}"
  }
}
```

---

## Part 5: Security Fix - LIKE Query Sanitization (30 min)

**File**: backend/src/services/patient.service.js:39-45
**Confidence**: 75
**Priority**: P2

**Current**:
```javascript
if (filters.search) {
  whereClause[Op.or] = [
    { first_name: { [Op.like]: `%${filters.search}%` } },
    { last_name: { [Op.like]: `%${filters.search}%` } },
    { email: { [Op.like]: `%${filters.search}%` } },
    { phone: { [Op.like]: `%${filters.search}%` } }
  ];
}
```

**Fix** - Escape LIKE wildcards:
```javascript
if (filters.search) {
  // Escape special LIKE characters
  const escapedSearch = filters.search
    .replace(/[%_]/g, '\\$&'); // Escape % and _

  whereClause[Op.or] = [
    { first_name: { [Op.like]: `%${escapedSearch}%` } },
    { last_name: { [Op.like]: `%${escapedSearch}%` } },
    { email: { [Op.like]: `%${escapedSearch}%` } },
    { phone: { [Op.like]: `%${escapedSearch}%` } }
  ];
}
```

**Alternative** - Use case-insensitive search without LIKE:
```javascript
if (filters.search) {
  whereClause[Op.or] = [
    sequelize.where(
      sequelize.fn('LOWER', sequelize.col('first_name')),
      { [Op.like]: `%${filters.search.toLowerCase()}%` }
    ),
    // ... repeat for other fields
  ];
}
```

---

## Testing Checklist

### i18n Testing
- [ ] Run `npm run lint` - should pass with 0 errors
- [ ] Test all confirmation dialogs in French
- [ ] Test all error messages in French
- [ ] Trigger errors and verify French messages appear
- [ ] Switch language to English, verify translations work
- [ ] Check browser console for missing translation warnings

### Backend Testing
- [ ] Test GET /api/patients/tags - should return tags
- [ ] Test GET /api/patients/tags/all - should not exist (removed)
- [ ] Test patient search with special characters (%, _)
- [ ] Test patient search with SQL injection attempts

### E2E Testing
- [ ] Delete patient - see French confirmation
- [ ] Delete invoice - see French confirmation
- [ ] Delete visit - see French confirmation
- [ ] Trigger network error - see French error message
- [ ] All flows work in both French and English

---

## Implementation Order

1. **Setup** (1 hour)
   - Install ESLint + i18n plugin
   - Configure linting
   - Add npm scripts

2. **Fix i18n Issues** (3 hours)
   - Add translation keys to fr.json and en.json
   - Fix window.confirm() calls (4 files)
   - Fix error messages (5 files)
   - Fix error label (1 file)

3. **Backend Fixes** (30 min)
   - Remove duplicate route
   - Add LIKE query sanitization

4. **Audit & Test** (2 hours)
   - Run full i18n audit on all pages
   - Fix any additional findings
   - Test all changes manually
   - Verify linting passes

5. **Documentation** (30 min)
   - Update AGENTS.md with linting instructions
   - Document i18n patterns for team

**Total**: 8 hours (1 day)

---

## Definition of Done

- [ ] ESLint with i18n plugin configured and running
- [ ] `npm run lint` passes with 0 errors
- [ ] All 6 critical i18n violations fixed
- [ ] Translation keys added to both fr.json and en.json
- [ ] Backend route conflict resolved
- [ ] LIKE query sanitization implemented
- [ ] All manual tests passing
- [ ] French interface 100% functional
- [ ] Code review completed
- [ ] Changes committed with proper messages

---

## Integration with Sprint 1

**Status**: Sprint 1 BLOCKED until remediation complete

**Updated Sprint 1 Deliverables**:
- [x] US-1.1, 1.2, 1.3: Authentication
- [x] US-2.1, 2.2, 2.3: Patient CRUD
- [x] US-4.1, 4.2: Dashboard
- [ ] **NEW**: i18n remediation (BLOCKING)
- [ ] **NEW**: Backend route fixes (BLOCKING)

**Sprint 1 Extended Timeline**:
- Original end: Feb 3, 2026
- Add: +1 day for remediation
- **New end: Feb 4, 2026**

---

## Risk Mitigation

**Risk**: Team unfamiliar with i18n patterns
**Mitigation**: This plan includes specific code examples for every fix

**Risk**: Missing translation keys cause runtime errors
**Mitigation**: ESLint will catch all future violations in CI/CD

**Risk**: French translations are incorrect
**Mitigation**: Have native French speaker review translations before merging

---

## Future Prevention

### Git Pre-commit Hook
Add to `.husky/pre-commit`:
```bash
#!/bin/sh
cd frontend && npm run lint
```

### CI/CD Integration
Add to GitHub Actions:
```yaml
- name: Lint frontend
  run: |
    cd frontend
    npm run lint
```

### Team Guidelines
Update AGENTS.md:
```markdown
## i18n Requirements
- ALL user-facing strings MUST use t() function
- Run `npm run lint` before committing
- Test in both French and English
- Never use window.confirm() or alert() with hardcoded strings
```

---

## Success Metrics

- **0** hardcoded user-facing strings in codebase
- **100%** French translation coverage
- **0** ESLint i18n errors
- **0** missing translation warnings in console
- **Passing** manual French interface test

---

**Ready to implement?** This plan is now ready to be integrated into Sprint 1 as high-priority remediation work.
