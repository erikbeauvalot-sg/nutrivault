# Claude Code Instructions for NutriVault

## Development Workflow

### After Implementing ANY Feature

After completing any feature implementation (frontend or backend):

1. **Check IDE diagnostics** - Use `mcp__ide__getDiagnostics` to identify TypeScript/JSX/JS errors
2. **Restart backend if needed** - Kill existing process and restart: `lsof -ti:3001 | xargs kill -9; cd backend && npm run dev`
3. **Check backend logs** - Monitor `/tmp/nutrivault-backend.log` for errors after server restart
4. **Test the API endpoint** - If backend changes, verify the endpoint works (check logs for errors)
5. **Verify frontend loads** - Check browser console (F12) for React errors, network failures, runtime exceptions
6. **Check for 500 errors** - Use browser dev tools to ensure no API calls return 500 status codes
7. **Check i18n** - Ensure all UI strings
8. **Check UI** - Verify the feature works as expected in the UI, no visual bugs or broken interactions
9. **Update Unit tests** - If applicable, add or update unit tests for the new feature
10. **Update UI tests** - If applicable, add or update UI tests for the new feature
11. **Update fonctional tests** - If applicable, add or update functional tests for the new feature
12. **Only then, tell the user the feature is ready** - If any errors are found in steps 1-5, fix them before confirming completion to the user


** Release Builds:**
- Always test the production build locally before telling the user it's ready
- "COMMIT PATCH" to trigger the commit of current changes, push them and then create a new release with incremeting only the 'patch version' (e.g. 1.0.0 -> 1.0.1) to trigger the release build process
- "COMMIT MINOR" to trigger the commit of current changes, push them and then create a new release with incremeting only the 'minor version' (e.g. 1.0.0 -> 1.1.0) to trigger the release build process
- "COMMIT MAJOR" to trigger the commit of current changes, push them and then create a new release with incremeting only the 'major version' (e.g. 1.0.0 -> 2.0.0) to trigger the release build process

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

## Production Deployment

**IMPORTANT: Always use the deployment script, never run Docker commands locally for production!**

Production runs on a VM with hostname `sd-161616`. To deploy:
a script on the vm is availeble : 
```bash
./Update.sh
```

This script will:
 cd /opt/nutrivault && git pull origin main && ./scripts/deploy-bare-metal.sh -y

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