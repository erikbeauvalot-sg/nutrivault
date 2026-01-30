# BMAD Workflow - Nutrivault v5.0
## Build-Measure-Analyze-Decide Methodology

**Status**: ✅ Initialized
**Current Sprint**: Sprint 1 (Foundation & Quick Wins)
**Methodology**: BMAD Iterative Development

---

## What is BMAD?

BMAD (Build-Measure-Analyze-Decide) is an iterative development methodology that emphasizes:

1. **BUILD** - Develop features with clear acceptance criteria
2. **MEASURE** - Collect data on usage, performance, and user satisfaction
3. **ANALYZE** - Review metrics and gather insights from data
4. **DECIDE** - Make informed decisions for next iteration based on analysis

This creates a continuous feedback loop that ensures we're building the right features in the right way.

---

## BMAD Cycle for Nutrivault v5.0

```
┌─────────────────────────────────────────────────────────────────┐
│                      BMAD CYCLE (Per Sprint)                     │
└─────────────────────────────────────────────────────────────────┘

Week 1-2: BUILD Phase
┌──────────────────────────────────────┐
│ • Sprint planning meeting            │
│ • Feature development (TDD)          │
│ • Daily standups (15min)             │
│ • Code reviews                       │
│ • Unit & integration tests           │
│ • Documentation updates              │
└──────────────────────────────────────┘
           ↓
Week 2: MEASURE Phase
┌──────────────────────────────────────┐
│ • Deploy to staging                  │
│ • Enable analytics tracking          │
│ • Monitor performance metrics        │
│ • Collect user interaction data      │
│ • Track API response times           │
│ • Monitor error rates                │
└──────────────────────────────────────┘
           ↓
Week 2-3: ANALYZE Phase
┌──────────────────────────────────────┐
│ • Sprint retrospective (1 hour)      │
│ • Review metrics vs targets          │
│ • Analyze user feedback              │
│ • Identify pain points               │
│ • Document learnings                 │
│ • Update risk assessment             │
└──────────────────────────────────────┘
           ↓
Week 3: DECIDE Phase
┌──────────────────────────────────────┐
│ • Prioritize next sprint backlog     │
│ • Adjust features based on feedback  │
│ • Update timeline if needed          │
│ • Plan resource allocation           │
│ • Next sprint kickoff                │
└──────────────────────────────────────┘
           ↓
      (Repeat for next sprint)
```

---

## Current Sprint 1 Workflow

### Phase 1: BUILD (Week 1-2) - IN PROGRESS

**Sprint Goals**:
1. ✅ Build RBAC Management UI for admin control
2. ✅ Deliver UI improvements (remove birth date, add custom fields to list)
3. ✅ Fix critical bug (alerts for visits without notes)

**Task Breakdown** (7 tasks total):

#### Development Tasks (Tasks 1-4)
- **Task #1**: RBAC Management UI (US-5.1.1) - `pending`
  - Frontend: `RolesManagementPage.jsx`, `RoleModal.jsx`
  - Backend: Test existing endpoints
  - Priority: HIGH

- **Task #2**: Remove Birth Date from Patient Views (US-5.1.2) - `pending`
  - Update: `PatientsPage.jsx`, `PatientCard.jsx`, `PatientDetailPage.jsx`
  - Priority: HIGH

- **Task #3**: Custom Fields in Patient List View (US-5.1.3) - `pending`
  - Backend: Migration + model update
  - Frontend: Dynamic column rendering
  - Priority: HIGH

- **Task #4**: Fix Alerts - Visits Without Custom Fields (US-5.1.4) - `pending`
  - Backend: Update `alert.service.js`
  - Frontend: Update `AlertsWidget.jsx`
  - Priority: HIGH (BUG FIX)

#### BMAD Process Tasks (Tasks 5-7)
- **Task #5**: BMAD Measure Phase - `pending` (blocked by tasks 1-4)
  - Deploy to staging
  - Enable analytics
  - Collect metrics

- **Task #6**: BMAD Analyze Phase - `pending` (blocked by task 5)
  - Sprint retrospective
  - Metrics review
  - User feedback analysis

