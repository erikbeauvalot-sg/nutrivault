# Claude Code Instructions for NutriVault

## Development Workflow

### After Implementing ANY Feature

After completing any feature implementation (frontend or backend):

1. **Check IDE diagnostics** - Use `mcp__ide__getDiagnostics` to identify TypeScript/JSX/JS errors
2. **Restart backend if needed** - Kill existing process and restart: `lsof -ti:3001 | xargs kill -9; cd backend && npm run dev`
3. **Check backend logs** - Monitor `/tmp/nutrivault-backend.log` for errors after server restart
4. **Test the API endpoint** - If backend changes, verify the endpoint works (check logs for errors)
5. **Verify frontend loads** - Check browser console (F12) for React errors, network failures, runtime exceptions

**CRITICAL**: Do NOT tell the user a feature is ready until you have:
- Restarted the backend server (if backend changes were made)
- Checked the backend logs for errors
- Verified no 500 errors from API calls

### Testing API Endpoints

When testing backend features:
1. Check logs: `tail -f /tmp/nutrivault-backend.log`
2. Look for: `Error`, `exception`, `failed`, `undefined`
3. If errors exist, fix them before telling user the feature is ready

## Project Structure

- `backend/` - Express API, Sequelize models, migrations, seeders
- `frontend/` - Vite React app, UI components, i18n files
- `models/` - Shared Sequelize models
- Root `.env` files contain configuration

## Commands

```bash
# Backend
cd backend && npm run dev    # Start API (port 3001)
cd backend && npm run db:migrate && npm run db:seed

# Frontend
cd frontend && npm run dev   # Start Vite (port 5173)
cd frontend && npm run build # Production build
```

## Coding Conventions

- Components: `PascalCase`
- Files: `camelCase`
- All UI strings must use i18n: `t('key', 'default')`
- French and English translations in `frontend/src/locales/`

## Database

- SQLite in development
- PostgreSQL in production
- Always create migrations for schema changes
- Run seeders for default data
