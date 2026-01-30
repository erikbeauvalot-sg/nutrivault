# Nutrivault v5.0 - Documentation Index

Welcome to Nutrivault v5.0 development! This index helps you navigate all v5.0 documentation.

---

## 📚 Documentation Structure

### 🎯 Planning Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[Spec Nutrivault v5.md](./Spec%20Nutrivault%20v5.md)** | Original feature specifications | Reference for requirements and user stories |
| **[SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md)** | Detailed sprint planning (593 lines) | Deep dive into user stories, technical tasks, risks |
| **[SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md)** | Quick reference summary (302 lines) | Timeline, metrics, dependencies overview |

### 🚀 Development Guides

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[V5_README.md](./V5_README.md)** | Developer getting started guide | Setup environment, understand workflow |
| **[BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md)** | BMAD methodology guide | Understand process, track tasks, run meetings |
| **[V5_INDEX.md](./V5_INDEX.md)** | This document | Find the right documentation |

---

## 🗓️ Sprint Overview

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│  Sprint 1    │  Sprint 2    │  Sprint 3    │  Sprint 4    │  Sprint 5    │  Sprint 6    │
│  (2 weeks)   │  (2 weeks)   │  (3 weeks)   │  (2-3 weeks) │  (3 weeks)   │  (2-3 weeks) │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ ✅ RBAC UI   │ Calculated   │ Measures     │ Measures     │ Templates &  │ Advanced     │
│ ✅ UI Fixes  │ Fields       │ Foundation   │ Advanced     │ Communication│ Analytics    │
│ ✅ Bug Fix   │              │              │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
 Week 1-2       Week 3-4       Week 5-7       Week 8-10      Week 11-13     Week 14-16
```

**Current Sprint**: 🎯 Sprint 1 - Foundation & Quick Wins

---

## 📋 Current Tasks (Sprint 1)

| ID | Task | Status | Priority | Blocked By |
|----|------|--------|----------|------------|
| #1 | RBAC Management UI (US-5.1.1) | `pending` | HIGH | - |
| #2 | Remove Birth Date (US-5.1.2) | `pending` | HIGH | - |
| #3 | Custom Fields in List (US-5.1.3) | `pending` | HIGH | - |
| #4 | Fix Alerts Bug (US-5.1.4) | `pending` | HIGH | - |
| #5 | BMAD Measure - Deploy to Staging | `pending` | MEDIUM | #1-4 |
| #6 | BMAD Analyze - Retrospective | `pending` | MEDIUM | #5 |
| #7 | BMAD Decide - Sprint 2 Planning | `pending` | MEDIUM | #6 |

**View all tasks**: Run `/tasks` command or see [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md)

---

## 🎯 Quick Links by Role

### 👨‍💼 Product Manager / Project Lead
Start here:
1. [Spec Nutrivault v5.md](./Spec%20Nutrivault%20v5.md) - Original requirements
2. [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) - Timeline and metrics
3. [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) - Process and meetings

**Key Questions**:
- What features are we building? → [SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md) § User Stories
- What's the timeline? → [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) § Sprint Timeline
- How do we measure success? → [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) § Metrics

---

### 👨‍💻 Developer
Start here:
1. [V5_README.md](./V5_README.md) - Setup and development workflow
2. [SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md) - Technical tasks
3. [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) - Daily standup and DoD

**Key Questions**:
- How do I start developing? → [V5_README.md](./V5_README.md) § Quick Start
- What should I build? → [SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md) § Sprint 1 Technical Tasks
- What's my task? → [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) § Current Sprint 1 Workflow

---

### 🧪 QA / Tester
Start here:
1. [SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md) - Acceptance criteria
2. [V5_README.md](./V5_README.md) - Testing commands
3. [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) - Testing strategy

**Key Questions**:
- What are acceptance criteria? → [SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md) § User Stories
- How do I run tests? → [V5_README.md](./V5_README.md) § Testing Commands
- What's the test strategy? → [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) § Testing Strategy

---

### 📊 Stakeholder / Exec
Start here:
1. [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) - Executive summary
2. [Spec Nutrivault v5.md](./Spec%20Nutrivault%20v5.md) - Feature overview
3. [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) - Success metrics

**Key Questions**:
- What's being built? → [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) § Feature Areas
- When will it be done? → [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) § Rollout Timeline
- How do we measure success? → [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) § Sprint 1 Metrics

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite + React Bootstrap
- **Backend**: Express.js + Sequelize ORM
- **Database**: SQLite (with potential TimescaleDB for measures)
- **Auth**: JWT + RBAC with 21 permissions
- **Testing**: Jest + React Testing Library + Cypress

### Key Systems (Current Implementation)
- ✅ RBAC System (4 roles, 21 permissions)
- ✅ Custom Fields (6 types, category-based, i18n)
- ✅ Patient/Visit Management
- ✅ Billing System
- ✅ Document Management
- ✅ Reports & Analytics

### New Systems (v5.0)
- 🆕 RBAC UI Management
- 🆕 Calculated Custom Fields
- 🆕 Measures Tracking (time-series)
- 🆕 Template System (billing + email)
- 🆕 Patient Communication Automation
- 🆕 Advanced Analytics Dashboards

---

## 📊 Success Metrics Dashboard

### Sprint 1 Targets

| Metric | Target | Status |
|--------|--------|--------|
| RBAC UI Adoption | 100% of admins | 🔄 Not started |
| Custom Fields in List | 50% of practices | 🔄 Not started |
| Alert Fix Effectiveness | 80% ticket reduction | 🔄 Not started |
| API Performance | <500ms p95 | 🔄 Not started |
| Error Rate | <1% | 🔄 Not started |
| User Satisfaction | >4/5 | 🔄 Not started |

### v5.0 Overall Targets

| Metric | Target |
|--------|--------|
| Overall NPS | >4.5/5 |
| Test Coverage | >80% |
| Performance (p95) | <500ms |
| Production Incidents | <2 per sprint |

---

## 🔗 External Resources

### Design & Prototyping
- Figma Mockups: [Link TBD]
- Component Library (Storybook): Run `npm run storybook`

### Documentation
- API Documentation: `backend/docs/API.md`
- Database Schema: `backend/docs/DATABASE_SCHEMA.md`

### Communication
- Slack: `#nutrivault-dev` (development), `#nutrivault-qa` (testing)
- GitHub: [Repository URL]

