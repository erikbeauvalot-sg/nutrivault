# Nutrivault v5.0 - Sprint Summary
## Quick Reference Guide

**Branch**: `v5.0-features`
**Duration**: 12-18 weeks (6 sprints)
**Methodology**: BMAD (Build-Measure-Analyze-Decide)

---

## Sprint Timeline Overview

```
Sprint 1 (2w)  Sprint 2 (2w)  Sprint 3 (3w)  Sprint 4 (2-3w) Sprint 5 (3w)  Sprint 6 (2-3w)
┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
│  RBAC UI    ││ Calculated  ││  Measures   ││  Measures   ││ Templates & ││   Advanced  │
│  + UI Fixes ││   Fields    ││  Foundation ││   Advanced  ││   Comms     ││  Analytics  │
└─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘
Week 1-2       Week 3-4       Week 5-7       Week 8-10      Week 11-13     Week 14-16
```

---

## Sprint 1: Foundation & Quick Wins (Weeks 1-2)

### Objectives
- Build RBAC management UI for admin role/permission control
- Deliver immediate UI improvements and bug fixes
- Enable custom fields display in patient list view

### Deliverables
- **RBAC Management Page** - Create, edit, assign roles and permissions
- **UI Cleanup** - Remove birth date from patient views
- **Custom Fields in List** - Show important custom fields as table columns
- **Bug Fix** - Fix "Visites sans notes" alerts to use custom fields

### Success Metrics
- 100% of admins able to manage roles without backend intervention
- Custom field list view adopted by 50%+ of users

---

## Sprint 2: Calculated Fields (Weeks 3-4)

### Objectives
- Extend custom fields with formula calculation capabilities
- Enable automatic calculations (BMI, Age, etc.)
- Build foundation for complex data transformations

### Deliverables
- **Calculated Field Type** - Formula editor with math operators (+, -, *, /, ^)
- **Formula Engine** - Parser and evaluator for safe calculations
- **Common Formulas** - Pre-built BMI and Age formulas
- **Dependency Management** - Auto-recalculation on field changes

### Success Metrics
- 50% of practices create at least 1 calculated field
- <50ms average calculation time

---

## Sprint 3: Measures Tracking Foundation (Weeks 5-7)

### Objectives
- Build new time-series health metrics system
- Enable practitioners to log and track patient measures
- Establish data model for scalable measure storage

### Deliverables
- **Measure Definitions** - Admin page to define custom measures (weight, BP, etc.)
- **Measure Logging** - Quick-add interface from patient/visit pages
- **Data Model** - Efficient time-series storage with indexing
- **Bulk Import** - CSV import for historical data

### Success Metrics
- Average 2-3 measures logged per visit
- Support for 10,000+ measure records with <200ms query time

---

## Sprint 4: Measures Tracking Advanced (Weeks 8-10)

### Objectives
- Add visualization and analytics for measure trends
- Implement calculated measures and alert system
- Enable practitioners to identify health risks

### Deliverables
- **Trend Charts** - Line charts with multiple measures and time ranges
- **Calculated Measures** - Formulas using other measures (e.g., BMI from weight/height)
- **Normal Ranges** - Define min/max values with demographic specificity
- **Alert System** - Notifications for out-of-range critical values

### Success Metrics
- 60% of patient detail page visits include chart view
- Alert false positive rate <10%

---

## Sprint 5: Templates & Patient Communication (Weeks 11-13)

### Objectives
- Build template system for billing and email content
- Enable automated patient communication
- Integrate AI for personalized follow-up emails

### Deliverables
- **Billing Templates** - Reusable service item templates
- **Email Templates** - WYSIWYG editor with variable placeholders
- **Invoice Customization** - Branding with logo and color scheme
- **Appointment Reminders** - Automated scheduling with cron jobs
- **AI Follow-ups** - GPT-4/Claude-generated email summaries from visit notes

### Success Metrics
- Email delivery rate >95%
- Email open rate >40%
- 20% of practitioners adopt AI follow-up feature

---

## Sprint 6: Advanced Data Visualization (Weeks 14-16)

### Objectives
- Build comprehensive analytics dashboards
- Provide insights on health trends, finances, and communication
- Enable data-driven decision making

### Deliverables
- **Health Analytics Dashboard** - Patient risk scores, measure trends, aggregations
- **Financial Analytics Dashboard** - Revenue trends, outstanding invoices, payment breakdowns
- **Communication Analytics** - Email effectiveness, no-show rates, engagement scores
- **Patient Health Score** - Composite score based on compliance and measure ranges

### Success Metrics
- 30% of users visit analytics dashboards weekly
- NPS score >4.5/5 for v5.0 features

---

## Feature Complexity Matrix

