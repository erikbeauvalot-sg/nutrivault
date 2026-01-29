# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.4.1] - 2026-01-29

### Fixed
- **Production Deployment Error**: Critical fix for SQLite timezone configuration
  - Removed timezone configuration for SQLite databases (not supported)
  - Timezone config now only applies when using PostgreSQL dialect
  - Resolves Sequelize error: "Setting a custom timezone is not supported by SQLite"
  - Fixes blocking production deployment issue with v5.4.0

### Technical Details
- **Database Configuration**:
  - Modified `config/database.js` to conditionally apply timezone only for PostgreSQL
  - SQLite databases now use default UTC timezone behavior
  - No breaking changes for existing deployments

## [5.4.0] - 2026-01-29

### Fixed
- **Patient Visits Display Bug**: Critical fix for patient visits not showing in detail page
  - Resolved authentication issue preventing visits from displaying in patient detail tabs
  - Fixed API response parsing in `PatientDetailPage.jsx` fetchPatientDetails function
  - Added safety checks for visits array rendering to prevent undefined errors
  - Improved data handling for nested API response structures
  - Cleaned up temporary debug logging and test code

### Technical Details
- **Backend Changes**:
  - No backend API changes required - API was working correctly
  - Authentication middleware properly configured for patient details endpoint
- **Frontend Changes**:
  - Enhanced `PatientDetailPage.jsx` data fetching and error handling
  - Improved visits array validation and rendering logic
  - Updated API response parsing to handle nested data structures
  - Added defensive programming for array operations

### Files Modified
- `frontend/src/pages/PatientDetailPage.jsx` - Fixed visits display and data handling
- `backend/src/controllers/patientController.js` - Ensured proper user authentication
- `backend/src/routes/patients.js` - Confirmed authentication middleware setup

## [5.3.0] - 2026-01-28

### Added
- **Separator Custom Field Type**: New field type for visual organization in forms
  - Horizontal line separators that span full width in forms
  - No data input required - purely visual elements
  - Perfect for creating section breaks in Patient and Visit forms
  - Available in custom field creation interface
- **Blank Custom Field Type**: New field type for creating empty space in forms
  - Invisible spacing elements for better form organization
  - No label or input displayed - creates clean visual breaks
  - Full-width layout like separators but without visible content
  - Useful for spacing and layout control in complex forms

### Changed
- **Form Layout Improvements**: Enhanced layout handling for different field types
  - Separators display as full-width horizontal lines in view mode
  - Regular fields maintain 2-column grid layout for optimal space usage
  - Edit forms use full-width layout for better input experience
- **Custom Field Display**: Improved rendering logic for special field types
  - Separators hide labels and display only horizontal lines
  - Better visual hierarchy in form sections

### Technical Details
- **Backend Changes**:
  - Added 'separator' to CustomFieldDefinition ENUM validation
  - Updated field type validation logic
  - **Database Migration**: Added migration to support 'calculated' and 'separator' field types in production PostgreSQL database
- **Frontend Changes**:
  - Modified `CustomFieldDisplay.jsx` to conditionally hide separator labels
  - Updated `PatientDetailPage.jsx` and `VisitDetailPage.jsx` for proper separator layout
  - Enhanced `CreateVisitPage.jsx` and `PatientCustomFieldsTabs.jsx` for edit mode
  - Improved responsive grid system for mixed field types

### Files Modified
- `models/CustomFieldDefinition.js` - Added separator field type validation
- `backend/src/controllers/customFieldDefinitionController.js` - Updated validation
- `migrations/20260128063448-add-calculated-and-separator-field-types.js` - Database migration for new field types
- `frontend/src/components/CustomFieldDisplay.jsx` - Separator rendering logic
- `frontend/src/components/CustomFieldInput.jsx` - Separator input handling
- `frontend/src/pages/PatientDetailPage.jsx` - Layout adjustments for separators
- `frontend/src/pages/VisitDetailPage.jsx` - Layout adjustments for separators
- `frontend/src/pages/CreateVisitPage.jsx` - Edit form layout
- `frontend/src/components/PatientCustomFieldsTabs.jsx` - Edit form layout
- `frontend/src/components/CustomFieldDefinitionModal.jsx` - Added separator option

