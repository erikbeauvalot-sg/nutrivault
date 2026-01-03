# Multi-Agent Development System - NutriVault

This directory contains the instruction files and coordination documents for the 10 specialized AI agents working on **NutriVault** - Your complete nutrition practice management system.

## Overview

The project uses a multi-agent development approach where each agent has a specific role and responsibility. Agents work collaboratively across 6 development phases, with some agents active continuously and others joining at specific phases.

## Agent Roster

| # | Agent | Role | Phase |
|---|-------|------|-------|
| 1 | [Project Architect](01-PROJECT-ARCHITECT.md) | System design & coordination | 1, Continuous |
| 2 | [Backend Developer](02-BACKEND-DEVELOPER.md) | API development | 2-3 |
| 3 | [Database Specialist](03-DATABASE-SPECIALIST.md) | Database & ORM | 1 |
| 4 | [Security Specialist](04-SECURITY-SPECIALIST.md) | Authentication & security | 2-3 |
| 5 | [Frontend Developer](05-FRONTEND-DEVELOPER.md) | React UI development | 4 |
| 6 | [UI/UX Specialist](06-UIUX-SPECIALIST.md) | Design & UX | 4 |
| 7 | [Audit Logger](07-AUDIT-LOGGER.md) | Logging system | 2-3 |
| 8 | [Testing Specialist](08-TESTING-SPECIALIST.md) | Testing & QA | Continuous |
| 9 | [DevOps Specialist](09-DEVOPS-SPECIALIST.md) | Deployment & infrastructure | 1, 6 |
| 10 | [Documentation Specialist](10-DOCUMENTATION-SPECIALIST.md) | Documentation | Continuous |

## How to Use This System

### For AI Agents

If you are an AI agent assigned to work on this project:

1. **Read Your Instruction File**: Open your agent file (e.g., `03-DATABASE-SPECIALIST.md`)
2. **Check Current Phase**: Review [AGENT-STATUS.md](AGENT-STATUS.md) to see if you're active
3. **Review Dependencies**: Check which other agents you depend on and who depends on you
4. **Read the Specification**: Reference [DIETITIAN_APP_SPECIFICATION.md](../../DIETITIAN_APP_SPECIFICATION.md) for complete requirements
5. **Execute Tasks**: Work through your current phase deliverables
6. **Update Status**: Mark tasks complete in AGENT-STATUS.md when finished
7. **Communicate**: Log any blockers or important decisions in AGENT-STATUS.md

### For Project Coordinators

1. **Track Progress**: Use AGENT-STATUS.md to monitor all agents
2. **Manage Phases**: Update agent statuses when transitioning phases
3. **Resolve Blockers**: Address dependencies and conflicts
4. **Review Deliverables**: Ensure handoff checklist items are complete

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
**Active Agents**: Project Architect, Database Specialist, DevOps Specialist

**Objectives**:
- Project structure setup
- Database schema and models
- Development environment configuration
- Git repository initialization

### Phase 2: Backend Core (Weeks 2-4)
**Active Agents**: Backend Developer, Security Specialist, Database Specialist, Audit Logger

**Objectives**:
- Express server setup
- Authentication system
- Core API endpoints
- Audit logging infrastructure

### Phase 3: Backend Features (Weeks 4-6)
**Active Agents**: Backend Developer, Security Specialist, Audit Logger, Testing Specialist

**Objectives**:
- Complete all API endpoints
- RBAC and API key authentication
- Advanced features (search, filtering, reporting)
- Backend testing

### Phase 4: Frontend Development (Weeks 6-9)
**Active Agents**: Frontend Developer, UI/UX Specialist, Testing Specialist

**Objectives**:
- React application setup
- All UI pages and components
- State management
- Frontend testing

### Phase 5: Integration & Testing (Weeks 9-10)
**Active Agents**: Testing Specialist, All Developers

**Objectives**:
- Integration testing
- E2E testing
- Performance testing
- Security audit

### Phase 6: Documentation & Deployment (Weeks 10-12)
**Active Agents**: Documentation Specialist, DevOps Specialist

**Objectives**:
- Complete documentation
- Production deployment
- Monitoring setup
- User training materials

## Agent Collaboration Protocol

### 1. Before Starting Work

- [ ] Read your agent instruction file
- [ ] Check AGENT-STATUS.md for your status
- [ ] Verify all dependencies are ready
- [ ] Review relevant parts of the specification

### 2. During Development

- [ ] Follow your agent's architectural patterns
- [ ] Write tests for your code
- [ ] Document your work
- [ ] Update AGENT-STATUS.md with progress

### 3. After Completing Work

- [ ] Complete agent handoff checklist
- [ ] Update AGENT-STATUS.md
- [ ] Notify dependent agents
- [ ] Create pull request for review

## Handoff Checklist

When an agent completes their work, verify:

1. ✅ Code committed to version control
2. ✅ Unit tests written and passing
3. ✅ Documentation updated
4. ✅ Interface contracts published (if applicable)
5. ✅ Environment variables documented (if new ones added)
6. ✅ Migration scripts (if database changes)
7. ✅ Code reviewed by relevant agents
8. ✅ Integration tested with dependent modules
9. ✅ Known issues documented
10. ✅ Next steps or blockers communicated

