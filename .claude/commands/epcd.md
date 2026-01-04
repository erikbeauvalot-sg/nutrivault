---
argument-hint: [feature-description]
description: 'EPCT workflow: Explore, Plan (with validation), Code, and Test a feature'
model: claude-sonnet-4-5-20250929
allowed-tools: WebSearch(*), Glob(*), Grep(*), Read(*), Write(*), Edit(*), Bash(*)
---

# EPCT Workflow: Explore → Plan → Code → Test

Implement the feature: **$ARGUMENTS**

Follow this strict 4-phase workflow. Each phase must be completed thoroughly before moving to the next.

---

## Phase 1: EXPLORE

Your first task is to gather ALL necessary context before planning anything.

### 1.1 External Research

Use WebSearch to research:
- Best practices for implementing "$ARGUMENTS"
- Common patterns and approaches (especially for Node.js/Express/React)
- Security considerations
- Performance implications
- Similar implementations in comparable projects

**Be thorough**: Search multiple times with different queries if needed to fully understand the problem space.

### 1.2 Codebase Analysis

Explore the NutriVault codebase to understand:

**Critical Architecture (read CLAUDE.md first)**:
- Models are at `/models/` (root level, NOT `/backend/src/models/`)
- Backend code at `/backend/src/`
- Database commands run from root, backend commands run from `/backend/`
- Dual authentication: JWT + API keys
- RBAC system with permissions and roles
- Audit logging required for all CRUD operations
- Service layer pattern (controllers handle HTTP, services handle business logic)

**Files to examine**:

**Backend**:
- `/CLAUDE.md` - Project architecture and patterns
- Existing models in `/models/` - Understand data structures
- Existing routes in `/backend/src/routes/` - Understand API patterns
- Existing controllers in `/backend/src/controllers/` - Understand request handling
- Existing services in `/backend/src/services/` - Understand business logic patterns
- Middleware in `/backend/src/middleware/` - Understand auth/RBAC patterns
- Related migrations in `/migrations/` - Understand database schema
- Backend configuration (`/backend/package.json`, `/backend/.env.example`)

**Frontend**:
- Existing components in `/frontend/src/components/` - UI component patterns
- Existing pages in `/frontend/src/pages/` - Page structure and routing
- API services in `/frontend/src/services/` - API integration patterns
- State management in `/frontend/src/store/` or context - Data flow patterns
- Utilities in `/frontend/src/utils/` - Helper functions and common logic
- Styling patterns (CSS modules, styled-components, or CSS files)
- Frontend configuration (`/frontend/package.json`, `/frontend/.env.example`, `vite.config.js`)

**Shared**:
- Root configuration files (package.json, docker-compose.yml, etc.)

**Use the right tools**:
- `Glob` to find relevant files by pattern
- `Grep` to search for related code, patterns, or similar implementations
- `Read` to examine file contents

**Context checklist** - Ensure you understand:

**Backend**:
- [ ] What similar features already exist in the backend
- [ ] What models/tables this feature will interact with
- [ ] What permissions/roles are needed
- [ ] What middleware chain should be used
- [ ] What service patterns to follow
- [ ] What audit logging is required
- [ ] What validation patterns are used
- [ ] How errors are handled in similar features

**Frontend**:
- [ ] What similar UI components or pages already exist
- [ ] What API endpoints will be called from the frontend
- [ ] What state management pattern is used
- [ ] What component structure to follow
- [ ] How forms and validation are handled
- [ ] How errors are displayed to users
- [ ] What routing pattern is used
- [ ] What authentication/authorization UI patterns exist

### 1.3 Exploration Summary

After completing exploration, provide a brief summary of your findings:
- Key insights from external research
- Relevant existing code patterns you found
- Dependencies or related features identified
- Any concerns or complexities discovered

---

## Phase 2: PLAN (⚠️ VALIDATION REQUIRED)

Based on your exploration, create a detailed implementation plan.

### 2.1 Think Deeply

Use extended thinking to:
- Challenge your own assumptions
- Identify edge cases and potential issues
- Consider security implications
- Think about scalability and maintainability
- Question whether you have all the information you need

### 2.2 Create Detailed Plan

Structure your plan clearly:

**1. Database Changes** (if needed):
- What migrations are needed?
- What models need to be created/modified?
- What relationships are affected?
- What indexes should be added?

