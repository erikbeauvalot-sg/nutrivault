# Sprint 5 - Templates & Communication - KICKOFF

**Sprint**: Sprint 5
**Theme**: Build template system and patient communication automation
**Duration**: 3 weeks
**Start Date**: 2026-01-25
**Status**: 🚀 IN PROGRESS

---

## Executive Summary

Sprint 5 builds the template and communication infrastructure for NutriVault, enabling:
- **Email template system** with variable substitution
- **Billing templates** for common services
- **Automated appointment reminders** via scheduled emails
- **Invoice customization** with branding and signatures
- **AI-generated follow-up emails** for patient engagement

This sprint delivers significant practitioner workflow improvements and patient engagement automation.

---

## Sprint 4 Completion Status ✅

**All 4 User Stories Delivered**:
- ✅ US-5.4.1: Trend Visualization with Charts
- ✅ US-5.4.2: Calculated Measures
- ✅ US-5.4.3: Normal Ranges & Alerts
- ✅ US-5.4.4: Visit-Linked Measures (delivered early in Sprint 3)

**Sprint 4 Metrics**:
- 58 files changed
- 12,500+ lines of code
- 38 unit tests (100% passing)
- 240 translation keys (EN/FR)
- <500ms page load performance
- 9 comprehensive documentation files

**Production Deployment**: Scheduled for 2026-01-26

---

## Sprint 5 User Stories

### Priority Breakdown

| Priority | User Story | Complexity |
|----------|------------|------------|
| **HIGH** | US-5.5.4: Appointment Reminders | Medium |
| **MEDIUM** | US-5.5.1: Billing Templates | Medium |
| **MEDIUM** | US-5.5.2: Email Templates | Medium |
| **MEDIUM** | US-5.5.3: Invoice Template Customization | Medium |
| **MEDIUM** | US-5.5.6: Email Template Multi-Language Support | Medium |
| **LOW** | US-5.5.5: AI-Generated Follow-ups | High |

### Implementation Order

**Recommended sequence based on dependencies**:

1. **US-5.5.2: Email Templates** (Foundation)
   - Build email template system first
   - Required by US-5.5.4 and US-5.5.5
   - Estimated: 1 week

2. **US-5.5.4: Appointment Reminders** (Highest Business Value)
   - Uses email templates from US-5.5.2
   - High priority for practitioners
   - Estimated: 1 week

3. **US-5.5.1: Billing Templates** (Parallel Track)
   - Independent of email system
   - Can run in parallel with US-5.5.4
   - Estimated: 4-5 days

4. **US-5.5.3: Invoice Template Customization**
   - Extends billing templates
   - Can start after US-5.5.1
   - Estimated: 3-4 days

5. **US-5.5.6: Email Template Multi-Language Support** (Future Enhancement)
   - Extends email templates from US-5.5.2
   - Uses existing MeasureTranslation pattern
   - Can be implemented after US-5.5.2
   - Estimated: 2.5 days

6. **US-5.5.5: AI-Generated Follow-ups** (Optional Enhancement)
   - Uses email templates from US-5.5.2
   - Lowest priority
   - Estimated: 5-6 days

---

## User Story Details

### US-5.5.1: Billing Templates (MEDIUM)

**As an admin**, I want to create and manage billing templates for different services

**Acceptance Criteria**:
- New entity "Billing Template" with name, description, default amount
- Template fields: service items (name, quantity, unit price)
- Apply template when creating invoice (pre-fills items)
- Template library page for CRUD operations
- Clone template feature

**Business Value**:
- Faster invoice creation
- Consistency in billing
- Reduced data entry errors

---

### US-5.5.2: Email Templates (MEDIUM)

**As an admin**, I want to create and manage email templates for patient communications

**Acceptance Criteria**:
- New entity "Email Template" with name, subject, body (HTML + plain text)
- Variable placeholders: `{{patient_name}}`, `{{appointment_date}}`, `{{dietitian_name}}`, etc.
- Template categories: Appointment Reminder, Follow-up, Invoice, General
- WYSIWYG editor for HTML email design
- Preview mode with sample data
- Template versioning (track changes)

**Business Value**:
- Consistent patient communication
- Personalized emails at scale
- Time savings on repetitive emails

---

### US-5.5.3: Invoice Template Customization (MEDIUM)

**As a practitioner**, I want to customize invoice templates with my branding and signature

**Acceptance Criteria**:
- Upload logo image (PNG/JPG)
- Custom color scheme (primary color picker)
- Footer text with signature
- Contact info fields (address, phone, email, website)
- Preview invoice before generating PDF
- Save as user-specific template override

**Business Value**:
- Professional branded invoices
- Practitioner identity in communications
- Client trust and recognition

---

### US-5.5.4: Appointment Reminders (HIGH)

**As a practitioner**, I want to send automated appointment reminders to patients via email