- **Task #7**: BMAD Decide Phase - `pending` (blocked by task 6)
  - Sprint 2 planning
  - Backlog prioritization
  - Resource allocation

---

## Metrics to Track (Per Sprint)

### Sprint 1 Specific Metrics

| Metric | Target | How to Measure | Status |
|--------|--------|----------------|--------|
| RBAC UI adoption | 100% of admins | Analytics: /settings/roles page views | 🔄 Pending |
| Custom fields in list adoption | 50% of practices | Count of custom fields with `show_in_list=true` | 🔄 Pending |
| Alert fix effectiveness | 80% reduction in support tickets | Compare tickets before/after fix | 🔄 Pending |
| API response time | <500ms p95 | APM monitoring for /patients endpoint | 🔄 Pending |
| Error rate | <1% | Error tracking service (Sentry or similar) | 🔄 Pending |
| User satisfaction | >4/5 rating | Post-sprint user survey | 🔄 Pending |

### Global v5.0 Metrics (Tracked Across All Sprints)

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| Overall NPS score | >4.5/5 | - | - |
| Performance (p95) | <500ms | - | - |
| Test coverage | >80% | - | - |
| Production incidents | <2 per sprint | - | - |
| Sprint velocity | Stable ±10% | - | - |

---

## Daily Standup Format (BUILD Phase)

**Time**: 9:00 AM (15 minutes max)
**Attendees**: Development team

**Each team member answers**:
1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or issues?

**Action Items**:
- Update task status in real-time
- Flag blockers for immediate resolution
- Keep standup focused and time-boxed

---

## Sprint Retrospective Format (ANALYZE Phase)

**Time**: 1 hour at end of sprint
**Attendees**: Full team (devs, PM, QA, stakeholders)

**Agenda**:
1. **What went well?** (15 min)
   - Celebrate successes
   - Identify best practices to continue

2. **What could be improved?** (20 min)
   - Discuss challenges and pain points
   - Focus on processes, not people

3. **Action items** (15 min)
   - Concrete steps to improve next sprint
   - Assign owners and deadlines

4. **Metrics review** (10 min)
   - Compare actual vs target metrics
   - Discuss surprises or anomalies

**Deliverable**: Retrospective notes document with action items

---

## Sprint Planning Format (DECIDE Phase)

**Time**: 2 hours at start of sprint
**Attendees**: Full team

**Agenda**:
1. **Review previous sprint** (15 min)
   - Velocity and burndown
   - Completed vs planned work

2. **Review product backlog** (30 min)
   - Prioritize user stories for next sprint
   - Clarify acceptance criteria

3. **Capacity planning** (15 min)
   - Team availability
   - Account for holidays, vacations

4. **Task breakdown** (45 min)
   - Break user stories into technical tasks
   - Estimate effort (t-shirt sizing or story points)
   - Identify dependencies

5. **Sprint commitment** (15 min)
   - Confirm sprint goal
   - Lock sprint backlog

**Deliverable**: Sprint backlog with committed user stories

---

## Risk Management Process

### Risk Categories
1. **Technical Risks** - Architecture, performance, security
2. **Resource Risks** - Team capacity, dependencies
3. **External Risks** - Third-party APIs, infrastructure
4. **User Adoption Risks** - Feature complexity, training needs

### Risk Review Cadence
- **Weekly**: Review high-priority risks in standup
- **Sprint End**: Update risk register in retrospective
- **Sprint Start**: Review risk mitigation strategies in planning

### Current Sprint 1 Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| RBAC UI complexity causes delays | MEDIUM | HIGH | Start with MVP, iterate based on feedback | Dev Lead |
| Custom field list performance issues | LOW | MEDIUM | Add pagination, limit to 5 columns max | Backend Dev |
| Alert fix breaks existing functionality | LOW | HIGH | Comprehensive testing, feature flag | QA Lead |

---

## Definition of Done (DoD)

A task is "Done" when:
- [ ] Code written and follows style guide
- [ ] Unit tests written (80%+ coverage for new code)
- [ ] Integration tests pass
- [ ] Code reviewed and approved by peer
- [ ] Acceptance criteria met (validated by PM/PO)
- [ ] Documentation updated (API docs, user guide)
- [ ] Deployed to staging environment
- [ ] No critical bugs or regressions
- [ ] i18n translations added (FR + EN)
- [ ] Responsive design tested (mobile, tablet, desktop)