| Feature | Complexity | Effort (days) | Dependencies |
|---------|-----------|---------------|--------------|
| RBAC UI | Medium | 5-7 | None |
| UI Updates | Low | 2-3 | Custom fields |
| Bug Fix (Alerts) | Low | 1-2 | Custom fields |
| Calculated Fields | Medium | 6-8 | Custom fields |
| Measures Foundation | High | 10-12 | New data model |
| Measures Advanced | Medium | 8-10 | Measures Foundation |
| Templates | Medium | 7-9 | Billing system |
| Communication | High | 10-14 | Templates, AI API |
| Analytics | Medium | 8-10 | Measures, Comms |

---

## Technical Debt & Risks

### High Priority Risks
1. **Formula Engine Security** - Risk of code injection via formulas
   - Mitigation: Use sandboxed parser (mathjs), validate inputs, limit operators

2. **Email Deliverability** - Risk of emails marked as spam
   - Mitigation: SPF/DKIM setup, use SendGrid/Postmark, monitor bounce rates

3. **Measures Performance** - Risk of slow queries with large datasets
   - Mitigation: Database indexing, pagination, pre-aggregation with cron

### Medium Priority Risks
1. **AI API Costs** - GPT-4 API usage could be expensive
   - Mitigation: Cache responses, rate limiting, provide manual fallback

2. **Dashboard Performance** - Complex analytics queries may slow down
   - Mitigation: Background aggregation jobs, Redis caching

---

## Dependencies & Prerequisites

### Required Before Sprint 5
- [ ] OpenAI or Anthropic API key with budget limits configured
- [ ] Production SMTP service (SendGrid/Postmark/AWS SES)
- [ ] DNS records configured (SPF, DKIM, DMARC)

### Optional Optimizations
- [ ] TimescaleDB extension for time-series data (Sprint 3)
- [ ] Redis for dashboard caching (Sprint 6)

---

## New NPM Dependencies

| Sprint | Package | Purpose |
|--------|---------|---------|
| 2 | mathjs or expr-eval | Formula parsing and evaluation |
| 5 | node-cron | Scheduled tasks (appointment reminders) |
| 5 | react-quill or tinymce | WYSIWYG email template editor |
| 5 | openai or @anthropic-ai/sdk | AI-generated follow-ups |

---

## Database Migrations

| Sprint | Migration | Description |
|--------|-----------|-------------|
| 1 | add-show-in-list-to-custom-fields | Add boolean column for list view display |
| 2 | add-calculated-fields-support | Add formula and dependencies columns |
| 3 | create-measures-tables | Create measure_definitions and patient_measures |
| 4 | add-measure-ranges-and-formulas | Add normal ranges and calculated measures |
| 5 | create-templates-tables | Create billing_templates and email_templates |
| 5 | create-communication-tracking-tables | Track sent emails and reminders |
| 6 | add-health-score-to-patients | Add health_score column to patients table |

---

## Testing Strategy

### Unit Tests (Per Sprint)
- Service layer functions (target: 80% coverage)
- Formula evaluation edge cases
- Alert generation logic
- Template variable replacement

### Integration Tests
- API endpoints with RBAC enforcement
- Email sending workflows
- Measure CRUD operations
- Dashboard data aggregation

### E2E Tests (Critical Flows)
1. Admin creates role and assigns permissions
2. Practitioner logs measure and views trend chart
3. System sends appointment reminder email
4. User generates financial report and exports CSV

### Performance Tests
- Measure queries with 10,000+ records (<200ms)
- Dashboard load time (<2s)
- Formula calculation (<50ms per field)

---

## BMAD Checkpoints

### Build Phase (Weeks 1-2 of each sprint)
- Daily standups (15 min)
- Code reviews (all PRs)
- Pair programming for complex features

### Measure Phase (Week 2-3)
- Deploy to staging
- Collect usage metrics (custom KPIs per sprint)
- Monitor performance (API response time, error rates)

### Analyze Phase (End of sprint)
- Sprint retrospective (1 hour)
- Review metrics vs targets
- User feedback surveys

### Decide Phase (Sprint planning)
- Adjust next sprint based on learnings
- Re-prioritize backlog
- Document decisions

---

## Rollout Timeline

```
Week 16-17: Internal QA Testing
Week 18-19: Beta Release (3-5 pilot practices)
Week 20+:   General Availability
```

---

## Success Criteria for v5.0 Release

- [ ] All 6 sprints completed and tested
- [ ] User satisfaction (NPS) >4.5/5
- [ ] System performance <500ms p95 API response time
- [ ] Zero critical bugs in production
- [ ] Documentation complete (user guides, API docs, tutorials)
- [ ] Beta user feedback incorporated

---

## Quick Start - Sprint 1

### Week 1 Tasks
1. Create `RolesManagementPage.jsx` and `RoleModal.jsx`
2. Add `show_in_list` column to custom_field_definitions table
3. Update patient list to render custom field columns
4. Fix alerts query for visits without custom fields

### Week 2 Tasks
1. Remove birth date from patient views
2. Add RBAC audit logging
3. Test role assignment workflow
4. Sprint 1 retrospective and Sprint 2 planning

---

**Ready to start Sprint 1?** Review the detailed plan in `SPRINT_PLANNING_V5.md` and kick off with the team!
