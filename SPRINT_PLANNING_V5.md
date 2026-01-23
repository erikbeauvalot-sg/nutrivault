# Nutrivault v5.0 - Sprint Planning
## Build-Measure-Analyze-Decide (BMAD) Methodology

**Version**: 5.0
**Branch**: `v5.0-features`
**Start Date**: 2026-01-23
**Methodology**: BMAD - Iterative development with continuous feedback

---

## Executive Summary

Nutrivault v5.0 introduces six major feature areas designed to enhance RBAC management, patient data visualization, health tracking, communication automation, and analytics capabilities. The development is organized into 6 sprints over 12-18 weeks, with each sprint following the BMAD cycle.

### Feature Areas Overview

| Feature Area | Priority | Complexity | Dependencies |
|--------------|----------|------------|--------------|
| RBAC UI Management | HIGH | Medium | None (extends existing) |
| UI Updates & Calculated Fields | HIGH | Low-Medium | Custom fields system |
| Measures Tracking System | HIGH | High | New data model |
| Billing & Email Templates | MEDIUM | Medium | Existing billing system |
| Patient Communication | MEDIUM | High | Templates + Email service |
| Advanced Data Visualization | LOW | Medium | Measures + Communication data |

---

## Current State Analysis

### ✅ Existing Capabilities (Build on these)

1. **RBAC System** - Complete backend with:
   - 4 roles (ADMIN, DIETITIAN, ASSISTANT, VIEWER)
   - 21 granular permissions
   - Middleware protection
   - ❌ Missing: UI for role/permission management

2. **Custom Fields** - Robust system with:
   - 6 field types (text, number, date, select, boolean, textarea)
   - Categories with color coding
   - Patient & Visit entities
   - i18n support
   - ❌ Missing: Calculated field type, list view display

3. **Billing** - Full invoice system:
   - Invoice generation
   - Payment tracking
   - Email history
   - ❌ Missing: Customizable templates

4. **Patient/Visit Data** - Core entities established
   - ❌ Missing: Dedicated measures tracking system

5. **Email Infrastructure** - Nodemailer configured
   - ❌ Missing: Template system, automation

### 🆕 New Capabilities to Build

1. **RBAC UI** - Admin interface for role/permission management
2. **Calculated Fields** - Formula-based custom fields (BMI, age, etc.)
3. **Measures Tracking** - Time-series health metrics with visualization
4. **Template System** - Reusable billing & email templates
5. **Patient Communication** - Automated reminders & AI-generated follow-ups
6. **Advanced Dashboards** - Health trends, financial metrics, communication analytics

---

## Sprint Organization

### Sprint 1: Foundation & Quick Wins (2 weeks)
**Theme**: Build RBAC UI and deliver immediate UI improvements
**BMAD Focus**: Build + Measure adoption of new UI features

#### User Stories

**US-5.1.1: RBAC Management UI** (Priority: HIGH)
- **As an admin**, I want to create and manage user roles (e.g., admin, practitioner, nurse)
- **As an admin**, I want to assign permissions to roles for accessing different parts of the application
- **As an admin**, I want to assign users to roles
- **Acceptance Criteria**:
  - New page `/settings/roles` with list of roles
  - Create/Edit role modal with permission checkboxes organized by resource
  - User management page shows role assignment dropdown
  - Real-time permission updates reflected in UI
  - Audit log entries for role/permission changes

**US-5.1.2: UI Cleanup - Remove Birth Date** (Priority: HIGH)
- **As a practitioner**, I want a cleaner patient view without birth date clutter
- **Acceptance Criteria**:
  - Remove birth date column from patient list view
  - Remove birth date from patient detail header
  - Age calculation available via custom calculated field instead

**US-5.1.3: Custom Fields in List View** (Priority: HIGH)
- **As a practitioner**, I want to see important custom fields in the patient list
- **Acceptance Criteria**:
  - New checkbox "Show in list view" in custom field definition UI
  - Patient list table dynamically adds columns for flagged fields
  - Column sorting/filtering works for custom field columns
  - Max 5 custom columns to avoid overcrowding
  - Responsive design maintained

**US-5.1.4: Fix Alerts - Visits Without Notes** (Priority: HIGH - BUG FIX)
- **As a practitioner**, I want to see visits without notes in the alerts section
- **Issue**: The "Visites sans notes" alert is no longer functional and needs to use custom fields instead of the old notes field
- **Acceptance Criteria**:
  - Update alerts query to check for empty custom field values instead of old notes field
  - Display visits that have no custom field values filled
  - Alert shows visit date, patient name, and missing custom fields count
  - Clicking alert navigates to visit detail page
  - Alert is dismissible or auto-dismissed when custom fields are added

