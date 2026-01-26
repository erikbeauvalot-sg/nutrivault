# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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