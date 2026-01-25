# User Story: US-5.5.6 - Email Template Multi-Language Support

**Sprint:** Sprint 5 (or Future Sprint)
**Story:** US-5.5.6
**Priority:** Medium
**Estimated Complexity:** Medium
**Depends On:** US-5.5.2 (Email Templates)

---

## User Story

**As a** dietitian administrator
**I want** email templates to support multiple languages
**So that** I can send emails to patients in their preferred language automatically

---

## Business Value

- **Patient Experience**: Patients receive emails in their preferred language, improving engagement and comprehension
- **Internationalization**: Support clinics serving multilingual patient populations
- **Automation**: No manual language switching required - system automatically selects correct template based on patient language preference
- **Consistency**: Maintain professional, localized communication across all supported languages
- **Compliance**: Meet regulatory requirements for multilingual patient communication in certain regions

---

## Acceptance Criteria

### Functional Requirements

1. ✅ **Translation Storage**
   - Email template content (subject, body_html, body_text) can be translated into multiple languages
   - Translations are stored separately from base templates
   - Each translation is linked to a specific email template and language code
   - Support standard language codes: en, fr, es, nl, de, it, pt, en-US, fr-CA, etc.

2. ✅ **Translation Management UI**
   - Admin can add/edit/delete translations for any template
   - Translation modal accessible from Email Templates page
   - Show list of available translations for each template (language flags/badges)
   - Validation ensures all required fields (subject, body_html) are translated
   - Copy from base template as starting point for new translations

3. ✅ **Automatic Language Selection**
   - When sending email, system automatically selects template in patient's preferred language
   - Falls back to default language (configurable, defaults to 'en' or 'fr') if translation not available
   - System uses `patient.language_preference` field to determine language
   - Log which language was used in `email_logs` table

4. ✅ **Preview Translations**
   - Preview modal supports language selection dropdown
   - Sample data rendered with selected language's template
   - Show warning if translation incomplete

5. ✅ **Variable Consistency**
   - Variables (`{{patient_name}}`, etc.) remain consistent across all language versions
   - Variable validation works for all translations
   - Available variables list is language-agnostic

### Non-Functional Requirements

6. ✅ **Performance**
   - Translation lookup adds <50ms to email send time
   - Efficient queries using indexed language_code field

7. ✅ **Data Integrity**
   - Cannot delete base template if translations exist
   - Soft delete translations when base template is soft deleted
   - Audit trail for all translation changes

---

## Technical Approach

### Use Existing MeasureTranslation Pattern

The codebase already has a proven translation system in `MeasureTranslation` model. We'll leverage the same pattern:

**Advantages:**
- ✅ Consistent architecture across the application
- ✅ Reusable service methods for CRUD operations
- ✅ Proven validation and indexing strategy
- ✅ Already supports polymorphic entity_type ENUM (easy to extend)
- ✅ Audit service integration pattern established

**Approach:**
1. **Extend existing `measure_translations` table** by adding `'email_template'` to `entity_type` ENUM
2. **Reuse `MeasureTranslation` model** with updated validation for email template fields
3. **Create `emailTemplateTranslation.service.js`** following same pattern as `measureTranslation.service.js`
4. **Update email sending logic** to query translations and fallback to base language

---

## Database Schema Changes

### Option A: Extend Existing Table (RECOMMENDED)

Reuse the existing `measure_translations` table with polymorphic pattern:

```sql
-- Migration: Extend measure_translations to support email templates
ALTER TABLE measure_translations
  MODIFY COLUMN entity_type ENUM('measure_definition', 'email_template');
```

**Schema:**
```
measure_translations (EXTENDED)
├── id (UUID, PK)
├── entity_type (ENUM: 'measure_definition', 'email_template')
├── entity_id (UUID, FK to email_templates.id when entity_type='email_template')
├── language_code (VARCHAR(5): 'en', 'fr', 'es', 'fr-CA', etc.)
├── field_name (VARCHAR(50): 'subject', 'body_html', 'body_text')
├── translated_value (TEXT)
├── created_at
├── updated_at

INDEXES:
- UNIQUE (entity_id, language_code, field_name)
- INDEX (entity_type, entity_id)
- INDEX (language_code)
- INDEX (entity_id, language_code)
```

**Valid field_name values for email_template:**
- `subject` - Email subject line
- `body_html` - HTML email body
- `body_text` - Plain text email body

**Pros:**
- Reuses existing proven infrastructure
- Minimal code changes to model
- Consistent query patterns
- Future-proof for other translatable entities (appointments, documents, etc.)

**Cons:**
- Shared table across multiple entity types (negligible performance impact with proper indexes)

### Option B: Separate Table (NOT RECOMMENDED)