#### Technical Tasks
- [ ] Backend: Add `show_in_list` boolean to `custom_field_definitions` table
- [ ] Backend: Extend GET /patients endpoint to include list-view custom fields
- [ ] Backend: Fix alerts query for visits without custom field values
- [ ] Backend: Update GET /alerts endpoint to use custom fields instead of notes field
- [ ] Frontend: Create `RolesManagementPage.jsx` component
- [ ] Frontend: Create `RoleModal.jsx` with permission tree UI
- [ ] Frontend: Update `PatientsPage.jsx` to render dynamic custom field columns
- [ ] Frontend: Remove birth date from `PatientCard.jsx` and `PatientDetailPage.jsx`
- [ ] Frontend: Update `AlertsWidget.jsx` to display visits without custom fields
- [ ] Migration: `add-show-in-list-to-custom-fields.js`

#### BMAD Metrics
- **Build**: Complete 3 user stories in 2 weeks
- **Measure**: Track adoption of role management UI (admin usage logs)
- **Analyze**: Gather feedback on list view custom fields (user survey)
- **Decide**: Determine if more custom field display options needed (e.g., card view)

---

### Sprint 2: Calculated Fields (2 weeks)
**Theme**: Extend custom fields with formula capabilities
**BMAD Focus**: Build formula engine + Measure calculation accuracy

#### User Stories

**US-5.2.1: Calculated Field Type** (Priority: HIGH)
- **As an admin**, I want to create calculated custom fields using formulas
- **Acceptance Criteria**:
  - New field type "calculated" in custom field definition
  - Formula editor with syntax: `{field_name} operator {field_name}`
  - Supported operators: `+`, `-`, `*`, `/`, `^` (power)
  - Supported functions: `sqrt()`, `abs()`, `round()`
  - Real-time preview of formula result
  - Error handling for invalid formulas (division by zero, undefined fields)
  - Formula validation before save

**US-5.2.2: Common Calculated Fields** (Priority: MEDIUM)
- **As a practitioner**, I want pre-built calculated fields for BMI and Age
- **Acceptance Criteria**:
  - BMI formula: `{poids} / ({taille} * {taille})`
  - Age formula: `(today - {date_naissance}) / 365.25`
  - Date functions: `today`, `year()`, `month()`, `day()`
  - Decimal precision configurable (0-4 decimal places)

**US-5.2.3: Calculated Field Dependencies** (Priority: MEDIUM)
- **As an admin**, I want calculated fields to update automatically when dependencies change
- **Acceptance Criteria**:
  - UI shows dependency tree (e.g., BMI depends on poids, taille)
  - Auto-recalculation on dependent field save
  - Circular dependency detection and prevention
  - Performance optimization for batch updates

#### Technical Tasks
- [ ] Backend: Create formula parser/evaluator service (`formulaEngine.service.js`)
- [ ] Backend: Add `formula` and `dependencies` columns to custom_field_definitions
- [ ] Backend: Implement calculation trigger on patient/visit save
- [ ] Frontend: Create `FormulaEditor.jsx` component with syntax highlighting
- [ ] Frontend: Add calculated field type to `CustomFieldDefinitionModal.jsx`
- [ ] Frontend: Display calculated values as read-only in forms
- [ ] Migration: `add-calculated-fields-support.js`
- [ ] Tests: Unit tests for formula evaluation (edge cases, errors)

#### BMAD Metrics
- **Build**: Formula engine with 10+ test cases
- **Measure**: Formula evaluation performance (avg <50ms per calculation)
- **Analyze**: Track most-used formulas and functions
- **Decide**: Expand formula language based on user requests

---

### Sprint 3: Measures Tracking Foundation (3 weeks)
**Theme**: Build new time-series health metrics system
**BMAD Focus**: Build core data model + Measure data quality

#### User Stories

**US-5.3.1: Define Custom Measures** (Priority: HIGH)
- **As an admin**, I want to define custom measures (e.g., weight, blood pressure) for tracking
- **Acceptance Criteria**:
  - New entity "Measure Definition" with name, unit, type (numeric/text/boolean)
  - Measure categories (Vitals, Lab Results, Symptoms, etc.)
  - Default measures pre-configured (weight, height, BP, heart rate, blood glucose)
  - Soft delete support (paranoid mode)
  - i18n for measure names and units

