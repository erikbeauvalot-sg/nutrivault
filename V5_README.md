# Nutrivault v5.0 Development Guide

Bienvenue dans le développement de Nutrivault v5.0 ! Ce document vous guide pour démarrer avec les nouvelles fonctionnalités.

---

## Documentation Structure

| Document | Purpose | Audience |
|----------|---------|----------|
| `SPRINT_PLANNING_V5.md` | Detailed sprint planning with user stories, technical tasks, and BMAD methodology | Developers, Product Managers |
| `SPRINT_SUMMARY_V5.md` | Quick reference with timeline, metrics, and risks | All team members |
| `V5_README.md` (this file) | Getting started guide | Developers |

---

## Branch Strategy

```
main
  └── v5.0-features (current development branch)
       ├── feature/US-5.1.1-rbac-ui
       ├── feature/US-5.1.2-ui-cleanup
       ├── feature/US-5.1.3-custom-fields-list
       ├── feature/US-5.1.4-fix-alerts
       └── ... (more feature branches per user story)
```

**Branch Naming Convention**: `feature/US-X.Y.Z-short-description`
- X = Sprint number (1-6)
- Y = User story number within sprint
- Z = Sub-task number (if needed)

---

## Quick Start - Sprint 1

### Prerequisites
- Node.js 18+ and npm
- SQLite 3
- Git configured

### Setup Development Environment

```bash
# Clone and switch to v5.0 branch
git checkout v5.0-features

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Run database migrations
cd ../backend
npm run migrate

# Start development servers
npm run dev          # Backend (port 5000)
cd ../frontend
npm run dev          # Frontend (port 5173)
```

---

## Sprint 1 Development Workflow

### US-5.1.1: RBAC Management UI

**Branch**: `feature/US-5.1.1-rbac-ui`

**Backend Tasks**:
1. No new backend required (RBAC system already complete)
2. Test existing endpoints:
   - `GET /api/roles` - List all roles
   - `GET /api/roles/:id` - Get role details
   - `POST /api/roles` - Create role
   - `PUT /api/roles/:id` - Update role
   - `DELETE /api/roles/:id` - Delete role
   - `PUT /api/roles/:id/permissions` - Update role permissions

**Frontend Tasks**:
1. Create `src/pages/Settings/RolesManagementPage.jsx`
2. Create `src/components/Roles/RoleModal.jsx`
3. Create `src/components/Roles/PermissionTree.jsx`
4. Update `src/App.jsx` to add route `/settings/roles`

**Acceptance Criteria Checklist**:
- [ ] Page displays all roles in a table
- [ ] Create role button opens modal
- [ ] Edit role button opens modal with existing data
- [ ] Delete role button shows confirmation dialog
- [ ] Permission tree organized by resource (Patients, Visits, Billing, etc.)
- [ ] Real-time updates on save
- [ ] Audit log entry created on role/permission change

---

### US-5.1.2: UI Cleanup - Remove Birth Date

**Branch**: `feature/US-5.1.2-ui-cleanup`

**Files to Modify**:
- `frontend/src/pages/Patients/PatientsPage.jsx` - Remove birth_date column
- `frontend/src/components/Patients/PatientCard.jsx` - Remove birth_date display
- `frontend/src/pages/Patients/PatientDetailPage.jsx` - Remove birth_date from header

**Testing**:
- [ ] Patient list view has no birth_date column
- [ ] Patient card has no birth_date
- [ ] Patient detail page header has no birth_date
- [ ] Age can be calculated via custom field (test in Sprint 2)

---

### US-5.1.3: Custom Fields in List View

**Branch**: `feature/US-5.1.3-custom-fields-list`

**Backend Tasks**:
1. Add migration: `backend/src/migrations/XXX-add-show-in-list-to-custom-fields.js`
   ```javascript
   module.exports = {
     up: async (queryInterface, Sequelize) => {
       await queryInterface.addColumn('custom_field_definitions', 'show_in_list', {
         type: Sequelize.BOOLEAN,
         defaultValue: false,
         allowNull: false
       });
     },
     down: async (queryInterface) => {
       await queryInterface.removeColumn('custom_field_definitions', 'show_in_list');
     }
   };
   ```

2. Update `backend/src/models/CustomFieldDefinition.js` - Add `show_in_list` field
3. Update `backend/src/services/patient.service.js` - Include custom fields in patient list query

**Frontend Tasks**:
1. Update `src/components/CustomFields/CustomFieldDefinitionModal.jsx` - Add "Show in list view" checkbox
2. Update `src/pages/Patients/PatientsPage.jsx` - Render dynamic columns for custom fields with `show_in_list = true`

