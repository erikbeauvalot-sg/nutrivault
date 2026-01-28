## Changes

### Bug Fixes
- **Calculated Custom Fields Display**: Fixed issue where calculated custom fields were completely hidden in patient edit forms. They now display properly with calculator icon (🧮) and read-only values.

### Technical Details
- Removed filtering logic in `EditPatientPage.jsx` that excluded calculated fields from rendering
- Calculated fields now appear in both basic info and category sections of patient edit forms
- Maintained read-only behavior and proper styling for calculated field inputs
- Ensured consistency between patient edit and visit edit forms

### Root Cause
- The filtering logic `!field.is_calculated` was preventing calculated fields from being rendered at all in patient edit forms
- Visit edit forms were working correctly as they didn't have this filtering

### Impact
- Patient Edit Page: Calculated fields now display properly in all sections
- Visit Edit Page: No changes needed (already working)
- User Experience: Consistent display of calculated fields across all edit forms
- Data Visibility: Users can now see calculated field values during patient editing

### Testing
- Verified calculated fields display in patient edit forms
- Confirmed read-only behavior is maintained
- Checked visual consistency with existing field types
- Tested both basic info and category sections