**Acceptance Criteria**:
- Configure reminder timing (e.g., 24 hours before, 1 week before)
- Auto-send using visit schedule (cron job)
- Use email template for reminder content
- Track sent reminders (timestamp, status)
- Manual send option from visit page
- Unsubscribe link in footer

**Business Value**:
- Reduced no-show rates
- Improved patient engagement
- Automated workflow (time savings)

---

### US-5.5.5: AI-Generated Follow-ups (LOW)

**As a practitioner**, I want to send follow-up emails with AI-generated conclusions

**Acceptance Criteria**:
- "Generate Follow-up" button on visit detail page
- AI analyzes visit notes (chief_complaint, assessment, recommendations)
- Generates personalized email summary (uses GPT-4 or Claude API)
- Practitioner can edit AI-generated content before sending
- Email includes next steps and next appointment date
- Template merge with AI content

**Business Value**:
- Personalized patient follow-ups at scale
- Improved patient understanding and compliance
- Reduced practitioner documentation burden

---

### US-5.5.6: Email Template Multi-Language Support (MEDIUM)

**As an admin**, I want email templates to support multiple languages so patients receive emails in their preferred language

**Acceptance Criteria**:
- Email template content (subject, body_html, body_text) can be translated into multiple languages
- Leverage existing MeasureTranslation pattern for consistency
- Translation management UI accessible from Email Templates page
- Automatic language selection based on patient.language_preference
- Fallback to default language if translation not available
- Preview templates in any available language
- Support standard language codes (en, fr, es, nl, de, etc.)

**Business Value**:
- Improved patient experience for multilingual populations
- Professional localized communication
- Automated language selection (no manual switching)
- Regulatory compliance for multilingual patient communication

**Dependencies**:
- US-5.5.2: Email Templates (COMPLETED ✅)

**Detailed Specification**: See `frontend/US-5.5.6-email-template-translations.md`

---

## Technical Architecture

### New Database Tables

1. **email_templates**
   - id, name, category, subject, body_html, body_plain, variables, version, is_active
   - Indexes: (category, is_active), (name)

2. **billing_templates**
   - id, name, description, is_default, is_active
   - Relationships: hasMany BillingTemplateItems

3. **billing_template_items**
   - id, billing_template_id, item_name, quantity, unit_price, sort_order

4. **invoice_customizations**
   - id, user_id, logo_url, primary_color, footer_text, contact_info (JSON)
   - Relationships: belongsTo User

5. **communication_log**
   - id, patient_id, visit_id, template_id, type, sent_at, delivered_at, opened_at, status
   - Indexes: (patient_id, sent_at), (visit_id, type)

### New Backend Services

1. **templateEngine.service.js**
   - Variable replacement: `{{variable}}` → actual value
   - Functions: `renderTemplate(template, variables)`

2. **emailScheduler.service.js**
   - Schedule reminder emails
   - Functions: `scheduleReminder(visit, timing)`, `sendScheduledEmails()`

3. **aiFollowup.service.js**
   - AI integration (OpenAI or Anthropic)
   - Functions: `generateFollowupEmail(visit, customFields)`

### New Frontend Components

1. **EmailTemplatesPage.jsx** - Template library management
2. **EmailTemplateModal.jsx** - WYSIWYG editor for templates
3. **BillingTemplatesPage.jsx** - Billing template library
4. **InvoiceCustomizationPage.jsx** - Branding configuration
5. **EmailPreviewModal.jsx** - Template preview with sample data
6. **SendReminderButton.jsx** - Manual reminder trigger from visit page
7. **GenerateFollowupButton.jsx** - AI follow-up generation

### External Dependencies

**Required**:
- Production SMTP service (SendGrid, Postmark, or AWS SES)
- DNS configuration (SPF, DKIM, DMARC records)

**Optional**:
- AI API (OpenAI GPT-4 or Anthropic Claude) for US-5.5.5
- Image storage service (S3 or local filesystem) for invoice logos

---

## BMAD Metrics for Sprint 5

### Build Phase Targets
- ✅ 5 user stories implemented
- ✅ Email template system with 3+ default templates
- ✅ Billing template system with common services
- ✅ Cron job for appointment reminders
- ✅ AI integration (optional)

### Measure Phase Targets
- **Email Delivery Rate**: >95% (target)
- **Email Open Rate**: >40% (industry standard)
- **No-Show Rate Reduction**: -20% (before/after reminders)
- **Template Usage**: 70% of emails use templates
- **AI Adoption**: 20% of practitioners try AI follow-ups

### Analyze Phase
- User feedback on template editor usability
- Email deliverability issues and bounce rates
- Most popular template categories
- AI-generated content quality (edit rate)