Create new `email_template_translations` table with identical structure.

**Cons:**
- Code duplication
- More models to maintain
- Inconsistent with existing pattern

---

## Implementation Plan

### Phase 1: Backend - Translation Infrastructure (Priority 0)

**Estimated Time:** 1 day

#### 1.1 Database Migration
```javascript
// migrations/20260126000002-extend-translations-for-email-templates.js
// - Extend entity_type ENUM to include 'email_template'
// - Add comment documenting valid field_names per entity_type
```

#### 1.2 Update MeasureTranslation Model
```javascript
// models/MeasureTranslation.js
// - Update entity_type ENUM validation
// - Update field_name validation to support email template fields
// - Add getValidFieldNames(entityType) static method
```

#### 1.3 Create Email Template Translation Service
```javascript
// backend/src/services/emailTemplateTranslation.service.js
// - getTranslations(templateId, languageCode)
// - getTranslation(templateId, languageCode, fieldName)
// - setTranslation(user, templateId, languageCode, fieldName, value, requestMetadata)
// - setAllTranslations(user, templateId, languageCode, translations, requestMetadata)
// - deleteTranslations(templateId, languageCode)
// - getAllTranslationsForTemplate(templateId) - returns all languages
// - getAvailableLanguages(templateId) - returns array of language codes
```

#### 1.4 Update Email Sending Logic
```javascript
// backend/src/services/email.service.js
// - Modify sendEmailFromTemplate() to accept languageCode parameter
// - Query translations for template in patient's language
// - Fallback logic: patient language → default language → base template
// - Log selected language in email_logs
```

#### 1.5 Add Translation Endpoints
```javascript
// backend/src/controllers/emailTemplateController.js
// - GET    /api/email-templates/:id/translations
// - GET    /api/email-templates/:id/translations/:languageCode
// - POST   /api/email-templates/:id/translations/:languageCode
// - PUT    /api/email-templates/:id/translations/:languageCode
// - DELETE /api/email-templates/:id/translations/:languageCode

// backend/src/routes/emailTemplates.js
// - Register new routes with ADMIN permission
```

**Verification:**
```bash
# Create French translation
curl -X POST http://localhost:3001/api/email-templates/{id}/translations/fr \
  -H "Content-Type: application/json" \
  -d '{"subject":"Facture {{invoice_number}}","body_html":"<p>Bonjour...</p>","body_text":"Bonjour..."}'

# Get translation
curl http://localhost:3001/api/email-templates/{id}/translations/fr

# Test email send with French patient
# Should automatically use French translation
```

---

### Phase 2: Frontend - Translation Management UI (Priority 0)

**Estimated Time:** 1 day

#### 2.1 Update Email Template Service
```javascript
// frontend/src/services/emailTemplateService.js
// - getTranslations(templateId)
// - getTranslation(templateId, languageCode)
// - saveTranslation(templateId, languageCode, data)
// - deleteTranslation(templateId, languageCode)
```

#### 2.2 Create Translation Management Modal
```javascript
// frontend/src/components/EmailTemplateTranslationModal.jsx
// - Language selector (dropdown with flag icons)
// - Form fields: subject, body_html, body_text
// - "Copy from base" button to copy default language as starting point
// - "Copy from another language" dropdown
// - Variable badge picker (same as base template editor)
// - Save/Cancel actions
// - Show validation errors
```

#### 2.3 Update Email Templates Page
```javascript
// frontend/src/pages/EmailTemplatesPage.jsx
// - Add "Translations" button to template card
// - Show language badges for available translations
// - Translation count badge (e.g., "3 languages")
```

#### 2.4 Update Preview Modal
```javascript
// frontend/src/components/EmailPreviewModal.jsx
// - Add language selector dropdown
// - Preview template in selected language
// - Show fallback warning if translation incomplete
// - Pass languageCode to preview API
```

#### 2.5 Add Language Configuration
```javascript
// frontend/src/utils/languages.js
// - SUPPORTED_LANGUAGES constant with language codes, names, and flag emojis
// - Default language configuration
// - Language display utilities

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];
```

**Verification:**
- Navigate to Email Templates page
- Click "Translations" button on a template
- Add French translation
- Preview in French
- Send test email to French-speaking patient
- Verify French template used in email_logs

---

### Phase 3: Integration & Testing (Priority 1)

**Estimated Time:** 0.5 day

#### 3.1 Update Existing Email Functions
```javascript
// backend/src/services/billing.service.js
// - Pass patient.language_preference to sendEmailFromTemplate()

// backend/src/services/document.service.js
// - Pass patient.language_preference to sendEmailFromTemplate()
```

