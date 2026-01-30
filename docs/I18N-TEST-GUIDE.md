# Internationalization (i18n) Testing Guide

## Sprint 4 - Feature 3: Complete Translation System

This guide will help you test all aspects of the internationalization system we just implemented.

---

## 🎯 What We Built

1. **Translation Database Schema** - Stores translations for categories and field definitions
2. **Backend Translation Service** - Applies translations dynamically based on language
3. **Admin UI for Translations** - Interface for managing translations (ADMIN only)
4. **Dynamic Translation Display** - Users see content in their selected language

---

## 🧪 Test Plan

### Phase 1: Admin - Add Translations (ADMIN Role Required)

#### Test 1.1: Access Translation Management
1. **Login** as an ADMIN user
2. **Navigate** to Settings → Custom Fields (`/settings/custom-fields`)
3. **Verify** you see the "Categories" and "Fields" tabs

#### Test 1.2: Add Category Translation
1. **Click** on any existing category in the list
2. **Switch** to the "🌍 Translations" tab
3. **Select** language: English (en)
4. **Fill in** translations:
   - Name (English): [Translate the French category name]
   - Description (English): [Translate the French description]
5. **Click** "Save Translations"
6. **Verify** success message appears

#### Test 1.3: Add Field Definition Translation
1. **Click** on the "Fields" tab
2. **Click** on any existing field definition
3. **Switch** to the "🌍 Translations" tab
4. **Select** language: English (en)
5. **Fill in** translations:
   - Field Label (English): [Translate the French label]
   - Help Text (English): [Translate the French help text]
6. **Click** "Save Translations"
7. **Verify** success message appears

---

### Phase 2: User - View Translated Content

#### Test 2.1: Change Language in User Profile
1. **Login** as any user (ADMIN or DIETITIAN)
2. **Click** on your username (top right)
3. **Select** "Profile"
4. **Change** "Language Preference" to "English"
5. **Save** changes
6. **Refresh** the page

#### Test 2.2: Verify Patient Custom Fields Display in English
1. **Navigate** to Patients page
2. **Click** on any patient
3. **Scroll down** to the custom fields section
4. **Verify**:
   - ✅ Category names appear in English (if translated)
   - ✅ Category descriptions appear in English (if translated)
   - ✅ Field labels appear in English (if translated)
   - ✅ Help text appears in English (if translated)
   - ⚠️ Untranslated items show in French (default)

#### Test 2.3: Verify Visit Custom Fields Display in English
1. **Navigate** to Visits page
2. **Click** on any visit
3. **Look** for custom field tabs (if visit custom fields exist)
4. **Verify**:
   - ✅ Category names appear in English
   - ✅ Field labels appear in English
   - ✅ Help text appears in English

#### Test 2.4: Test Language Switching (Dynamic Refetch)
1. **Stay** on a patient detail page with custom fields visible
2. **Change** language back to French in your profile
3. **Return** to the patient page
4. **Verify**:
   - ✅ Content automatically updates to French
   - ✅ No page reload required (dynamic refetch)

---

### Phase 3: API Testing (Optional - For Developers)

#### Test 3.1: Test Language Query Parameter
Open browser console and test API directly:

```javascript
// Test with French (default)
fetch('/api/patients/PATIENT_ID/custom-fields')
  .then(r => r.json())
  .then(console.log);

// Test with English
fetch('/api/patients/PATIENT_ID/custom-fields?language=en')
  .then(r => r.json())
  .then(console.log);
```

**Expected**: Second request returns English translations where available.

#### Test 3.2: Test Translation Fallback Chain
1. **Add** translation for ONE field only (not all)
2. **Request** that category with language=en
3. **Verify**:
   - ✅ Translated field shows in English
   - ✅ Untranslated fields show in French (fallback)
   - ✅ No errors or null values

---

## 📋 Expected Behavior Summary

### Translation Priority (Fallback Chain)
1. **Requested Language** (e.g., English) - If translation exists
2. **English** - If requested language translation doesn't exist
3. **French (Original)** - If no translations exist at all

### Automatic Refetch Triggers
- User changes language preference
- User navigates to a different page
- Component remounts with different language

### Performance
- Translations applied server-side (single query)
- No N+1 query issues
- Cached efficiently by Sequelize

---

## 🐛 Common Issues & Solutions

### Issue 1: "Translations tab is disabled"
**Cause**: Entity hasn't been saved yet
**Solution**: Save the category/definition first, then add translations

### Issue 2: "Content still shows in French after adding English translation"
**Cause**: Language preference not set to English
**Solution**: Check user profile language setting or use `?language=en` query param

### Issue 3: "Some fields translated, others not"
**Behavior**: This is CORRECT - fallback to French for untranslated content
**Solution**: Add translations for remaining fields

### Issue 4: "Changes don't appear immediately"
**Cause**: Browser cache or state not updated
**Solution**: Refresh the page or switch tabs to trigger refetch

---

## ✅ Success Criteria

You've successfully tested the i18n system if:

- [ ] ADMIN can access translation management UI
- [ ] ADMIN can add/edit translations for categories
- [ ] ADMIN can add/edit translations for field definitions
- [ ] Translations are saved to database
- [ ] Users can change language preference
- [ ] Patient custom fields display in selected language
- [ ] Visit custom fields display in selected language
- [ ] Untranslated content falls back to French
- [ ] Language switching triggers automatic refetch
- [ ] No console errors during any operations

---

## 🎉 Sprint 4 Complete!

All 4 User Stories implemented:
- ✅ US 3.1: Translation Database Schema (3 pts)
- ✅ US 3.2: Backend Translation Service (5 pts)
- ✅ US 3.3: Admin UI for Translations (5 pts)
- ✅ US 3.4: Dynamic Translation in Views (4 pts)

**Total: 17/17 points (100%)**

---

## 📝 Notes

- Currently supports: French (default), English
- Extensible to add more languages (Spanish, German, etc.)
- Translation UI only accessible to ADMIN users
- All users can view content in their preferred language
- Translation service uses efficient caching
- Audit logs track all translation changes