**US-5.3.2: Log Measure Values** (Priority: HIGH)
- **As a practitioner**, I want to log measure values with timestamps
- **Acceptance Criteria**:
  - Quick-add measure modal from patient detail page
  - Quick-add measure modal from visit detail page
  - Timestamp auto-filled (editable for historical data)
  - Value validation based on measure type (numeric ranges, text format)
  - Link to visit (optional) or patient directly
  - Bulk import from CSV (for historical data migration)

**US-5.3.3: Measure Data Model** (Priority: HIGH)
- **As a developer**, I want a scalable data model for measure storage
- **Acceptance Criteria**:
  - Tables: `measure_definitions`, `patient_measures`
  - Support for numeric, text, boolean, calculated measure types
  - Efficient querying for time-series data (indexed by patient + date)
  - Soft delete on both definitions and values
  - Audit trail for measure changes

#### Technical Tasks
- [ ] Backend: Create `MeasureDefinition` model with categories
- [ ] Backend: Create `PatientMeasure` model with polymorphic value storage
- [ ] Backend: Create `/api/measures` routes (CRUD for definitions)
- [ ] Backend: Create `/api/patient-measures` routes (log, query, update)
- [ ] Backend: Add bulk import endpoint (CSV parsing)
- [ ] Frontend: Create `MeasuresPage.jsx` for measure definition management
- [ ] Frontend: Create `LogMeasureModal.jsx` for quick data entry
- [ ] Frontend: Add "Measures" tab to `PatientDetailPage.jsx`
- [ ] Frontend: Create `PatientMeasuresTable.jsx` for listing measures
- [ ] Migration: `create-measures-tables.js`
- [ ] Seed: Default measure definitions (weight, height, BP, etc.)

#### BMAD Metrics
- **Build**: Complete data model with CRUD operations
- **Measure**: Track measure logging frequency (target: avg 2-3 per visit)
- **Analyze**: Identify most-tracked measures
- **Decide**: Prioritize measures for visualization in Sprint 4

---

### Sprint 4: Measures Tracking Advanced (2-3 weeks)
**Theme**: Add visualization, calculated measures, and alerts
**BMAD Focus**: Build analytics + Measure user engagement with charts

#### User Stories

**US-5.4.1: Measure Trend Visualization** (Priority: HIGH)
- **As a practitioner**, I want to visualize measure trends over time with graphs
- **Acceptance Criteria**:
  - Line chart for numeric measures (using Recharts)
  - Selectable time ranges (1 month, 3 months, 6 months, 1 year, all time)
  - Multiple measures on same chart (e.g., weight + BMI)
  - Tooltip shows exact values and dates
  - Download chart as PNG
  - Responsive design (mobile-friendly)

**US-5.4.2: Calculated Measures** (Priority: MEDIUM)
- **As an admin**, I want to create calculated measures using formulas
- **Acceptance Criteria**:
  - Calculated measure type with formula editor
  - Formula: `{measure_name} operator {measure_name}`
  - Auto-calculation on dependency update
  - Example: BMI = weight / (height^2)
  - Support for time-based calculations (e.g., weight change = current - previous)

**US-5.4.3: Normal Ranges & Alerts** (Priority: MEDIUM)
- **As an admin**, I want to define normal ranges for measures
- **Acceptance Criteria**:
  - Measure definition includes `min_normal`, `max_normal`, `min_critical`, `max_critical`
  - Demographic-specific ranges (age groups, gender)
  - Visual indicators on charts (green = normal, yellow = abnormal, red = critical)
  - Alert generation when values out of range
  - Alert dashboard widget showing recent critical values
  - Email notification option for critical alerts

**US-5.4.4: Visit-Linked Measures** (Priority: LOW)
- **As a practitioner**, I want to see measures taken during a visit
- **Acceptance Criteria**:
  - Visit detail page shows linked measures in a table
  - Quick-add measure from visit page pre-fills visit_id
  - Filter patient measures by visit

#### Technical Tasks
- [ ] Backend: Add `formula`, `min_normal`, `max_normal`, `min_critical`, `max_critical` to MeasureDefinition
- [ ] Backend: Create `MeasureRange` model for demographic-specific ranges
- [ ] Backend: Implement formula evaluation for calculated measures
- [ ] Backend: Create alert generation service (`measureAlert.service.js`)
- [ ] Backend: Add `/api/patient-measures/trends` endpoint (returns chart data)
- [ ] Frontend: Create `MeasureTrendChart.jsx` component (Recharts integration)
- [ ] Frontend: Add normal range visualization to charts (colored zones)
- [ ] Frontend: Create `MeasureAlertsWidget.jsx` for dashboard
- [ ] Frontend: Add measure editor to `VisitDetailPage.jsx`
- [ ] Migration: `add-measure-ranges-and-formulas.js`
- [ ] Tests: Formula evaluation for measures
- [ ] Tests: Alert generation logic

