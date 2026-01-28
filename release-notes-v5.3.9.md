# Release Notes - v5.3.9

## 🐛 Bug Fixes

### Custom Fields Multi-Select Support
- **Fixed multi-select dropdown fields** for both patients and visits
- **Added proper validation** for array values in multi-select fields
- **Updated data models** to handle JSON arrays for multi-select values
- **Fixed duplicate label display** in edit forms for calculated and select fields

### Technical Improvements
- Enhanced `PatientCustomFieldValue` and `VisitCustomFieldValue` models to support multi-select arrays
- Updated validation logic in `CustomFieldDefinition` model for array handling
- Improved frontend components to properly display and edit multi-select fields
- Fixed label duplication in `CustomFieldInput` component

## 📋 Details

### Backend Changes
- Modified `PatientCustomFieldValue.getValue()` and `setValue()` to handle `allow_multiple` parameter
- Modified `VisitCustomFieldValue.getValue()` and `setValue()` to handle `allow_multiple` parameter
- Updated `CustomFieldDefinition.validateValue()` to validate arrays for multi-select fields
- Enhanced API responses to include `allow_multiple` field information

### Frontend Changes
- Updated `CustomFieldInput` component to remove duplicate labels for calculated and multi-select fields
- Maintained proper label display for all field types
- Ensured consistent UI behavior across patient and visit edit forms

## ✅ Testing
- All existing tests pass
- Frontend builds successfully
- Multi-select functionality verified for both patients and visits
- Label display corrected in edit forms

---

**Published:** January 28, 2026
**Previous Version:** v5.3.6