## Inter-Agent Communication

### Interface Contracts
Shared in: `/docs/contracts/`
- API specifications
- Database schema
- Type definitions
- Service interfaces

### Architecture Decisions
Documented in: `/docs/adrs/`
- Major technical decisions
- Rationale and alternatives
- Consequences and trade-offs

### Progress Updates
Tracked in: `AGENT-STATUS.md`
- Current tasks
- Completion status
- Blockers
- Dependencies

### Change Log
Tracked in: `/CHANGELOG.md`
- What changed
- Which agent made the change
- Why the change was made

## Common Scenarios

### Scenario 1: Starting as a New Agent

1. Read the main specification: `DIETITIAN_APP_SPECIFICATION.md`
2. Read your agent instruction file: `docs/agents/[XX-AGENT-NAME].md`
3. Check if you're active: `docs/agents/AGENT-STATUS.md`
4. If active, review your current tasks
5. Check dependencies - do you need outputs from other agents?
6. Begin work on your deliverables

### Scenario 2: Blocked by Dependencies

1. Identify which agent you're waiting for
2. Check AGENT-STATUS.md to see their progress
3. Log your blocker in AGENT-STATUS.md
4. Work on non-blocked tasks if available
5. Prepare for when dependency is ready

### Scenario 3: Completing a Phase

1. Complete all tasks in your deliverables list
2. Run through the handoff checklist
3. Update AGENT-STATUS.md
4. Mark your phase as complete
5. Notify dependent agents
6. Transition to standby or next phase

### Scenario 4: Integration Conflict

1. Document the conflict in AGENT-STATUS.md
2. Notify the Project Architect
3. Project Architect reviews and decides resolution
4. Update code according to decision
5. Document decision in ADR if architectural

## File Organization

```
docs/
├── agents/
│   ├── README.md                    # This file
│   ├── AGENT-STATUS.md              # Status tracker
│   ├── 01-PROJECT-ARCHITECT.md      # Agent instructions
│   ├── 02-BACKEND-DEVELOPER.md
│   ├── 03-DATABASE-SPECIALIST.md
│   ├── 04-SECURITY-SPECIALIST.md
│   ├── 05-FRONTEND-DEVELOPER.md
│   ├── 06-UIUX-SPECIALIST.md
│   ├── 07-AUDIT-LOGGER.md
│   ├── 08-TESTING-SPECIALIST.md
│   ├── 09-DEVOPS-SPECIALIST.md
│   └── 10-DOCUMENTATION-SPECIALIST.md
├── contracts/                       # API contracts & interfaces
├── adrs/                           # Architecture Decision Records
└── setup/                          # Setup guides
```

## Quick Reference

### Current Phase
Check: `AGENT-STATUS.md` - "Current Phase" section

### Your Agent Status
Check: `AGENT-STATUS.md` - Find your row in the status table

### Your Tasks
Check: Your agent file (e.g., `03-DATABASE-SPECIALIST.md`) - "Deliverables" section

### Dependencies
Check: `AGENT-STATUS.md` - "Dependencies Matrix" section

### Blockers
Update: `AGENT-STATUS.md` - Add to your agent's "Blockers" column

## Best Practices

1. **Read Before Writing**: Always read NUTRIVAULT_SPECIFICATION.md and your agent file before coding
2. **Test Your Code**: Write tests as you develop, don't leave them for later
3. **Document Everything**: Code comments, API docs, user guides
4. **Communicate Early**: Report blockers immediately, don't wait
5. **Follow Patterns**: Use the architectural patterns defined by Project Architect
6. **Update Status**: Keep AGENT-STATUS.md current
7. **Review Code**: Check other agents' code when it affects your work
8. **Ask Questions**: If unclear, ask Project Architect or relevant agent

## Success Metrics

Each agent has specific success metrics defined in their instruction file and in Section 8.5 of the main specification. Review these regularly to ensure you're meeting quality standards.

## Getting Help

- **Technical Questions**: Ask Project Architect
- **Integration Issues**: Check with dependent agents
- **Blockers**: Log in AGENT-STATUS.md and notify coordinator
- **Specification Clarification**: Reference NUTRIVAULT_SPECIFICATION.md

## Example Workflow: Database Specialist

1. ✅ Read `03-DATABASE-SPECIALIST.md`
2. ✅ Check `AGENT-STATUS.md` - Status: Active, Phase 1
3. ✅ Read "Phase 1 Deliverables" in instruction file
4. ✅ Review database schema in specification
5. 🔄 Install Sequelize: `npm install sequelize sqlite3`
6. 🔄 Create `config/database.js`
7. 🔄 Create User model: `models/User.js`
8. 🔄 Create migration: `migrations/...-create-users.js`
9. 🔄 Test migration: `npm run db:migrate`
10. ✅ Update AGENT-STATUS.md - Mark "User model" complete
11. 🔄 Continue with remaining models...
12. ✅ Complete all Phase 1 deliverables
13. ✅ Run handoff checklist
14. ✅ Notify Backend Developer models are ready

---

**Let's build something great together! 🚀**