#### 3.2 Update Email Logs Schema
```javascript
// migrations/20260126000003-add-language-to-email-logs.js
// - Add language_code column to email_logs
// - Add INDEX on language_code
```

#### 3.3 Seed Default Translations
```javascript
// seeders/20260126000002-default-email-template-translations.js
// - Add French translations for 3 system templates
// - Optional: Add other language translations
```

#### 3.4 Testing
- Unit tests: Translation service CRUD
- Unit tests: Language fallback logic
- Integration tests: Email send with multiple languages
- E2E test: Create translation → Send email → Verify correct language used

---

## API Endpoints Summary

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/email-templates/:id/translations` | `users.read` | Get all translations for template |
| GET | `/api/email-templates/:id/translations/:lang` | `users.read` | Get translation for specific language |
| POST | `/api/email-templates/:id/translations/:lang` | ADMIN | Create translation |
| PUT | `/api/email-templates/:id/translations/:lang` | ADMIN | Update translation |
| DELETE | `/api/email-templates/:id/translations/:lang` | ADMIN | Delete translation |
| POST | `/api/email-templates/:id/preview?lang=:lang` | `users.read` | Preview template in language |

---

## Email Sending Logic Flow

```
1. User triggers email send (e.g., invoice created)
   ↓
2. Get patient's language_preference (e.g., 'fr')
   ↓
3. Query email template by slug
   ↓
4. Check for translation in patient's language
   ↓
   ├─ Translation exists (fr) → Use translated subject/body_html/body_text
   │                           → Log language='fr' in email_logs
   ├─ Translation missing (fr) → Fallback to default language (e.g., 'en')
   │                           → Check for 'en' translation
   │                           → If exists, use it; else use base template
   │                           → Log language='en' or language=null in email_logs
   └─ Patient has no language preference → Use default language or base template
```

---

## Variables Handling Across Languages

Variables remain **language-agnostic**:
- `{{patient_name}}` renders correctly regardless of language
- Subject and body are translated, but variables stay the same
- Example:

**English (base):**
```
Subject: Invoice {{invoice_number}} - {{patient_name}}
Body: Dear {{patient_name}}, your invoice for {{service_description}} is {{amount_total}}...
```

**French (translation):**
```
Subject: Facture {{invoice_number}} - {{patient_name}}
Body: Cher(e) {{patient_name}}, votre facture pour {{service_description}} est de {{amount_total}}...
```

**German (translation):**
```
Subject: Rechnung {{invoice_number}} - {{patient_name}}
Body: Sehr geehrte(r) {{patient_name}}, Ihre Rechnung für {{service_description}} beträgt {{amount_total}}...
```

---

## Configuration

### Default Language

Add to backend config or environment variable:

```javascript
// backend/src/config/config.js
module.exports = {
  email: {
    defaultLanguage: process.env.DEFAULT_EMAIL_LANGUAGE || 'en',
    fallbackLanguage: process.env.FALLBACK_EMAIL_LANGUAGE || 'en'
  }
};
```

### Supported Languages

Define in shared config or database table (future enhancement):

```javascript
// Hardcoded initially in frontend and backend
const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'nl', 'de', 'it', 'pt'];