#### BMAD Metrics
- **Build**: Charts for top 5 measures
- **Measure**: Chart view frequency (target: 60% of patient detail page visits)
- **Analyze**: Alert effectiveness (false positive rate)
- **Decide**: Refine normal ranges based on practitioner feedback

---

### Sprint 5: Templates & Communication (3 weeks)
**Theme**: Build template system and patient communication automation
**BMAD Focus**: Build templates + Measure email delivery & open rates

#### User Stories

**US-5.5.1: Billing Templates** (Priority: MEDIUM)
- **As an admin**, I want to create and manage billing templates for different services
- **Acceptance Criteria**:
  - New entity "Billing Template" with name, description, default amount
  - Template fields: service items (name, quantity, unit price)
  - Apply template when creating invoice (pre-fills items)
  - Template library page for CRUD operations
  - Clone template feature

**US-5.5.2: Email Templates** (Priority: MEDIUM)
- **As an admin**, I want to create and manage email templates for patient communications
- **Acceptance Criteria**:
  - New entity "Email Template" with name, subject, body (HTML + plain text)
  - Variable placeholders: `{{patient_name}}`, `{{appointment_date}}`, `{{dietitian_name}}`, etc.
  - Template categories: Appointment Reminder, Follow-up, Invoice, General
  - WYSIWYG editor for HTML email design
  - Preview mode with sample data
  - Template versioning (track changes)

**US-5.5.3: Invoice Template Customization** (Priority: MEDIUM)
- **As a practitioner**, I want to customize invoice templates with my branding and signature
- **Acceptance Criteria**:
  - Upload logo image (PNG/JPG)
  - Custom color scheme (primary color picker)
  - Footer text with signature
  - Contact info fields (address, phone, email, website)
  - Preview invoice before generating PDF
  - Save as user-specific template override

**US-5.5.4: Appointment Reminders** (Priority: HIGH)
- **As a practitioner**, I want to send automated appointment reminders to patients via email
- **Acceptance Criteria**:
  - Configure reminder timing (e.g., 24 hours before, 1 week before)
  - Auto-send using visit schedule (cron job)
  - Use email template for reminder content
  - Track sent reminders (timestamp, status)
  - Manual send option from visit page
  - Unsubscribe link in footer

**US-5.5.5: AI-Generated Follow-ups** (Priority: LOW)
- **As a practitioner**, I want to send follow-up emails with AI-generated conclusions
- **Acceptance Criteria**:
  - "Generate Follow-up" button on visit detail page
  - AI analyzes visit notes (chief_complaint, assessment, recommendations)
  - Generates personalized email summary (uses GPT-4 or Claude API)
  - Practitioner can edit AI-generated content before sending
  - Email includes next steps and next appointment date
  - Template merge with AI content

#### Technical Tasks
- [ ] Backend: Create `BillingTemplate` and `BillingTemplateItem` models
- [ ] Backend: Create `EmailTemplate` model with versioning
- [ ] Backend: Add `/api/billing-templates` routes (CRUD)
- [ ] Backend: Add `/api/email-templates` routes (CRUD, preview)
- [ ] Backend: Create template variable replacement service (`templateEngine.service.js`)
- [ ] Backend: Create email scheduling service (`emailScheduler.service.js`)
- [ ] Backend: Add cron job for appointment reminders (`cronJobs/appointmentReminders.js`)
- [ ] Backend: Integrate AI API (OpenAI or Anthropic) for follow-up generation
- [ ] Backend: Create `/api/communication/send-reminder` endpoint
- [ ] Backend: Create `/api/communication/generate-followup` endpoint
- [ ] Frontend: Create `BillingTemplatesPage.jsx`
- [ ] Frontend: Create `EmailTemplatesPage.jsx` with WYSIWYG editor (e.g., react-quill)
- [ ] Frontend: Create `InvoiceCustomizationPage.jsx` with logo upload and color picker
- [ ] Frontend: Add "Send Reminder" button to `VisitDetailPage.jsx`
- [ ] Frontend: Add "Generate Follow-up" button with AI loading state
- [ ] Frontend: Create `EmailPreviewModal.jsx` for template testing
- [ ] Migration: `create-templates-tables.js`
- [ ] Migration: `create-communication-tracking-tables.js`
- [ ] Seed: Default email templates (reminder, follow-up, invoice)
- [ ] Tests: Template variable replacement
- [ ] Tests: Email sending simulation