---

## 🚀 Getting Started Checklist

### First Time Setup
- [ ] Read [Spec Nutrivault v5.md](./Spec%20Nutrivault%20v5.md) for feature overview
- [ ] Review [SPRINT_SUMMARY_V5.md](./SPRINT_SUMMARY_V5.md) for timeline
- [ ] Follow [V5_README.md](./V5_README.md) to set up dev environment
- [ ] Understand [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) process

### Starting Development
- [ ] Checkout `v5.0-features` branch
- [ ] Install dependencies (`npm install`)
- [ ] Run migrations (`npm run migrate`)
- [ ] Create feature branch (see naming convention in V5_README)
- [ ] Pick a task from [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md)
- [ ] Update task status to `in_progress`

### Daily Workflow
- [ ] Attend daily standup (9:00 AM)
- [ ] Update task progress
- [ ] Submit PR when feature complete
- [ ] Review peers' PRs

---

## 📅 Important Dates

| Date | Event | Details |
|------|-------|---------|
| 2026-01-23 | Sprint 1 Start | BMAD workflow initialized |
| Week 1-2 | BUILD Phase | Development of US-5.1.1 to US-5.1.4 |
| Week 2 | MEASURE Phase | Deploy to staging, collect metrics |
| End Week 2 | ANALYZE Phase | Sprint 1 retrospective |
| Week 3 | DECIDE Phase | Sprint 2 planning |
| Week 3-4 | Sprint 2 | Calculated Fields development |
| Week 16-17 | Internal QA | Full v5.0 testing |
| Week 18-19 | Beta Release | 3-5 pilot practices |
| Week 20+ | General Availability | Full rollout |

---

## ❓ FAQ

### Where do I find the original requirements?
See [Spec Nutrivault v5.md](./Spec%20Nutrivault%20v5.md)

### How do I know what to work on?
Check [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) § Current Sprint 1 Workflow for task assignments

### What's the development workflow?
See [V5_README.md](./V5_README.md) § Sprint 1 Development Workflow

### How do we make decisions?
We use the BMAD methodology - see [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md) for details

### Where are the technical details?
See [SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md) § Technical Tasks section

### How do I run tests?
See [V5_README.md](./V5_README.md) § Testing Commands

### What are the acceptance criteria?
See [SPRINT_PLANNING_V5.md](./SPRINT_PLANNING_V5.md) § User Stories for each feature

---

## 🔄 Document Update Log

| Date | Document | Changes |
|------|----------|---------|
| 2026-01-23 | All docs | Initial v5.0 documentation created |
| 2026-01-23 | BMAD_WORKFLOW.md | Workflow initialized, 7 tasks created |
| 2026-01-23 | V5_INDEX.md | Index document created |

---

## 📞 Need Help?

- **Technical Questions**: Post in `#nutrivault-dev` Slack
- **Process Questions**: Refer to [BMAD_WORKFLOW.md](./BMAD_WORKFLOW.md)
- **Feature Clarifications**: Check with Product Manager
- **Bugs/Issues**: Create GitHub issue

---

**Ready to start building? Head to [V5_README.md](./V5_README.md) for setup instructions!**
