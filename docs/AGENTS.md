<!-- # Repository Guidelines

## Project Structure & Module Organization
- `backend/` contains the Express API, Sequelize models, migrations, seeders, and tests (`backend/tests/`, `backend/test-*.js`).
- `frontend/` contains the Vite React app, UI pages/components, i18n files (`frontend/src/locales/en.json`, `frontend/src/locales/fr.json`), and tests (`frontend/src/__tests__/`, `frontend/tests/`).
- Root-level folders such as `migrations/`, `seeders/`, `models/`, `utils/`, and `docs/` support shared tooling and documentation.
- Static uploads live in `uploads/` and `temp_uploads/` during development.

## Build, Test, and Development Commands
- `cd backend && npm run dev` starts the API (port 3001) with nodemon.
- `cd frontend && npm run dev` starts the Vite app (port 5173).
- `cd backend && npm run db:migrate && npm run db:seed` sets up the dev database.
- `cd frontend && npm run build` creates production assets in `frontend/dist/`.

## Coding Style & Naming Conventions
- JavaScript is standard; follow ESLint (`npm run lint`) and Prettier (`npm run format`).
- Components use `PascalCase`; JS/TS files use `camelCase`; folders use `kebab-case`.
- All user-facing strings must use i18n keys via `t()`. Run `./run-translation-agent.sh` to validate translations.

## Testing Guidelines
- Backend tests use Jest; frontend uses Jest plus Playwright/Cypress for E2E.
- Run `npm test` in each package; use `npm run test:e2e` in `frontend/` for browser tests.
- Keep tests near features and use descriptive names (e.g., `patientVisit.test.js`).

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`) with short, imperative summaries.
- PR titles follow `[component] Brief description`. Include linked issues and UI screenshots when applicable.
- Required checks: `npm run lint` and `npm test`. Add new files to `README.md` when introduced.

## Security & Configuration Tips
- Never commit secrets; use `.env` files in `backend/` and `frontend/`.
- Verify database paths in `config/database.js` if migrations fail.
- Clean up dev ports before running server-based tests: `lsof -ti:3001 | xargs kill -9` (and 5173). -->