#### BMAD Metrics
- **Build**: 3 default email templates, billing template system
- **Measure**: Email delivery rate (target: >95%), open rate (target: >40%)
- **Analyze**: AI follow-up quality (practitioner edit rate)
- **Decide**: Expand AI features based on adoption

---

### Sprint 6: Advanced Data Visualization (2-3 weeks)
**Theme**: Build analytics dashboards for health, finance, and communication
**BMAD Focus**: Build dashboards + Measure dashboard usage and insights generated

#### User Stories

**US-5.6.1: Health Trends Dashboard** (Priority: MEDIUM)
- **As a practitioner**, I want to see dashboards with key metrics about my patients' health trends
- **Acceptance Criteria**:
  - New "Health Analytics" page with cards for key metrics
  - Patient risk score distribution (based on out-of-range measures)
  - Top 5 most tracked measures (bar chart)
  - Average measure trends across all patients (aggregated line chart)
  - Filter by date range and patient tags
  - Export data as CSV

**US-5.6.2: Financial Metrics Dashboard** (Priority: MEDIUM)
- **As a practitioner**, I want to see dashboards with key financial metrics
- **Acceptance Criteria**:
  - New "Financial Analytics" page
  - Revenue trends (monthly line chart)
  - Outstanding invoices vs paid (pie chart)
  - Payment method breakdown (bar chart)
  - Average invoice amount and payment time
  - Filter by date range and patient
  - Export financial report as Excel

**US-5.6.3: Communication Effectiveness Dashboard** (Priority: LOW)
- **As an admin**, I want to generate reports on communication effectiveness
- **Acceptance Criteria**:
  - New "Communication Analytics" page
  - Email open rate and click rate (if tracking enabled)
  - Appointment reminder effectiveness (no-show rate before/after reminders)
  - Follow-up email sent count
  - Patient engagement score
  - Template performance comparison

**US-5.6.4: Patient Health Score** (Priority: LOW)
- **As a practitioner**, I want to see a health score for each patient
- **Acceptance Criteria**:
  - Health score calculation based on:
    - Measure compliance (% of expected measures logged)
    - Out-of-range measure count
    - Visit frequency
    - Follow-up response rate
  - Score displayed on patient card (color-coded: green/yellow/red)
  - Score history chart
  - Filter patient list by health score

#### Technical Tasks
- [ ] Backend: Create analytics aggregation service (`analytics.service.js`)
- [ ] Backend: Add `/api/analytics/health-trends` endpoint
- [ ] Backend: Add `/api/analytics/financial-metrics` endpoint
- [ ] Backend: Add `/api/analytics/communication-effectiveness` endpoint
- [ ] Backend: Implement health score calculation algorithm
- [ ] Backend: Add cron job for daily health score updates
- [ ] Frontend: Create `HealthAnalyticsPage.jsx` with Recharts
- [ ] Frontend: Create `FinancialAnalyticsPage.jsx` with Recharts
- [ ] Frontend: Create `CommunicationAnalyticsPage.jsx`
- [ ] Frontend: Add health score badge to `PatientCard.jsx`
- [ ] Frontend: Create `HealthScoreChart.jsx` for patient detail page
- [ ] Frontend: Add export buttons (CSV/Excel) using existing export services
- [ ] Migration: `add-health-score-to-patients.js`
- [ ] Tests: Analytics calculations
- [ ] Tests: Health score algorithm

#### BMAD Metrics
- **Build**: 3 analytics pages with 10+ visualizations
- **Measure**: Dashboard page views (target: 30% of users weekly)
- **Analyze**: Most valuable metrics (user survey)
- **Decide**: Expand dashboards or add custom report builder

---

## Risk Assessment & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Formula engine complexity (Sprint 2) | MEDIUM | HIGH | Start with simple operators, expand iteratively; add comprehensive tests |
| Measures data volume performance (Sprint 3-4) | MEDIUM | MEDIUM | Index by patient_id + timestamp; implement pagination; consider TimescaleDB extension |
| AI API rate limits/costs (Sprint 5) | LOW | MEDIUM | Cache AI responses; implement rate limiting; provide manual fallback |
| Email deliverability issues (Sprint 5) | MEDIUM | HIGH | Use reputable SMTP provider (SendGrid/Postmark); implement SPF/DKIM; monitor bounce rates |
| Dashboard query performance (Sprint 6) | MEDIUM | MEDIUM | Pre-aggregate data with cron jobs; implement caching; optimize SQL queries |
| RBAC permission complexity (Sprint 1) | LOW | HIGH | Thorough testing; permission audit tool; rollback mechanism |