---

## [5.2.15] - 2026-01-27

### Changed
- Renamed "Informations de base" tab to "Aperçu" (Overview) in patient pages
- Reorganized patient detail page tabs order: Aperçu → Custom Fields → Mesures → Documents → Visites → Factures → Administratif → Raw Data (dev only)
- Updated CustomFieldDefinitionModal and CustomFieldDefinitionDetailPage labels from "Show in Basic Information" to "Show in Overview"
- Fixed duplicate translation key in fr.json that was overriding the "Aperçu" value

### Files Modified
- `PatientDetailPage.jsx` - Tab reordering and renaming
- `EditPatientPage.jsx` - Tab renaming to "Aperçu"
- `CustomFieldDefinitionModal.jsx` - Label update
- `CustomFieldDefinitionDetailPage.jsx` - Label update
- `fr.json` - Fixed duplicate basicInformation key, added showInOverview translations
- `en.json` - Added showInOverview translations

---

## [5.2.14] - 2026-01-26

### Added
- New `ConfirmModal` reusable component replacing all `window.confirm()` dialogs
- Unit tests for `ConfirmModal` component (16 test cases)

### Changed
- Replaced all `window.confirm()` calls with proper Bootstrap modals for better UX consistency
- Updated 22+ pages/components to use the new ConfirmModal component
- Improved user experience with consistent styling across all confirmation dialogs

### Files Modified
- `ConfirmModal.jsx` (new) - Reusable confirmation modal component
- `ConfirmModal.test.jsx` (new) - Component unit tests
- Pages: PatientsPage, VisitsPage, UsersPage, BillingPage, InvoiceDetailPage, UserDetailPage, PatientDetailPage, CustomFieldsPage, BillingTemplatesPage, RolesManagementPage, InvoiceCustomizationPage, EmailTemplatesPage, AIConfigPage, EditVisitPage, CustomFieldDefinitionDetailPage, CustomFieldCategoryDetailPage
- Components: InvoiceList, PatientMeasuresTable, SendReminderButton, EmailTemplateTranslationModal
- Locales: Added translation keys for confirmation dialogs (fr.json, en.json)

---

## [5.0.0-alpha] - 2026-01-25

### Added
- Complete RBAC (Role-Based Access Control) system with permissions management
- Custom fields system for flexible data collection
- Advanced health analytics and trend analysis
- Appointment reminder service
- Template system for billing and communications
- Sprint 5 features: Templates & Communication
- Sprint 4 features: Health Analytics & Trends
- Sprint 3 features: Enhanced billing and reporting
- Multi-language support (i18n) with French translations
- Docker containerization for easy deployment
- Comprehensive test suite with backend and frontend tests

### Changed
- Major architecture overhaul from v4.x to v5.0
- Updated to modern React patterns and hooks
- Improved user interface with Bootstrap 5
- Enhanced API with better error handling and validation
- Database schema updates for new features

### Technical Details
- **Backend**: Node.js with Express, Sequelize ORM, SQLite/PostgreSQL support
- **Frontend**: React with Vite, React Router, Bootstrap 5
- **Testing**: Jest for backend, Vitest for frontend
- **Deployment**: Docker with docker-compose

### Known Issues
- Some integration tests are currently failing and need to be addressed before stable release
- Frontend tests have configuration issues that need resolution

### Contributors
- Development team for v5.0 features and architecture

---

## [4.0.7] - Previous Release
- Legacy v4.x features (see git history for details)

## [4.0.6] - Previous Release
- Legacy v4.x features (see git history for details)

## [4.0.5] - Previous Release
- Legacy v4.x features (see git history for details)

## [4.0.4] - Previous Release
- Legacy v4.x features (see git history for details)

## [4.0.3] - Previous Release
- Legacy v4.x features (see git history for details)

## [4.0.2] - Previous Release
- Legacy v4.x features (see git history for details)

## [4.0.1] - Previous Release
- Legacy v4.x features (see git history for details)

## [4.0.0] - Previous Release
- Legacy v4.x features (see git history for details)