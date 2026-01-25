# US-5.5.6: Email Template Multi-Language Support - COMPLETED

**Sprint:** Sprint 5 - Templates & Communication
**User Story:** US-5.5.6
**Status:** COMPLETED
**Completion Date:** 2026-01-25

---

## Summary

Implemented multi-language support for email templates, allowing administrators to create translations of templates in multiple languages. The system automatically selects the appropriate language based on patient preferences with intelligent fallback logic.

---

## Features Implemented

### 1. Translation Storage System

- Extended the existing `MeasureTranslation` model to support email templates
- Polymorphic pattern with `entity_type = 'email_template'`
- Supports fields: `subject`, `body_html`, `body_text`
- Unique constraint per entity/language/field combination

### 2. Backend Translation Service

**File:** `backend/src/services/emailTemplateTranslation.service.js`

Functions:
- `getTranslations(templateId)` - Get all translations for a template
- `getTranslation(templateId, languageCode)` - Get specific language translation
- `setAllTranslations(templateId, languageCode, data)` - Save translation
- `deleteTranslations(templateId, languageCode)` - Remove translation
- `getTemplateInLanguage(templateId, preferredLanguage)` - Get with fallback logic
- `getAvailableLanguages(templateId)` - List translated languages
- `getSupportedLanguages()` - List all supported languages

### 3. API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/email-templates/:id/translations` | users.read | Get all translations |
| GET | `/api/email-templates/:id/translations/:lang` | users.read | Get specific translation |
| POST | `/api/email-templates/:id/translations/:lang` | ADMIN | Create/update translation |
| PUT | `/api/email-templates/:id/translations/:lang` | ADMIN | Update translation |
| DELETE | `/api/email-templates/:id/translations/:lang` | ADMIN | Delete translation |
| GET | `/api/email-templates/:id/base-content` | users.read | Get base template content |
| GET | `/api/email-templates/supported-languages` | users.read | List supported languages |
| POST | `/api/email-templates/:id/preview-translation` | users.read | Preview in specific language |

### 4. Frontend Translation Modal

**File:** `frontend/src/components/EmailTemplateTranslationModal.jsx`

Features:
- Language tabs for all supported languages
- Visual indicators for translated languages (badges)
- "Copy from base" button for starting translations
- Form validation (subject and HTML body required)
- Save/Delete translation actions
- Real-time success/error feedback

### 5. Supported Languages

**File:** `frontend/src/utils/languages.js`

| Code | Name | Flag |
|------|------|------|
| en | English | 🇬🇧 |
| fr | Français | 🇫🇷 |
| es | Español | 🇪🇸 |
| nl | Nederlands | 🇳🇱 |
| de | Deutsch | 🇩🇪 |

### 6. Language Fallback Logic

When sending an email, the system:
1. Tries patient's preferred language first
2. Falls back to default language (configurable, defaults to 'en')
3. Uses base template if no translation available
4. Logs which language was used in email_logs

---

## Files Changed/Created

### Backend (8 files)

| File | Action | Lines |
|------|--------|-------|
| `migrations/20260126000009-extend-translations-for-email-templates.js` | CREATE | 33 |
| `migrations/20260126000010-add-language-to-email-logs.js` | CREATE | 30 |
| `models/MeasureTranslation.js` | MODIFY | +30 |
| `models/EmailLog.js` | MODIFY | +5 |
| `src/services/emailTemplateTranslation.service.js` | CREATE | 285 |
| `src/controllers/emailTemplateController.js` | MODIFY | +170 |
| `src/routes/emailTemplates.js` | MODIFY | +100 |
| `src/services/email.service.js` | MODIFY | +20 |

### Frontend (5 files)

| File | Action | Lines |
|------|--------|-------|
| `src/utils/languages.js` | CREATE | 77 |
| `src/components/EmailTemplateTranslationModal.jsx` | CREATE | 312 |
| `src/services/emailTemplateService.js` | MODIFY | +75 |
| `src/pages/EmailTemplatesPage.jsx` | MODIFY | +15 |

**Total:** ~1,152 lines of code

---

## How to Use

### Adding a Translation

1. Navigate to **Email Templates** page (Admin only)
2. Find the template you want to translate
3. Click the **Globe icon** (🌐) button
4. Select the language tab you want to add
5. Click **"Copy from base template"** to start with existing content
6. Translate the subject and HTML body
7. Click **Save**

### Automatic Language Selection

When sending emails, the system automatically:
1. Checks patient's `language_preference` field
2. Looks for translation in that language
3. Falls back if translation not available
4. Records language used in email log

### Configuration

Environment variables (optional):
```bash
DEFAULT_EMAIL_LANGUAGE=en    # Default language for emails
FALLBACK_EMAIL_LANGUAGE=en   # Fallback when translation missing
```

---

## Testing Checklist

- [x] Translation modal opens from template card
- [x] Can save new translation
- [x] Can update existing translation
- [x] Can delete translation
- [x] "Copy from base" works
- [x] Language badges show on modal
- [x] Form validation works (required fields)
- [x] API endpoints return correct data
- [x] Frontend builds without errors

---

## Technical Notes

### Polymorphic Pattern

Uses the same `measure_translations` table with:
- `entity_type = 'email_template'`
- `entity_id` = email template UUID
- `field_name` = 'subject', 'body_html', or 'body_text'

This pattern allows easy extension to other translatable entities in the future.

### Variable Handling

Variables like `{{patient_name}}` remain consistent across all translations. The variable replacement happens after language selection.

---

## Future Enhancements

1. **Side-by-side editor** - View base and translation together
2. **Translation progress indicator** - Show completion percentage
3. **AI-assisted translation** - Auto-translate with AI
4. **Bulk export/import** - CSV/JSON for professional translators
5. **Translation versioning** - Track when base template changes

---

## Acceptance Criteria Status

- [x] Email template content can be translated into multiple languages
- [x] Translations stored separately from base templates
- [x] Translation management UI accessible from Email Templates page
- [x] Automatic language selection based on patient.language_preference
- [x] Fallback to default language if translation not available
- [x] Preview templates in any available language
- [x] Support standard language codes (en, fr, es, nl, de)

---

**Completed By:** Claude Code
**Reviewed By:** [Pending]
**Sprint:** Sprint 5 - Templates & Communication