---

## Dependencies & Prerequisites

### External Services Needed
- **AI API** (Sprint 5): OpenAI GPT-4 or Anthropic Claude API for follow-up generation
  - Action: Obtain API key, set budget limits
- **Email Service** (Sprint 5): Upgrade Nodemailer to production SMTP (SendGrid, Postmark, AWS SES)
  - Action: Configure DNS records (SPF, DKIM, DMARC)
- **Database** (Sprint 3-4): Consider TimescaleDB extension for time-series optimization (optional)
  - Action: Evaluate SQLite performance with large measure datasets

### Library Additions
- **Sprint 2**: `mathjs` or `expr-eval` for formula parsing
- **Sprint 4**: Recharts already installed (confirmed)
- **Sprint 5**: `node-cron` for scheduling, `react-quill` or `tinymce` for WYSIWYG editor
- **Sprint 6**: `exceljs` already installed (confirmed)

---

## Testing Strategy (Per Sprint)

1. **Unit Tests**: All new service functions (target: 80% coverage)
2. **Integration Tests**: API endpoints with RBAC checks
3. **E2E Tests**: Critical user flows (create measure, send email, view dashboard)
4. **Performance Tests**: Measure queries with 10k+ records, dashboard load time
5. **Security Tests**: RBAC enforcement, formula injection prevention, XSS in templates

---

## BMAD Cycle Integration

Each sprint follows the BMAD methodology:

### Build Phase (Weeks 1-2 of sprint)
- Implement user stories according to acceptance criteria
- Write tests alongside code (TDD where applicable)
- Code reviews and pair programming for complex features
- Daily standups to track progress

### Measure Phase (Week 2-3 of sprint)
- Deploy to staging environment
- Collect usage metrics (define KPIs per sprint)
- Track performance metrics (API response time, database query time)
- Monitor error rates and logs

### Analyze Phase (End of sprint)
- Sprint retrospective meeting
- Review metrics against targets
- Gather user feedback (surveys, interviews)
- Identify pain points and bottlenecks

### Decide Phase (Sprint planning for next sprint)
- Decide on feature adjustments based on data
- Prioritize next sprint backlog
- Adjust timeline if needed
- Document learnings and update sprint plan

---

## Success Metrics (v5.0 Overall)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| RBAC adoption | 100% admins use role management UI | Audit log analysis |
| Calculated fields usage | 50% of practices create at least 1 | Custom field usage stats |
| Measures tracked per patient | Avg 3+ measures per patient | Patient measure count query |
| Chart views | 60% of patient detail visits include chart view | Frontend analytics |
| Email open rate | >40% for reminders | Email tracking service |
| Dashboard usage | 30% of users visit analytics weekly | Page view analytics |
| AI follow-up adoption | 20% of practitioners use feature | AI API call logs |
| System performance | <500ms p95 API response time | APM monitoring |
| User satisfaction | >4.5/5 NPS score for v5.0 features | User survey |

---

## Rollout Plan

### Phase 1: Internal Testing (After Sprint 6)
- Deploy to staging environment
- Internal QA team testing (1 week)
- Fix critical bugs

### Phase 2: Beta Release (Week 13-14)
- Select 3-5 pilot practices
- Provide training materials
- Gather feedback

### Phase 3: General Availability (Week 15+)
- Full release to all users
- Release notes and changelog
- Support team training
- Monitor metrics and support tickets

---

## Documentation Requirements

- [ ] User guide for RBAC management
- [ ] Tutorial for creating calculated fields
- [ ] Video: How to track patient measures
- [ ] Guide: Email template best practices
- [ ] API documentation updates for all new endpoints
- [ ] Migration guide for existing custom fields to calculated fields
- [ ] Admin guide for template management

---

## Next Steps

1. **Immediate**: Review and approve this sprint plan
2. **Week 1**: Sprint 1 kickoff meeting
3. **Ongoing**: Weekly sprint reviews and BMAD cycle check-ins
4. **End of v5.0**: Release retrospective and v6.0 planning

---

**Document Version**: 1.0
**Last Updated**: 2026-01-23
**Approved By**: [Pending approval]