**Testing**:
- [ ] Checkbox appears in custom field definition modal
- [ ] Saving custom field with checkbox checked sets `show_in_list = true`
- [ ] Patient list table dynamically adds columns
- [ ] Column headers use custom field name (with i18n)
- [ ] Column sorting works
- [ ] Max 5 custom columns enforced

---

### US-5.1.4: Fix Alerts - Visits Without Notes

**Branch**: `feature/US-5.1.4-fix-alerts`

**Backend Tasks**:
1. Update `backend/src/services/alert.service.js`:
   ```javascript
   // Old (broken)
   async getVisitsWithoutNotes() {
     return await Visit.findAll({
       where: { notes: null }
     });
   }

   // New (using custom fields)
   async getVisitsWithoutCustomFields() {
     const visits = await Visit.findAll({
       include: [{
         model: VisitCustomFieldValue,
         as: 'custom_field_values',
         required: false
       }]
     });

     return visits.filter(visit =>
       !visit.custom_field_values || visit.custom_field_values.length === 0
     );
   }
   ```

2. Update alert endpoint in `backend/src/routes/alerts.routes.js`

**Frontend Tasks**:
1. Update `src/components/Dashboard/AlertsWidget.jsx` - Display visits without custom fields

**Testing**:
- [ ] Alert shows visits with no custom field values
- [ ] Alert displays visit date, patient name, and missing fields count
- [ ] Clicking alert navigates to visit detail page
- [ ] Alert disappears when custom fields are added to visit

---

## Code Review Checklist

Before submitting a PR, ensure:
- [ ] Code follows existing patterns and conventions
- [ ] All acceptance criteria met
- [ ] Unit tests added for new functions (target: 80% coverage)
- [ ] No console.log or debug code left
- [ ] RBAC permissions enforced on new endpoints
- [ ] i18n translations added for new UI text (FR + EN)
- [ ] No security vulnerabilities (XSS, SQL injection, etc.)
- [ ] Migration tested (up and down)
- [ ] Responsive design tested on mobile
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)

---

## Testing Commands

```bash
# Backend unit tests
cd backend
npm test

# Backend integration tests
npm run test:integration

# Frontend unit tests
cd frontend
npm test

# E2E tests (Cypress)
npm run test:e2e

# Linting
npm run lint

# Database migration (up)
cd backend
npm run migrate

# Database migration (down)
npm run migrate:undo
```

---

## Debugging Tips

### Backend Debugging
- Check logs: `backend/logs/app.log`
- Enable verbose logging: `LOG_LEVEL=debug npm run dev`
- Inspect database: `sqlite3 backend/database.sqlite`

### Frontend Debugging
- React DevTools extension
- Check Redux state (if applicable)
- Network tab for API calls
- Console for errors

### Common Issues
1. **CORS errors**: Check `backend/src/config/cors.js`
2. **Permission denied**: Check RBAC middleware and user role
3. **Database locked**: Close all connections to SQLite
4. **Port in use**: Change port in `.env` file

---

## BMAD Workflow for Each Sprint

### Build Phase (Week 1-2)
1. **Day 1**: Sprint planning meeting (review user stories)
2. **Day 2-8**: Feature development (daily standups)
3. **Day 9-10**: Code review and testing

### Measure Phase (Week 2)
1. Deploy to staging environment
2. Enable analytics tracking (add custom events)
3. Monitor performance metrics:
   - API response time (target: <500ms p95)
   - Error rate (target: <1%)
   - User engagement (page views, feature usage)

### Analyze Phase (End of sprint)
1. Sprint retrospective meeting (1 hour)
   - What went well?
   - What could be improved?
   - Action items for next sprint
2. Review metrics vs targets
3. Gather user feedback (surveys, interviews)

### Decide Phase (Sprint planning next sprint)
1. Prioritize backlog based on feedback
2. Adjust timeline if needed
3. Update sprint plan document

---

## Communication Channels

- **Daily Standups**: 9:00 AM (15 min) - Share progress, blockers
- **Sprint Planning**: First Monday of sprint (2 hours)
- **Sprint Retrospective**: Last Friday of sprint (1 hour)
- **Ad-hoc Questions**: Slack #nutrivault-dev channel

---

## Resources

- **Design Mockups**: Figma (link TBD)
- **API Documentation**: `backend/docs/API.md`
- **Database Schema**: `backend/docs/DATABASE_SCHEMA.md`
- **Component Library**: Storybook (run `npm run storybook`)

---

## Next Steps After Sprint 1

Once Sprint 1 is complete:
1. Merge feature branches to `v5.0-features`
2. Deploy to staging for QA testing
3. Conduct Sprint 1 retrospective
4. Begin Sprint 2 planning (Calculated Fields)

Refer to `SPRINT_PLANNING_V5.md` for detailed Sprint 2-6 plans.

---

## Questions?

Contact the team lead or post in #nutrivault-dev Slack channel.

Happy coding! 🚀
