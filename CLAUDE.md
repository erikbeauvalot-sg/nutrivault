# Claude Code Instructions for NutriVault

NutriVault is a nutrition practice management platform for dietitians. It provides patient management, visit tracking, billing/invoicing, document management, recipe management, email campaigns, AI-powered features, and a patient portal. The app runs as a web application with an iOS native build via Capacitor.

**Current version**: 8.7.16

## Project Structure

```
nutrivault/
├── backend/                    # Express.js API server (port 3001)
│   ├── src/
│   │   ├── server.js           # Express app entry point
│   │   ├── auth/jwt.js         # JWT token utilities
│   │   ├── controllers/        # Route handlers (55 controllers)
│   │   ├── routes/             # Express route definitions (53 route files)
│   │   ├── services/           # Business logic layer (75 service files)
│   │   ├── middleware/
│   │   │   ├── authenticate.js # JWT + API key auth middleware
│   │   │   ├── rbac.js         # Role-based access control
│   │   │   ├── portalScope.js  # Patient portal scoping
│   │   │   └── rateLimiter.js  # Rate limiting
│   │   ├── helpers/            # scopeHelper.js
│   │   ├── utils/              # encryption, icsGenerator, timezone
│   │   ├── data/               # Static data (consultation guide content)
│   │   └── models/             # Additional model files (PatientMeasure)
│   ├── migrations/             # Sequelize migrations (100 migration files)
│   ├── seeders/                # Default data seeders (18 seeder files)
│   ├── tests/                  # Jest test suite
│   │   ├── setup/              # Test configuration
│   │   ├── fixtures/           # Test data fixtures
│   │   ├── integration/        # Integration tests
│   │   ├── performance/        # Performance tests
│   │   └── services/           # Service unit tests
│   ├── scripts/                # Backend utility scripts
│   ├── Dockerfile              # Backend Docker image
│   ├── jest.config.js          # Jest configuration
│   └── package.json            # Backend dependencies
│
├── frontend/                   # Vite + React SPA (port 5173)
│   ├── src/
│   │   ├── App.jsx             # Main router with lazy-loaded routes
│   │   ├── main.jsx            # React entry point
│   │   ├── index.css           # Global styles
│   │   ├── i18n.js             # i18next configuration
│   │   ├── capacitor.js        # Capacitor native bridge setup
│   │   ├── components/
│   │   │   ├── layout/         # Layout, Header, Sidebar, BottomTabBar
│   │   │   ├── common/         # Reusable UI: EmptyState, FilterBar, LoadingSpinner,
│   │   │   │                   #   Pagination, OfflineBanner, PageHeader, etc.
│   │   │   ├── ui/             # FormSection, SearchableSelect, SlidePanel
│   │   │   ├── dashboard/      # Dashboard widgets (Activity, Birthdays, Revenue, etc.)
│   │   │   ├── campaigns/      # Email campaign components
│   │   │   ├── messages/       # Messaging/conversation components
│   │   │   ├── portal/         # Patient portal components
│   │   │   ├── recipes/        # Recipe management tabs
│   │   │   ├── ios/            # iOS-specific animated page transitions
│   │   │   ├── ConfirmModal.jsx    # Use instead of window.confirm()
│   │   │   ├── ProtectedRoute.jsx  # Staff route guard
│   │   │   ├── PatientProtectedRoute.jsx # Patient portal route guard
│   │   │   └── ... (100+ feature-specific components)
│   │   ├── pages/              # Route page components (67 pages)
│   │   │   ├── portal/         # Patient portal pages (12 pages)
│   │   │   └── ...             # Staff/admin pages
│   │   ├── services/           # API service modules (63 files)
│   │   │   ├── api.js          # Axios instance with token refresh interceptors
│   │   │   └── ...Service.js   # Feature-specific API clients
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx  # Authentication state & methods
│   │   │   ├── NotificationContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/              # Custom React hooks (16 hooks)
│   │   │   ├── useFetch.js, useModal.js, usePagination.js
│   │   │   ├── useBiometricAuth.js, useHaptics.js
│   │   │   └── useNetworkStatus.js, usePullToRefresh.js
│   │   ├── utils/              # Utility functions
│   │   │   ├── tokenStorage.js # JWT token management
│   │   │   ├── platform.js     # Native/web detection
│   │   │   ├── dateUtils.js, currency.js, bmiUtils.js
│   │   │   └── measureUtils.js, statisticsUtils.js
│   │   ├── locales/
│   │   │   ├── en.json         # English translations
│   │   │   └── fr.json         # French translations
│   │   ├── config/             # Frontend configuration
│   │   └── styles/             # Additional CSS files
│   ├── tests/                  # Vitest test suite
│   │   ├── setup.js            # Test setup (jsdom)
│   │   ├── mocks/              # Test mocks (MSW)
│   │   ├── components/         # Component tests
│   │   ├── pages/              # Page tests
│   │   └── utils/              # Utility tests
│   ├── ios/                    # Capacitor iOS project
│   ├── capacitor.config.ts     # Capacitor config (appId: com.beauvalot.nutrivault)
│   ├── vite.config.js          # Vite build configuration
│   ├── vitest.config.js        # Vitest test configuration
│   ├── eslint.config.js        # ESLint flat config
│   └── package.json            # Frontend dependencies
│
├── models/                     # Shared Sequelize model definitions (71 models)
│   ├── index.js                # Model registry + all associations
│   ├── User.js, Patient.js, Visit.js, Billing.js, ...
│   └── ConsultationNote.js, ConsultationNoteEntry.js
│
├── migrations/                 # Root-level migrations (legacy)
├── seeders/                    # Root-level seeders (legacy)
├── config/
│   └── database.js             # Sequelize DB config (dev/test/prod)
│
├── scripts/                    # Deployment & maintenance scripts (35 scripts)
│   ├── deploy-bare-metal.sh    # Production deployment
│   ├── backup.sh / restore.sh  # Database backup/restore
│   ├── bump-version.sh         # Version bumping
│   ├── release.sh              # Release creation
│   └── ...
│
├── .github/
│   ├── workflows/ci-cd.yml     # GitHub Actions CI/CD (currently disabled)
│   ├── agents/                 # AI agent configurations
│   ├── instructions/           # Coding standards, best practices
│   └── prompts/                # Prompt templates for agents
│
├── docker-compose.yml          # Docker setup (backend + frontend)
├── package.json                # Root package.json (test orchestration, db commands)
├── .env.example                # Environment variable template
├── .sequelizerc                # Sequelize CLI paths
└── CLAUDE.md                   # This file
```