**2. Backend Implementation**:
- What routes need to be created/modified?
- What controllers are needed?
- What services contain the business logic?
- What middleware is required (auth, RBAC, validation)?
- What audit logging must be implemented?

**3. Frontend Implementation**:
- What new components need to be created?
- What existing components need to be modified?
- What pages/views are affected or need to be created?
- What routing changes are needed?
- What API calls are required (list specific endpoints)?
- What state management is needed (local state, context, Redux)?
- What forms and validation are needed?
- What user feedback (loading states, errors, success messages) is required?
- What responsive design considerations are needed?
- What accessibility requirements must be met?

**4. Testing Strategy**:
- What existing test commands will be run?
- What validation should be performed?

**5. Security Considerations**:
- Authentication requirements
- Authorization/permissions needed
- Input validation needed
- Audit logging requirements
- Potential vulnerabilities to address

**6. Implementation Order**:
- Numbered steps in logical order
- Dependencies between steps
- Estimated complexity of each step

### 2.3 Identify Uncertainties

**CRITICAL**: Be honest about what you're uncertain about. List any questions where you need clarification:

- Design decisions with multiple valid approaches
- Business logic requirements that are ambiguous
- Integration points that need clarification
- Performance or security trade-offs
- User experience decisions

**Ask specific, thoughtful questions** that demonstrate you've thought deeply about the problem.

### 2.4 Present Plan for Validation

Once your plan is complete, **STOP and wait for user validation**.

Present your plan clearly and ask:

1. **Is this plan complete and accurate?**
2. **Do you want me to proceed with this approach?**
3. **Here are my specific questions:** [list your questions]
4. **Are there any changes you'd like me to make to the plan?**

**DO NOT proceed to Phase 3 (Code) until the user explicitly approves the plan.**

---

## Phase 3: CODE

**⚠️ Only execute this phase after receiving explicit user approval of your plan.**

### 3.1 Implementation Requirements

Follow the approved plan exactly and implement the complete functionality:

**Follow NutriVault patterns**:
- Controllers: HTTP layer only, minimal logic
- Services: All business logic, audit logging, transactions
- Use AppError for structured error handling
- Require models from correct path: `require('../../models')` from backend/src/
- Follow existing code style and conventions
- Use middleware chains: `authenticate → requirePermission → controller`

**Database changes**:
- Create migrations in `/migrations/` (root level)
- Create/update models in `/models/` (root level)
- Run migrations from root: `npm run db:migrate`

**Backend implementation**:
- Create routes in `/backend/src/routes/`
- Create controllers in `/backend/src/controllers/`
- Create services in `/backend/src/services/`
- Add validation middleware where needed
- Register routes in `/backend/src/server.js`

**Frontend implementation**:
- Create/update components in `/frontend/src/components/`
- Create/update pages in `/frontend/src/pages/`
- Create/update API service calls in `/frontend/src/services/`
- Update state management (Context, Redux, or local state)
- Add routing if needed (React Router or similar)
- Implement forms with proper validation
- Add loading states and error handling
- Ensure responsive design (mobile, tablet, desktop)
- Follow accessibility best practices (ARIA labels, keyboard navigation)
- Match existing UI/UX patterns and design system

**Audit logging** (mandatory for CRUD operations):
```javascript
await auditService.log({
  user_id: user.id,
  username: user.username,
  action: 'CREATE', // or READ, UPDATE, DELETE
  resource_type: 'resource_name',
  resource_id: result.id,
  status: 'SUCCESS',
  changes: { after: result.toJSON() },
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  request_method: req.method,
  request_path: req.path
});
```

**Error handling**:
```javascript
throw new AppError('Error message', 404, 'ERROR_CODE');
```

### 3.2 Code Quality

- Write clean, readable, maintainable code
- Follow existing patterns in the codebase
- Add comments only where logic isn't self-evident
- Use meaningful variable and function names
- Keep functions focused and single-purpose

### 3.3 Implementation Summary

After coding, provide a summary of what was implemented:

**Backend**:
- Database changes (migrations, models)
- Routes, controllers, and services created/modified
- Middleware and validation added
- Audit logging implemented

**Frontend**:
- Components created/modified
- Pages and routing changes
- API integration
- State management implementation
- Forms and validation
- UI/UX enhancements