---

## Communication Channels

### Synchronous Communication
- **Daily Standups**: 9:00 AM (15 min)
- **Sprint Planning**: First Monday of sprint (2 hours)
- **Sprint Retrospective**: Last Friday of sprint (1 hour)
- **Pair Programming**: As needed for complex features

### Asynchronous Communication
- **Slack**:
  - `#nutrivault-dev` - Development discussions
  - `#nutrivault-qa` - Testing and QA
  - `#nutrivault-announcements` - Important updates
- **GitHub**:
  - Pull request reviews
  - Issue tracking
  - Code comments
- **Documentation**:
  - Sprint planning docs (this repo)
  - Confluence/Notion for detailed specs

---

## Tools & Infrastructure

### Development Tools
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions (to be configured)
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest (backend), React Testing Library (frontend), Cypress (E2E)

### Monitoring & Analytics (MEASURE Phase)
- **Performance Monitoring**: APM tool (New Relic, Datadog, or similar)
- **Error Tracking**: Sentry or similar
- **User Analytics**: Google Analytics or Mixpanel
- **Custom Metrics**: Backend logging + dashboard

### Collaboration Tools
- **Project Management**: GitHub Projects or Jira
- **Design**: Figma (mockups and prototypes)
- **Documentation**: Markdown files in repo + Confluence

---

## Sprint 1 Success Criteria

Sprint 1 is considered successful if:
- [ ] All 4 development tasks (US-5.1.1 to US-5.1.4) completed
- [ ] All acceptance criteria met and validated
- [ ] Deployed to staging without critical bugs
- [ ] Performance targets met (<500ms p95 for /patients)
- [ ] Zero production incidents from Sprint 1 features
- [ ] Positive feedback from beta users (>3.5/5 rating)

If success criteria not met:
- Conduct extended retrospective to identify root causes
- Adjust Sprint 2 scope to address issues
- Consider additional QA resources

---

## Next Steps

### Immediate Actions (This Week)
1. **Assign Tasks**: Distribute tasks 1-4 to team members
2. **Create Feature Branches**:
   - `feature/US-5.1.1-rbac-ui`
   - `feature/US-5.1.2-ui-cleanup`
   - `feature/US-5.1.3-custom-fields-list`
   - `feature/US-5.1.4-fix-alerts`
3. **Set Up Monitoring**: Configure analytics and APM for staging
4. **Daily Standups**: Start tomorrow at 9:00 AM

### Week 2 Actions
1. Complete development and testing
2. Deploy to staging (Task #5)
3. Begin collecting metrics
4. Prepare for retrospective

### Week 3 Actions
1. Sprint retrospective (Task #6)
2. Sprint 2 planning (Task #7)
3. Begin Sprint 2 development

---

## BMAD Workflow Checklist

### ✅ Completed
- [x] Sprint 1 planning document created
- [x] Tasks created with dependencies
- [x] BMAD workflow initialized
- [x] v5.0-features branch created
- [x] Success criteria defined

### 🔄 In Progress
- [ ] Task #1: RBAC Management UI
- [ ] Task #2: Remove Birth Date
- [ ] Task #3: Custom Fields in List
- [ ] Task #4: Fix Alerts

### 📋 Upcoming
- [ ] Deploy to staging (Task #5)
- [ ] Collect metrics (Task #5)
- [ ] Sprint retrospective (Task #6)
- [ ] Sprint 2 planning (Task #7)

---

## Quick Reference Commands

```bash
# Switch to v5.0 branch
git checkout v5.0-features

# Create feature branch
git checkout -b feature/US-5.1.1-rbac-ui

# Run tests
cd backend && npm test
cd frontend && npm test

# Start dev servers
cd backend && npm run dev
cd frontend && npm run dev

# Deploy to staging
npm run deploy:staging

# Check task status
/tasks
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | Claude | Initial BMAD workflow setup for Sprint 1 |

---

**Ready to start?** Update task #1 to `in_progress` when you begin development!