### Decide Phase
- Expand template variables based on requests
- Refine AI prompts based on practitioner edits
- Adjust reminder timing based on no-show data

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email deliverability issues | MEDIUM | HIGH | Use reputable SMTP provider; implement SPF/DKIM; monitor bounce rates |
| AI API rate limits/costs | LOW | MEDIUM | Cache AI responses; implement rate limiting; provide manual fallback |
| WYSIWYG editor complexity | MEDIUM | MEDIUM | Use established library (react-quill/tinymce); provide plain text fallback |
| Template variable complexity | LOW | LOW | Start with simple variables; expand iteratively |
| Cron job failures | LOW | MEDIUM | Implement retry logic; monitor job execution logs |

---

## Testing Strategy

### Unit Tests
- Template variable replacement logic
- Email scheduling algorithm
- AI prompt generation
- Billing template calculations

### Integration Tests
- Email sending simulation (test SMTP)
- Cron job execution
- Template CRUD operations
- AI API integration (mocked)

### E2E Tests
- Create email template → send reminder → verify delivery
- Create billing template → apply to invoice → verify pre-fill
- Generate AI follow-up → edit → send → verify content

### Performance Tests
- Template rendering with 100+ variables
- Bulk reminder sending (100+ emails)
- Database queries for communication log

---

## Success Criteria

Sprint 5 is considered successful if:

- ✅ All 5 user stories meet acceptance criteria
- ✅ Email templates system functional with WYSIWYG editor
- ✅ Appointment reminders sending automatically
- ✅ Billing templates reduce invoice creation time by 50%
- ✅ Email delivery rate >95%
- ✅ Zero critical bugs in production
- ✅ All features have EN/FR translations
- ✅ Comprehensive documentation delivered

---

## Documentation Deliverables

1. **User Guides**:
   - Email Templates User Guide
   - Appointment Reminders Configuration Guide
   - Billing Templates User Guide
   - Invoice Customization Guide
   - AI Follow-ups Best Practices (if implemented)

2. **Technical Documentation**:
   - Template Engine API Reference
   - Email Scheduler Design Document
   - Communication Log Schema
   - AI Integration Guide

3. **Completion Reports**:
   - US-5.5.1-COMPLETED.md ✅
   - US-5.5.2-COMPLETED.md ✅
   - US-5.5.3-COMPLETED.md
   - US-5.5.4-COMPLETED.md ✅
   - US-5.5.6-COMPLETED.md (future sprint)
   - US-5.5.5-COMPLETED.md (optional)
   - SPRINT_5_COMPLETION_SUMMARY.md

---

## Git Workflow

**Branch Strategy**:
- Main branch: `main`
- Sprint branch: `sprint-5-templates-communication`
- Feature branches:
  - `feature/US-5.5.1-billing-templates` ✅
  - `feature/US-5.5.2-email-templates` ✅
  - `feature/US-5.5.3-invoice-customization`
  - `feature/US-5.5.4-appointment-reminders` ✅
  - `feature/US-5.5.6-email-template-translations` (future)
  - `feature/US-5.5.5-ai-followups` (optional)

**Merge Strategy**:
- Feature branches merge to sprint branch after review
- Sprint branch merges to main after sprint completion
- All merges require passing tests

---

## Timeline

### Week 1 (Days 1-7)
- **Days 1-3**: US-5.5.2 (Email Templates) - Foundation
- **Days 4-5**: Start US-5.5.1 (Billing Templates)
- **Days 6-7**: Complete US-5.5.1

### Week 2 (Days 8-14)
- **Days 8-10**: US-5.5.4 (Appointment Reminders) - HIGH priority
- **Days 11-12**: US-5.5.3 (Invoice Customization)
- **Days 13-14**: Testing and bug fixes

### Week 3 (Days 15-21)
- **Days 15-17**: US-5.5.5 (AI Follow-ups) - Optional
- **Days 18-19**: Integration testing and documentation
- **Days 20-21**: Sprint review, BMAD analysis, deployment prep

---

## Next Actions

1. ✅ Create Sprint 5 kickoff document (this file)
2. ✅ **COMPLETED**: US-5.5.2 (Email Templates)
3. ✅ **COMPLETED**: US-5.5.4 (Appointment Reminders)
4. ✅ **COMPLETED**: US-5.5.1 (Billing Templates)
5. ⏳ Implement US-5.5.3 (Invoice Customization)
6. ⏳ Implement US-5.5.6 (Email Template Translations) - Future sprint
7. ⏳ Evaluate US-5.5.5 (AI Follow-ups) - Optional
8. ⏳ Sprint completion and documentation

---

## Team Communication

**Daily Standups**: 9:00 AM (15 min)
- What did I complete yesterday?
- What am I working on today?
- Any blockers?

**Sprint Review**: End of Week 3
- Demo all features to stakeholders
- Gather feedback
- BMAD analysis

**Retrospective**: After sprint review
- What went well?
- What could be improved?
- Action items for Sprint 6

---

**Document Created**: 2026-01-25
**Created By**: Claude Code
**Status**: Sprint 5 Active
**Next Sprint**: Sprint 6 - Advanced Data Visualization

---

**Ready to begin US-5.5.2 (Email Templates)** 🚀