## Commands

```bash
# Backend
cd backend && npm run dev           # Start API server with nodemon (port 3001)
cd backend && npm start             # Start API server without nodemon
cd backend && npm test              # Run backend tests (Jest, --runInBand)
cd backend && npm run test:watch    # Run tests in watch mode
cd backend && npm run test:integration  # Run integration tests only
cd backend && npm run test:coverage # Run tests with coverage report
cd backend && npm run db:migrate    # Run Sequelize migrations
cd backend && npm run db:seed       # Run all seeders
cd backend && npm run db:reset      # Drop all, migrate, and seed

# Frontend
cd frontend && npm run dev          # Start Vite dev server (port 5173)
cd frontend && npm run build        # Production build
cd frontend && npm run preview      # Preview production build
cd frontend && npm run lint         # ESLint check
cd frontend && npm run lint:fix     # ESLint auto-fix
cd frontend && npm test             # Run frontend tests (Vitest)
cd frontend && npm run test:watch   # Run tests in watch mode
cd frontend && npm run test:coverage # Run tests with coverage

# iOS / Capacitor
cd frontend && npm run build:ios    # Build for iOS + cap sync
cd frontend && npm run build:native # Build in native mode
cd frontend && npx cap open ios     # Open Xcode project

# Root-level (test orchestration)
npm test                            # Run all tests (backend + frontend)
npm run test:backend                # Run backend tests
npm run test:frontend               # Run frontend tests
npm run db:migrate                  # Run root migrations
npm run db:seed                     # Run root seeders
npm run db:reset                    # Full database reset
```

## Architecture

### Backend (Express + Sequelize)

**Pattern**: Controller -> Service -> Model (3-tier)

- **Controllers** receive HTTP requests, validate input, call services, return responses
- **Services** contain business logic, interact with models
- **Models** (in `/models/`) define Sequelize schema and associations
- **Middleware** handles auth, RBAC, rate limiting, portal scoping