// Future: Store in database for dynamic configuration
```

---

## Verification Checklist

### Backend
- [ ] Migration extends measure_translations entity_type ENUM
- [ ] MeasureTranslation model validates email_template fields
- [ ] Translation service CRUD operations work
- [ ] GET /api/email-templates/:id/translations returns all translations
- [ ] POST /api/email-templates/:id/translations/:lang creates translation
- [ ] Email sending selects correct language based on patient preference
- [ ] Fallback logic works when translation missing
- [ ] email_logs records language_code used

### Frontend
- [ ] Translations button appears on template cards
- [ ] Translation modal opens and loads existing translations
- [ ] Can add new translation in different language
- [ ] Variable picker works in translation editor
- [ ] "Copy from base" button populates form
- [ ] Preview modal supports language selection
- [ ] Language badges display on template cards
- [ ] Validation errors display correctly

### Integration
- [ ] Send invoice email to French patient → Uses French template
- [ ] Send invoice email to patient with no language → Uses default language
- [ ] Send email when translation incomplete → Falls back correctly
- [ ] All existing email sends still work (backward compatible)
- [ ] Audit logs track translation changes

### Edge Cases
- [ ] Delete base template → Also deletes translations
- [ ] Change template category → Translation still valid
- [ ] Missing translation for patient language → Fallback works
- [ ] Incomplete translation (only subject translated) → Uses base for body
- [ ] Invalid language code → Returns error

---

## Migration Path

### For Existing Templates

1. All existing templates remain as base language (English or French)
2. No data migration needed - existing templates work as-is
3. Admins can gradually add translations over time
4. System falls back to base template if translation missing

### For Existing Email Sends

1. Add `language_code` column to `email_logs` (nullable)
2. Existing logs will have `language_code = NULL`
3. Future sends populate this field
4. No impact on existing audit trail

---

## Future Enhancements (Post-MVP)

1. **Translation Management UI Improvements**
   - Side-by-side view: base template vs translation
   - Translation progress indicator (e.g., "2 of 5 languages translated")
   - Bulk translation export/import (CSV or JSON)
   - Professional translation service integration (e.g., Lokalise, Phrase)

2. **AI-Assisted Translation**
   - Auto-translate button using OpenAI/DeepL API
   - Suggest translations based on existing patterns
   - Translation quality scoring

3. **Dynamic Language Management**
   - Admin can enable/disable languages via UI
   - Store supported languages in database
   - Language-specific validation rules

4. **Template Versioning Across Languages**
   - Track version per language
   - Show which translations are outdated when base template updated
   - "Update needed" badge for stale translations

5. **Regional Variants**
   - Support regional language codes (en-US vs en-GB, fr-FR vs fr-CA)
   - Regional date/time/currency formatting

---

## Success Metrics

- Admins can create translations for all templates in <5 minutes per language
- Email delivery in patient's preferred language: >95% success rate
- Fallback logic prevents email failures: 0% errors due to missing translations
- Translation coverage: At least 2 languages (en, fr) for all system templates
- User satisfaction: Multilingual patients receive emails in their language

---

## Dependencies

**Required:**
- US-5.5.2 (Email Templates) - COMPLETED ✅

**Optional:**
- Patient language preference field (likely already exists)
- User language preference field (for admin UI localization)

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Translation quality issues | Medium | Medium | Provide clear guidelines; use professional translators for production |
| Incomplete translations cause email failures | High | Low | Robust fallback logic; validation warnings in UI |
| Performance degradation on translation lookup | Medium | Low | Proper indexing; consider caching frequently used translations |
| Variable syntax errors in translations | Medium | Medium | Variable validation; preview functionality; admin testing |

---

## Estimated Effort

| Phase | Effort | Complexity |
|-------|--------|------------|
| Backend Infrastructure | 1 day | Medium |
| Frontend UI | 1 day | Medium |
| Integration & Testing | 0.5 day | Low |
| **Total** | **2.5 days** | **Medium** |

---

## File Changes Summary

### Backend (8 files)

| File | Action | Est. Lines |
|------|--------|------------|
| `migrations/20260126000002-extend-translations-email-templates.js` | CREATE | ~80 |
| `migrations/20260126000003-add-language-to-email-logs.js` | CREATE | ~30 |
| `models/MeasureTranslation.js` | MODIFY | +30 |
| `backend/src/services/emailTemplateTranslation.service.js` | CREATE | ~250 |
| `backend/src/services/email.service.js` | MODIFY | +80 |
| `backend/src/controllers/emailTemplateController.js` | MODIFY | +150 |
| `backend/src/routes/emailTemplates.js` | MODIFY | +50 |
| `seeders/20260126000002-default-email-template-translations.js` | CREATE | ~200 |

**Total Backend:** ~870 lines

### Frontend (5 files)

| File | Action | Est. Lines |
|------|--------|------------|
| `frontend/src/services/emailTemplateService.js` | MODIFY | +80 |
| `frontend/src/components/EmailTemplateTranslationModal.jsx` | CREATE | ~350 |
| `frontend/src/pages/EmailTemplatesPage.jsx` | MODIFY | +50 |
| `frontend/src/components/EmailPreviewModal.jsx` | MODIFY | +40 |
| `frontend/src/utils/languages.js` | CREATE | ~50 |

**Total Frontend:** ~570 lines

**Total Implementation:** ~1,440 lines of code

---

## Completion Criteria

- [ ] All acceptance criteria met
- [ ] Backend tests pass (unit + integration)
- [ ] Frontend UI tested across browsers
- [ ] Documentation updated (user guide for translations)
- [ ] Seeder creates French translations for system templates
- [ ] Demo video showing: create translation → send email → verify language
- [ ] Completion report: `US-5.5.6-COMPLETED.md`

---

**User Story Status:** 📝 Ready for Planning
**Created:** 2026-01-25
**Approved By:** [Pending]
**Sprint Assignment:** [To Be Determined]

---

## Notes

- This user story leverages the existing MeasureTranslation infrastructure for consistency
- Backward compatible: all existing templates and email sends work without changes
- Gradual adoption: admins can add translations over time as needed
- Future-proof: pattern supports adding more translatable entities (appointments, documents, etc.)
