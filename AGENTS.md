# AGENTS.md

## Project Overview

NutriVault is a nutrition management platform for dietitians, assistants, and patients. It provides secure user authentication, patient and visit management, billing, and document storage. The system is built as a monorepo with a Node.js/Express backend and a React (Vite) frontend. SQLite is used for development; PostgreSQL is supported for production. Internationalization (i18n) is implemented for English and French.

**Key Technologies:**
- Node.js (Express)
- React (Vite)
- Sequelize ORM
- SQLite (dev) / PostgreSQL (prod)
- i18next (i18n)
- Jest, Playwright, Cypress, and pytest (testing)

## Setup Commands

### Install dependencies
```bash
# From repository root
cd backend && npm install
cd ../frontend && npm install
```

### Database setup
```bash
# Migrate and seed database (dev)
cd backend && npm run db:migrate && npm run db:seed
```

### Environment variables
- Copy `.env.example` to `.env` in both backend and frontend folders and update values as needed.

## Development Workflow

### Start development servers
```bash
# Backend (port 3001)
cd backend && npm run dev
# Frontend (port 5173)
cd frontend && npm run dev
```

### Hot reload
- Both backend and frontend use hot reload by default (`nodemon` for backend, Vite for frontend).

### Internationalization (i18n)
- **Translation Agent**: Automatically maintains English and French translations
- **Trigger**: Runs on frontend file modifications/creations
- **Files Updated**: `frontend/src/locales/en.json`, `frontend/src/locales/fr.json`
- **Requirements**: All user-facing strings must use `t()` translation keys
- **Manual Execution**: Run translation agent via `.github/prompts/frontend-translation-agent.prompt.md`
- **Quick Check**: Run `./run-translation-agent.sh` to check for untranslated strings
- **Git Integration**: Pre-commit hook automatically checks translations (see `hooks/README.md`)

### Build for production
```bash
cd frontend && npm run build
```

## Testing Instructions

### Run all tests
```bash
# Backend unit/integration tests
cd backend && npm test
# Frontend unit tests
cd frontend && npm test
# Frontend E2E tests
cd frontend && npm run test:e2e
```

### API endpoint testing
- Use scripts in repository root (e.g., `test-auth.sh`, `test-billing.sh`).
- Always clean up ports before running server-based tests:
  ```bash
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  ```

### Test file locations
- Backend: `backend/test-*.js`, `backend/tests/`
- Frontend: `frontend/src/__tests__/`, `frontend/tests/`

### Coverage
- Run `npm run coverage` in backend/frontend for coverage reports.

## Code Style Guidelines

- **Languages:** JavaScript (Node.js, React), Python (tests)
- **Linting:** ESLint (`npm run lint`)
- **Formatting:** Prettier (`npm run format`)
- **Naming:**
  - Components: `PascalCase`
  - Files: `camelCase` for JS/TS, `snake_case` for Python
  - Folders: `kebab-case`
- **Tests:** Use `pytest` for Python, Jest for JS/TS
- **Imports:** Use absolute imports for shared modules
- **Accessibility:** Follow WCAG 2.2 AA (see `.github/instructions/a11y.instructions.md`)
- **Internationalization:** All user-facing strings must use i18n translation keys

## Build and Deployment

### Build process
```bash
cd frontend && npm run build
```
- Output: `frontend/dist/`

### Environment configs
- Use `.env` files for secrets and environment-specific settings

### Deployment
- Backend: Deploy Node.js server (Express)
- Frontend: Deploy static files from `dist/`
- Database: Use PostgreSQL for production
- CI/CD: See `.github/workflows/` for pipeline details

## Security Considerations

- All secrets must be stored in `.env` (never commit secrets)
- Authentication: JWT-based, with refresh tokens
- RBAC: Role-based access control enforced in backend and frontend
- Permissions: See `models/Role.js`, `models/Permission.js`, and `.github/instructions/lessons-learned.instructions.md`
- Sensitive endpoints require authentication and proper role

## Debugging and Troubleshooting

- Common issues and solutions are documented in `.github/instructions/lessons-learned.instructions.md`
- Use diagnostic logging patterns (see lessons-learned)
- For port issues, always clean up with `lsof -ti:<port> | xargs kill -9`
- For database path issues, verify absolute paths in `config/database.js`
- For API response issues, inspect actual response structure in browser DevTools

## Pull Request Guidelines

- Title format: `[component] Brief description`
- Required checks: `npm run lint`, `npm test`
- All new files must be added to `README.md`
- Follow commit message conventions (see `.github/copilot-instructions.md`)

## Additional Notes

- All frontend strings must use i18n translation keys (see lessons-learned)
- Accessibility is a priority; review with [Accessibility Insights](https://accessibilityinsights.io/)
- For monorepo navigation, use top-level folders (`backend/`, `frontend/`, etc.)
- For agent-specific instructions, see `.github/instructions/` and `AGENTS.md` in subprojects if present
- **Translation Agent**: See `.github/prompts/frontend-translation-agent.prompt.md` for i18n maintenance
- Update this file as project evolves