**Authentication**: JWT (access + refresh tokens) and API key support
- Access tokens in `Authorization: Bearer <token>` header
- API keys via `x-api-key` or `api-key` header
- Token refresh is automatic via frontend interceptors

**Authorization (RBAC)**:
- Roles: `ADMIN`, `DIETITIAN`, `ASSISTANT`, `PATIENT`
- Permissions are code-based strings (e.g., `patients.read`, `billing.write`)
- Middleware: `requirePermission()`, `requireRole()`, `requireAnyPermission()`, `requireStaffRole()`
- Admins have all permissions; dietitians see only their assigned patients

**Key API patterns**:
- All responses use `{ success: true/false, data/error }` format
- Health check: `GET /health`
- Auth routes: `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`
- Resource routes: `/api/patients`, `/api/visits`, `/api/billing`, etc.
- Portal routes: `/api/portal/*` (patient-facing, scoped by portalScope middleware)

### Frontend (React + Vite)

**Pattern**: Pages -> Components + Services + Hooks + Contexts

- **Pages** are lazy-loaded route components in `App.jsx`
- **Services** wrap Axios calls to backend API (one service file per domain)
- **Contexts**: AuthContext (auth state), ThemeContext (theming), NotificationContext
- **Hooks**: Custom hooks for fetch, modals, pagination, biometrics, network status
- **Components**: Reusable UI in `common/`, `layout/`, `ui/`; feature components at root level

**State management**: React Context + local state (no Redux)

**Routing**: React Router v6 with `ProtectedRoute` (staff) and `PatientProtectedRoute` (portal)

**UI framework**: React Bootstrap + custom CSS (Solarpunk aesthetic)

**Offline support**: GET responses cached via `offlineCache.js`; served from cache on network failure

### Database

- **Development**: SQLite (file: `backend/data/nutrivault.db`)
- **Test**: SQLite in-memory (`:memory:`)
- **Production**: SQLite or PostgreSQL (configurable via `DB_DIALECT`)
- **ORM**: Sequelize v6 with snake_case column naming (`created_at`, `updated_at`)
- **71 models** with comprehensive associations defined in `models/index.js`
- **100 migrations** in `backend/migrations/` (timestamped, e.g., `20260222...`)
- Always create migrations for schema changes; never modify the database directly

### iOS / Capacitor

- **App ID**: `com.beauvalot.nutrivault`
- **Capacitor plugins**: Camera, Haptics, Keyboard, Network, Push Notifications, Biometric Auth, Preferences, SplashScreen, StatusBar
- Native HTTP plugin enabled to bypass WKWebView CORS
- Server URL configurable at runtime for native builds
- Build: `npm run build:ios && npx cap sync ios`

## Coding Conventions

### General
- Components: `PascalCase` (e.g., `PatientList.jsx`)
- Files: `camelCase` for services/utils (e.g., `patientService.js`), `PascalCase` for components
- Backend models: `PascalCase` (e.g., `Patient.js`, `MeasureDefinition.js`)
- Database columns: `snake_case` (e.g., `created_at`, `patient_id`)

### Internationalization (i18n)
- All UI strings must use i18n: `t('key', 'Default text')`
- Translation files: `frontend/src/locales/en.json` and `fr.json`
- i18n library: `i18next` + `react-i18next`
- ESLint plugin enforces i18n usage

### Frontend Rules
- **Never use `window.confirm()` or `alert()`** - use `ConfirmModal` component instead
- Use `react-toastify` for notifications/feedback
- Form validation: `react-hook-form` + `yup` schemas
- Lazy load all pages (except LoginPage)
- Use existing common components (`EmptyState`, `FilterBar`, `LoadingSpinner`, `Pagination`, `PageHeader`)