**General**:
- Any deviations from the plan (with explanations)
- Integration points between frontend and backend

---

## Phase 4: TEST

**⚠️ IMPORTANT**: Only run tests and commands that already exist. Do NOT create new tests.

### 4.1 Discover Available Commands

Read configuration files to identify what's actually available:

```bash
# Check root package.json scripts
cat package.json | grep -A 20 '"scripts"'

# Check backend package.json scripts
cat backend/package.json | grep -A 20 '"scripts"'

# Check frontend package.json scripts (if exists)
cat frontend/package.json | grep -A 20 '"scripts"'
```

### 4.2 Run Existing Validation Tools

Based on what you discovered, run ONLY the commands that exist:

**Backend validation** (run from `/backend/`):
- `npm run lint` or `npm run lint:fix` - ESLint
- `npm test` - Run backend test suite
- `npm run test:coverage` - Backend test coverage
- TypeScript compilation if configured

**Frontend validation** (run from `/frontend/`):
- `npm run lint` or `npm run lint:fix` - ESLint for frontend
- `npm test` - Run frontend test suite (React Testing Library, Jest, etc.)
- `npm run build` - Verify production build works
- TypeScript compilation if configured (`tsc --noEmit`)

**Database validation** (run from **root**):
- `node utils/verify-database.js` - Database verification script
- `npm run db:migrate` - Ensure migrations run successfully

**Full-stack validation**:
- Start backend: `cd backend && npm run dev`
- Start frontend: `cd frontend && npm run dev`
- Manually test the complete user flow
- Verify API integration between frontend and backend

**Run from appropriate directory**:
- Database commands: Run from **root**
- Backend commands: Run from **backend/**
- Frontend commands: Run from **frontend/**

### 4.3 Manual Verification

**Backend verification**:
- Start the development server: `cd backend && npm run dev`
- Test the endpoints manually using the health check pattern or API client
- Verify database state if needed
- Check backend logs for errors
- Test authentication and authorization
- Verify audit logs are being created

**Frontend verification**:
- Start the frontend: `cd frontend && npm run dev`
- Navigate to the new/modified pages
- Test all user interactions (buttons, forms, navigation)
- Verify loading states work correctly
- Test error handling (network errors, validation errors)
- Check responsive design on different screen sizes
- Verify accessibility (keyboard navigation, screen reader support)

**Integration verification**:
- Test the complete user flow from frontend to backend
- Verify data flows correctly between UI and API
- Test edge cases and error scenarios
- Verify authentication/authorization works in the UI

### 4.4 Test Results

Report the results:
- ✅ What passed
- ❌ What failed (with error details)
- 🔧 What needs to be fixed

If tests fail, analyze the failures and fix them before declaring the feature complete.

---

## Completion Checklist

Before considering this feature complete, verify:

**Process**:
- [ ] All exploration was thorough (external research + backend + frontend codebase)
- [ ] Plan was created and user-approved
- [ ] All planned code was implemented (backend AND frontend)

**Backend**:
- [ ] Code follows NutriVault patterns (RBAC, audit logging, service layer)
- [ ] Database migrations created and tested
- [ ] API endpoints work correctly
- [ ] Authentication and authorization implemented
- [ ] Audit logging implemented for CRUD operations
- [ ] Error handling follows patterns
- [ ] Backend tests pass

**Frontend**:
- [ ] UI components follow existing patterns
- [ ] Forms and validation work correctly
- [ ] Loading states and error handling implemented
- [ ] Responsive design works on all screen sizes
- [ ] Accessibility requirements met
- [ ] API integration works correctly
- [ ] Frontend tests/linting pass
- [ ] Production build succeeds

**Integration**:
- [ ] Frontend and backend communicate correctly
- [ ] Complete user flow works end-to-end
- [ ] All existing validation tools were run
- [ ] Feature is fully functional in both backend and frontend

---

## Important Reminders

1. **Do NOT skip the validation step** after Phase 2 (Plan)
2. **Do NOT create new tests** - only run existing commands
3. **Do NOT hallucinate** - if you're unsure, ask questions
4. **Follow existing patterns** - this codebase has specific conventions
5. **Think deeply** - challenge your assumptions before presenting the plan
6. **Be thorough** - explore comprehensively before planning
