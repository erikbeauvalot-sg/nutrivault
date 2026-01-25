# AI Prompt Editor - Implementation Summary

**Feature:** Customizable AI Prompts by Usage Type
**Status:** COMPLETED
**Date:** 2026-01-25

---

## Summary

Added an AI Prompt Editor that allows administrators to customize the prompts used for different AI generation use cases (followup, invitation, relance, etc.). Each prompt usage type is editable via the admin interface and stored in the database.

---

## Features Implemented

### 1. Database Model (`AIPrompt`)

- **Table:** `ai_prompts`
- **Fields:**
  - `id` (UUID): Primary key
  - `usage` (STRING): followup, invitation, relance, welcome
  - `name` (STRING): Display name
  - `description` (TEXT): Usage description
  - `language_code` (STRING): fr, en, es, nl, de
  - `system_prompt` (TEXT): AI system instructions
  - `user_prompt_template` (TEXT): Template with {{variables}}
  - `available_variables` (JSON): List of available variables
  - `is_active` (BOOLEAN): Toggle prompts on/off
  - `is_default` (BOOLEAN): One default per usage+language
  - `version` (INTEGER): Version tracking
  - `created_by`, `updated_by` (UUID): Audit fields

### 2. Backend Service (`aiPrompt.service.js`)

Functions:
- `getAllPrompts(filters)` - Get all prompts with optional filtering
- `getPromptById(id)` - Get single prompt
- `getActivePrompt(usage, languageCode)` - Get active default prompt with fallback
- `createPrompt(data, userId)` - Create new prompt
- `updatePrompt(id, data, userId)` - Update existing prompt
- `deletePrompt(id)` - Delete prompt
- `setAsDefault(id)` - Set prompt as default for its usage+language
- `duplicatePrompt(id, overrides, userId)` - Clone a prompt
- `testPrompt(id, sampleData)` - Test with sample variable substitution

### 3. API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/ai-prompts` | ADMIN | List all prompts |
| GET | `/api/ai-prompts/:id` | ADMIN | Get prompt by ID |
| GET | `/api/ai-prompts/usage/:usage` | Authenticated | Get active prompt for usage |
| GET | `/api/ai-prompts/usage-types` | Authenticated | List usage types |
| POST | `/api/ai-prompts` | ADMIN | Create prompt |
| PUT | `/api/ai-prompts/:id` | ADMIN | Update prompt |
| DELETE | `/api/ai-prompts/:id` | ADMIN | Delete prompt |
| POST | `/api/ai-prompts/:id/set-default` | ADMIN | Set as default |
| POST | `/api/ai-prompts/:id/duplicate` | ADMIN | Duplicate prompt |
| POST | `/api/ai-prompts/:id/test` | ADMIN | Test with sample data |

### 4. Integration with AI Follow-up

Modified `aiFollowup.service.js` to:
- Fetch active prompt from database first
- Fall back to hardcoded prompts if no database prompt exists
- Apply variable substitution using `{{variable}}` syntax

### 5. Frontend Components

#### AIPromptEditor.jsx
- Modal for creating/editing prompts
- Usage type selection dropdown
- Language selection
- System prompt and user template tabs
- Available variables as clickable badges
- Form validation
- Test prompt functionality

#### AIConfigPage.jsx Updates
- Added "Prompts IA" section with table listing all prompts
- Actions: Edit, Duplicate, Set Default, Delete
- Integration with AIPromptEditor modal

### 6. Default Prompts (Seeded)

- **Followup (French):** Post-consultation follow-up email
- **Followup (English):** Post-consultation follow-up email

---

## Files Created/Modified

### Created (Backend)
- `models/AIPrompt.js`
- `backend/migrations/20260125000020-create-ai-prompts.js`
- `backend/seeders/20260125000020-default-ai-prompts.js`
- `backend/src/services/aiPrompt.service.js`
- `backend/src/controllers/aiPromptController.js`
- `backend/src/routes/aiPrompts.js`

### Created (Frontend)
- `frontend/src/services/aiPromptService.js`
- `frontend/src/components/AIPromptEditor.jsx`

### Modified
- `models/index.js` - Added AIPrompt model and associations
- `backend/src/server.js` - Registered aiPrompts routes
- `backend/src/services/aiFollowup.service.js` - Integrated database prompts
- `frontend/src/pages/AIConfigPage.jsx` - Added prompts section
- `frontend/src/locales/fr.json` - Added aiPrompt translations
- `frontend/src/locales/en.json` - Added aiPrompt translations

---

## Variable Substitution

Uses `{{variable_name}}` syntax with support for:
- Simple variables: `{{patient_name}}`
- Conditional blocks: `{{#if variable}}...{{/if}}`

**Available Variables (Followup):**
- `patient_name`, `dietitian_name`
- `visit_date`, `visit_type`
- `chief_complaint`, `assessment`, `recommendations`, `notes`
- `next_visit_date`, `tone`

---

## Usage

### Accessing the Editor

1. Log in as Admin
2. Go to Settings > AI Configuration
3. Scroll down to "Prompts IA" section
4. Click "New Prompt" or edit an existing one

### Creating a New Prompt

1. Select usage type (followup, invitation, etc.)
2. Select language (FR, EN, etc.)
3. Enter name and description
4. Write system prompt (AI instructions)
5. Write user prompt template (with {{variables}})
6. Toggle "Active" and "Default" as needed
7. Click Save

### Testing a Prompt

1. Edit an existing prompt
2. Click "Test Prompt" button
3. View the preview with sample data substituted

---

## Fallback Logic

When generating AI content:
1. Try to find database prompt for usage + language
2. If not found, try any active prompt for that usage + language
3. If still not found and language != 'fr', try French prompt
4. If no database prompt exists, use hardcoded fallback

---

**Completed By:** Claude Code
**Sprint:** Post Sprint 5