### Backend Rules
- Use `express-validator` for request validation
- Use service layer for business logic (don't put logic in controllers)
- Use the `authenticate` middleware on all protected routes
- Use RBAC middleware (`requirePermission`, `requireRole`) for authorization
- Log errors with `console.error` for monitoring

### Design System
- **Solarpunk aesthetic**: Warm, optimistic color palettes (neutral blue, golds, earth tones), organic shapes, bright hopeful atmosphere
- **Typography**: Use distinctive fonts from Google Fonts (JetBrains Mono, Space Grotesk, Bricolage Grotesque, etc.). Never use Inter, Roboto, Open Sans, Lato, or default system fonts
- Use weight extremes (100/200 vs 800/900) and size jumps of 3x+

## Environment Variables

Key variables (see `.env.example` for full list):

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Backend port | `3001` |
| `DB_DIALECT` | Database type | `sqlite` |
| `DB_STORAGE` | SQLite file path | `./backend/data/nutrivault_dev.db` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | - |
| `REFRESH_TOKEN_SECRET` | Refresh token secret (32+ chars) | - |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:3000,http://localhost:5173` |
| `FRONTEND_URL` | Public frontend URL | `http://localhost:5173` |
| `EMAIL_HOST/PORT/USER/PASSWORD` | SMTP configuration | Gmail defaults |
| `ANTHROPIC_API_KEY` | Claude API key (optional) | - |
| `OPENAI_API_KEY` | OpenAI API key (optional) | - |
| `MISTRAL_API_KEY` | Mistral API key (optional) | - |
| `OLLAMA_BASE_URL` | Local Ollama URL (optional) | - |
| `FEATURE_PATIENT_BOOKING` | Enable patient self-booking | `false` |

## AI Providers

The backend integrates with multiple AI providers (configured in AI Config page):
- **Anthropic Claude** (`@anthropic-ai/sdk`)
- **OpenAI** (`openai` package)
- **Mistral AI** (`@mistralai/mistralai`)
- **Ollama** (local, self-hosted)

AI features include: follow-up generation, consultation notes, recipe suggestions, and custom AI prompts configurable per user.

## Testing

### Backend (Jest)
- Config: `backend/jest.config.js`
- Setup: `backend/tests/setup/jest.setup.js`
- Tests run with `NODE_ENV=test` and in-memory SQLite
- Tests run sequentially (`--runInBand`) to avoid DB conflicts
- Coverage threshold: 50% (branches, functions, lines, statements)
- Test timeout: 30s

### Frontend (Vitest)
- Config: `frontend/vitest.config.js`
- Setup: `frontend/tests/setup.js`
- Environment: jsdom
- Mocking: MSW (Mock Service Worker) in `frontend/tests/mocks/`
- Coverage provider: v8
- Test timeout: 10s

## Development Workflow

### After Implementing ANY Feature

After completing any feature implementation (frontend or backend):

1. **Check IDE diagnostics** - Use `mcp__ide__getDiagnostics` to identify TypeScript/JSX/JS errors
2. **Restart backend if needed** - Kill existing process and restart: `lsof -ti:3001 | xargs kill -9; cd backend && npm run dev`
3. **Check backend logs** - Monitor `/tmp/nutrivault-backend.log` for errors after server restart
4. **Test the API endpoint** - If backend changes, verify the endpoint works (check logs for errors)
5. **Verify frontend loads** - Check browser console (F12) for React errors, network failures, runtime exceptions
6. **Check for 500 errors** - Use browser dev tools to ensure no API calls return 500 status codes
7. **Check i18n** - Ensure all UI strings use `t('key', 'default')` pattern
8. **Check UI** - Verify the feature works as expected in the UI, no visual bugs or broken interactions
9. **Update unit tests** - If applicable, add or update unit tests for the new feature
10. **Update UI tests** - If applicable, add or update UI tests for the new feature
11. **Update functional tests** - If applicable, add or update functional tests for the new feature
12. **Only then, tell the user the feature is ready** - If any errors are found in steps 1-5, fix them before confirming completion

**CRITICAL**: Do NOT tell the user a feature is ready until you have:
- Restarted the backend server (if backend changes were made)
- Checked the backend logs for errors
- Verified no 500 errors from API calls

### Testing API Endpoints

When testing backend features:
1. Check logs: `tail -f /tmp/nutrivault-backend.log`
2. Look for: `Error`, `exception`, `failed`, `undefined`
3. If errors exist, fix them before telling user the feature is ready

### Frontend-Specific Instructions

- Do not use any `window.confirm` or `alert` in the code as they are blocking and create a bad user experience. Use the `ConfirmModal` component instead.
- Always test the production build locally before telling the user it's ready.

## Release Builds

- **"COMMIT BUILD"**: Commit, push, increment iOS build version, run `npm run build:ios && npx cap sync ios`
- **"COMMIT PATCH"**: Commit, push, create release with patch version bump (e.g., 1.0.0 -> 1.0.1). Update iOS Build number with version + date (e.g., `1.0.1-202406171230`)
- **"COMMIT MINOR"**: Same as PATCH but bumps minor version (e.g., 1.0.0 -> 1.1.0)
- **"COMMIT MAJOR"**: Same as PATCH but bumps major version (e.g., 1.0.0 -> 2.0.0)

## Production Deployment

**IMPORTANT: Always use the deployment script, never run Docker commands locally for production!**

Production runs on a VM with hostname `sd-161616`. To deploy:
```bash
./Update.sh
```

This script runs: `cd /opt/nutrivault && git pull origin main && ./scripts/deploy-bare-metal.sh -y`

### Docker Deployment
- `docker-compose.yml` defines backend + frontend services
- Backend uses persistent volumes for data, uploads, and logs
- Frontend served via Nginx with reverse proxy to backend
- Health checks configured on both services

## Key Domain Concepts

| Domain | Models | Description |
|---|---|---|
| **Patients** | Patient, PatientTag, PatientDietitian, PatientObjective | Patient records with tagging, multi-dietitian assignment |
| **Visits** | Visit, VisitType, VisitCustomFieldValue | Consultation appointments with custom fields |
| **Billing** | Billing, Payment, InvoiceEmail, BillingTemplate | Invoice generation, payments, email delivery |
| **Measures** | MeasureDefinition, PatientMeasure, MeasureAlert, MeasureAnnotation | Health metrics tracking with alerts and formulas |
| **Custom Fields** | CustomFieldCategory, CustomFieldDefinition, PatientCustomFieldValue | User-defined fields for patients and visits |
| **Documents** | Document, DocumentShare, DocumentAccessLog | File uploads with secure sharing links |
| **Recipes** | Recipe, RecipeCategory, Ingredient, IngredientCategory, RecipeIngredient | Recipe management with ingredients and nutrition |
| **Email** | EmailTemplate, EmailLog, EmailCampaign, EmailCampaignRecipient | Templated emails and marketing campaigns |
| **Messaging** | Conversation, Message, ConversationLabel | Dietitian-patient messaging |
| **Journal** | JournalEntry, JournalComment | Patient food/health journal with comments |
| **AI** | AIPrompt | Configurable AI prompts for various features |
| **Auth** | User, Role, Permission, RolePermission, RefreshToken, ApiKey | RBAC with JWT auth |
| **Finance** | Client, Quote, QuoteItem, Expense, AccountingEntry | Quotes, expenses, accounting |
| **Consultation** | ConsultationTemplate, ConsultationTemplateItem, ConsultationNote, ConsultationNoteEntry | Structured consultation note templates |
| **UI Config** | SidebarMenuConfig, SidebarCategory, SidebarSection, DashboardPreference, Theme | Customizable UI layout and themes |

## Patient Portal

The patient portal (`/portal/*` routes) provides a patient-facing interface:
- Dashboard, measures, visits, documents, recipes, journal, messages, invoices, profile
- Portal routes use `PatientProtectedRoute` component
- Backend portal routes use `portalScope` middleware to restrict data access
- Patient users have the `PATIENT` role with limited permissions

<use_interesting_fonts>
Typography instantly signals quality. Avoid using boring, generic fonts.

Never use: Inter, Roboto, Open Sans, Lato, default system fonts

Here are some examples of good, impactful choices:
- Code aesthetic: JetBrains Mono, Fira Code, Space Grotesk
- Editorial: Playfair Display, Crimson Pro
- Technical: IBM Plex family, Source Sans 3
- Distinctive: Bricolage Grotesque, Newsreader

Pairing principle: High contrast = interesting. Display + monospace, serif + geometric sans, variable font across weights.

Use extremes: 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x.

Pick one distinctive font, use it decisively. Load from Google Fonts.
</use_interesting_fonts>

<always_use_solarpunk_theme>
Always design with Solarpunk aesthetic:
- Warm, optimistic color palettes (neutral bleu, golds, earth tones)
- Organic shapes mixed with technical elements
- Nature-inspired patterns and textures
- Bright, hopeful atmosphere
- Retro-futuristic typography
</always_use_solarpunk_theme>
