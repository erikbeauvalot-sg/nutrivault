# NutriVault - Multi-Agent Workflow Diagram

## Phase-Based Agent Activation

```
Timeline: 12 Weeks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1          Phase 2          Phase 3          Phase 4              Phase 5      Phase 6
Foundation       Backend Core     Backend Features Frontend             Integration  Deployment
Weeks 1-2        Weeks 2-4        Weeks 4-6        Weeks 6-9            Weeks 9-10   Weeks 10-12
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────┐
│  Project    │  ═══════════════════════════════════════════════════════════════════════════════▶
│  Architect  │  (Continuous coordination and architectural oversight)
└─────────────┘

┌─────────────┐
│  Database   │  ████████████▶
│  Specialist │  (Phase 1-2)
└─────────────┘

┌─────────────┐
│   DevOps    │  ████████▶                                                           ████████▶
│  Specialist │  (Phase 1)                                                          (Phase 6)
└─────────────┘
                             ┌─────────────┐
                             │   Backend   │  ████████████████████████▶
                             │  Developer  │  (Phase 2-3)
                             └─────────────┘

                             ┌─────────────┐
                             │  Security   │  ████████████████████████▶
                             │  Specialist │  (Phase 2-3)
                             └─────────────┘

                             ┌─────────────┐
                             │    Audit    │  ████████████████████████▶
                             │   Logger    │  (Phase 2-3)
                             └─────────────┘
                                                                        ┌─────────────┐
                                                                        │  Frontend   │  ████████████████████▶
                                                                        │  Developer  │  (Phase 4)
                                                                        └─────────────┘

                                                                        ┌─────────────┐
                                                                        │   UI/UX     │  ████████████████████▶
                                                                        │  Specialist │  (Phase 4)
                                                                        └─────────────┘

┌─────────────┐
│   Testing   │  ═══════════════════════════════════════════════════════════════════════════════▶
│  Specialist │  (Continuous testing across all phases)
└─────────────┘

┌─────────────┐
│Documentation│  ═══════════════════════════════════════════════════════════════════════════════▶
│  Specialist │  (Continuous documentation across all phases)
└─────────────┘

Legend: ███ Active Development    ═══ Continuous Support    ▶ Handoff to next phase
```

## Agent Dependencies Flow

```
┌──────────────────┐
│     DevOps       │  Provides: Git repo, environment setup, folder structure
│   Specialist     │
└────────┬─────────┘
         │
         ├────────────────────────────────────────┐
         │                                        │
         ▼                                        ▼
┌──────────────────┐                    ┌──────────────────┐
│     Project      │                    │    Database      │
│    Architect     │───────────────────▶│   Specialist     │
└────────┬─────────┘  Provides:         └────────┬─────────┘
         │            Architecture,              │
         │            API standards              │
         │                                       │
         │                                       │ Provides: Models,
         │                                       │ Migrations, Seed data
         │                                       │
         ├───────────────────┬───────────────────┼───────────────────┐
         │                   │                   │                   │
         ▼                   ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│     Backend      │ │    Security      │ │      Audit       │ │     Testing      │
│    Developer     │ │   Specialist     │ │     Logger       │ │   Specialist     │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │                    │
         │                    │                    │                    │
         │   Provides: API    │                    │                    │
         │   Endpoints        │                    │                    │
         │                    │                    │                    │
         └────────────────────┴────────────────────┴────────────────────┘
                                        │
                                        │ All provide to Frontend
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                         ▼                             ▼
                ┌──────────────────┐         ┌──────────────────┐
                │     Frontend     │◀────────│      UI/UX       │
                │    Developer     │         │    Specialist    │
                └──────────────────┘         └──────────────────┘
                         │
                         │ Provides: Complete application
                         │
                         ▼
                ┌──────────────────┐
                │  Documentation   │  Documents everything
                │    Specialist    │
                └──────────────────┘
```

## Current Phase 1 Workflow

```
START HERE ⭐
     │
     ▼
┌─────────────────────────────────────────┐
│  Step 1: DevOps Specialist              │
│  ────────────────────────────────────   │
│  Tasks:                                 │
│  • git init                             │
│  • Create .gitignore                    │
│  • Create .env.example files            │
│  • Set up folder structure              │
│                                         │
│  Duration: ~30 minutes                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 2: Project Architect              │
│  ────────────────────────────────────   │
│  Tasks:                                 │
│  • Create backend/ structure            │
│  • Create frontend/ structure           │
│  • Define API standards                 │
│  • Create ADR-001 (ORM choice)          │
│  • Set up ESLint/Prettier               │
│                                         │
│  Duration: ~1-2 hours                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Step 3: Database Specialist            │
│  ────────────────────────────────────   │
│  Tasks:                                 │
│  • Install Sequelize, SQLite            │
│  • Create config/database.js            │
│  • Create 11 models                     │
│  • Create migrations                    │
│  • Create seed data                     │
│  • Test: npm run db:migrate             │
│                                         │
│  Duration: ~2-3 hours                   │
└────────────────┬────────────────────────┘
                 │
                 ├─────────────┬────────────────┐
                 │             │                │
                 ▼             ▼                ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Documentation   │ │     Testing      │ │ Ready for        │
│  Specialist      │ │   Specialist     │ │ Phase 2!         │
│                  │ │                  │ │                  │
│  • Write README  │ │ • Setup Jest     │ │ Backend Dev,     │
│  • Setup guide   │ │ • Test structure │ │ Security,        │
│  • Doc schema    │ │ • CI config      │ │ Audit Logger     │
│                  │ │                  │ │ can start!       │
│  Duration: ~1hr  │ │ Duration: ~1hr   │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Agent Communication Matrix

```
Who needs what from whom:

Backend Developer needs:
  ✅ Models from Database Specialist
  ✅ Auth middleware from Security Specialist
  ✅ Audit service from Audit Logger
  ✅ Project structure from Architect

Security Specialist needs:
  ✅ User, Role, Permission models from Database Specialist
  ✅ Project structure from Architect

Audit Logger needs:
  ✅ AuditLog model from Database Specialist
  ✅ Project structure from Architect

Frontend Developer needs:
  ✅ Working API endpoints from Backend Developer
  ✅ Auth flow from Security Specialist
  ✅ Design specs from UI/UX Specialist

UI/UX Specialist needs:
  ✅ Requirements from Architect

Testing Specialist needs:
  ✅ Code from all development agents

Documentation Specialist needs:
  ✅ Completed features from all agents

DevOps Specialist needs:
  ✅ Nothing (can start immediately)

Project Architect needs:
  ✅ Nothing (can start immediately)

Database Specialist needs:
  ✅ Project structure from Architect
```

## Parallel Execution Opportunities

### Phase 1 (Can work in parallel after DevOps completes)
```
DevOps Specialist
       │
       ├──▶ Project Architect ─────┐
       │                           │
       └──▶ Documentation ──────────┤
                                   │
                    ┌──────────────┘
                    │
                    └──▶ Database Specialist ──▶ Testing Specialist
```

### Phase 2 (Can work in parallel after models complete)
```
Database Specialist (completing models)
       │
       ├──▶ Backend Developer ──────┐
       ├──▶ Security Specialist ─────┤
       └──▶ Audit Logger ────────────┤
                                     │
                      ┌──────────────┘
                      │
                      └──▶ Testing Specialist
```

### Phase 4 (Can work in parallel)
```
Backend (complete)
       │
       ├──▶ UI/UX Specialist ────────┐
       │                             │
       └──▶ Frontend Developer ◀─────┘
                    │
                    └──▶ Testing Specialist
```

## Agent Handoff Points

```
Phase 1 → Phase 2
┌──────────────┐
│  Database    │ HANDOFF: Models, migrations complete
│  Specialist  │ ───────────────────────────────────────▶ Backend Developer
└──────────────┘                                         Security Specialist
                                                         Audit Logger

Phase 2 → Phase 3
┌──────────────┐
│  Backend     │ HANDOFF: Core APIs working
│  Developer   │ ───────────────────────────────────────▶ Continue backend
└──────────────┘                                         features

┌──────────────┐
│  Security    │ HANDOFF: Auth system working
│  Specialist  │ ───────────────────────────────────────▶ RBAC & API keys
└──────────────┘

Phase 3 → Phase 4
┌──────────────┐
│  Backend     │ HANDOFF: All APIs complete, tested
│  Developer   │ ───────────────────────────────────────▶ Frontend Developer
└──────────────┘

┌──────────────┐
│  UI/UX       │ HANDOFF: Design specs ready
│  Specialist  │ ───────────────────────────────────────▶ Frontend Developer
└──────────────┘

Phase 4 → Phase 5
┌──────────────┐
│  Frontend    │ HANDOFF: All pages complete
│  Developer   │ ───────────────────────────────────────▶ Testing Specialist
└──────────────┘                                         (Integration tests)

Phase 5 → Phase 6
┌──────────────┐
│  Testing     │ HANDOFF: All tests passing
│  Specialist  │ ───────────────────────────────────────▶ DevOps Specialist
└──────────────┘                                         (Deploy)
```

## Decision Points

```
                         START
                           │
                           ▼
                  ┌────────────────┐
                  │ Launch all     │
                  │ Phase 1 agents │
                  │ in parallel?   │
                  └────────┬───────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                YES               NO
                  │                 │
                  ▼                 ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ Use Task tool to │   │ Work with agents │
    │ launch 3 agents  │   │ sequentially     │
    │ simultaneously   │   │                  │
    └────────┬─────────┘   └────────┬─────────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
              Phase 1 Complete?
                        │
                  ┌─────┴─────┐
                  │           │
                YES          NO
                  │           │
                  │           └──▶ Continue Phase 1
                  │
                  ▼
         Start Phase 2 agents
                  │
                  ▼
              Continue...
```

---

**Use this diagram to understand the flow of work between agents and the optimal execution strategy.**
