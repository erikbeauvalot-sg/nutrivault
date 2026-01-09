---
description: 'Lessons learned from debugging and implementation experiences'
applyTo: '**'
---

# Lessons Learned - NutriVault Debugging & Implementation

This document captures critical lessons learned from actual debugging sessions and implementation challenges. These lessons should inform future development and prevent recurring issues.

---

## Database & ORM Issues

### Issue 1: Sequelize Database Path Resolution

**Problem**: Authentication queries returned no results despite data existing in the database. `db.sequelize.config.storage` was `undefined`.

**Root Cause**: Backend server runs from `/backend/` directory, but database config used relative path `./backend/data/nutrivault.db`. This resolved to the non-existent `backend/backend/data/nutrivault.db`.

**Solution**: Use absolute paths with `path.join(__dirname, '..', 'backend', 'data', 'nutrivault.db')` in `/config/database.js`.

**Prevention**:
- Always use `path.join(__dirname, ...)` for file paths in configuration files
- Never use relative paths like `./backend/...` that depend on process working directory
- Add diagnostic logging during development: `console.log('📁 DATABASE:', db.sequelize.config.storage)`
- Verify database connection during application startup

**Diagnostic Technique**:
```javascript
// Add to service/controller during debugging
console.log('📁 DATABASE:', db.sequelize.config.storage || db.sequelize.config.database);
console.log('🔌 DB DIALECT:', db.sequelize.config.dialect);

// Test simple query vs query with associations
const simpleUser = await db.User.findOne({ where: { username } });
console.log('Simple query result:', simpleUser ? 'FOUND' : 'NOT FOUND');
```

**Reference**: SPECIFICATIONS.md - "CRITICAL: Database Path Configuration" section

---

### Issue 2: Sequelize Association Alias Errors

**Problem**: "User is not associated to Role!" despite associations being defined in `models/index.js`.

**Root Cause**: Code used wrong association aliases. Model definitions use `as: 'role'` (singular) but code tried to include `'Role'` (capitalized).

**Common Mistakes**:
- Using capitalized aliases: `.include({ model: db.Role })` instead of `{ model: db.Role, as: 'role' }`
- Mixing singular/plural: `as: 'permissions'` but code uses `'permission'`
- Forgetting to specify `as` when including associated models

**Correct Pattern**:
```javascript
// In models/index.js - Define associations with explicit aliases
db.User.belongsTo(db.Role, {
  foreignKey: 'role_id',
  as: 'role'  // ← Singular, lowercase
});

db.Role.belongsToMany(db.Permission, {
  through: db.RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions'  // ← Plural, lowercase
});

// In service/controller code - Use exact alias from model definition
const user = await db.User.findOne({
  where: { username },
  include: [
    {
      model: db.Role,
      as: 'role',  // ← Must match model definition exactly
      include: [{
        model: db.Permission,
        as: 'permissions',  // ← Must match model definition exactly
        through: { attributes: [] }
      }]
    }
  ]
});
```

**Quick Grep Check**:
```bash
# Find all includes without explicit 'as'
grep -r "include.*model.*db\." backend/src/ | grep -v "as:"

# Find all association definitions
grep -r "belongsTo\|hasMany\|belongsToMany" models/
```

**Reference**: SPECIFICATIONS.md - "Sequelize Association Alias Errors" troubleshooting section

---

## Authentication & Security

### Issue 3: Debugging Authentication Failures

**Problem**: Login endpoint returned "Invalid credentials" but couldn't determine if issue was password comparison, user lookup, or database connection.

**Diagnostic Strategy** (Progressive Detail):

**Step 1 - Confirm Error Location**:
```javascript
try {
  // ... login logic
} catch (error) {
  console.log('🔥 Login error:', error.message);
  console.log('🔥 Stack:', error.stack);
  throw error;
}
```

**Step 2 - Add User Lookup Logging**:
```javascript
console.log('🔐 LOGIN ATTEMPT:', { username, passwordLength: password.length });

const user = await db.User.findOne({ where: { username }, include: [...] });

console.log('🔍 USER FOUND:', user ? 'YES' : 'NO');
if (user) {
  console.log('   User ID:', user.id);
  console.log('   Username:', user.username);
  console.log('   Is Active:', user.is_active);
  console.log('   Password Hash (preview):', user.password_hash.substring(0, 20) + '...');
}
```

**Step 3 - Test Password Comparison in Isolation**:
```javascript
// Create standalone test script
const bcrypt = require('bcryptjs');
const password = 'Admin123!';
const hash = '$2b$12$48itmLiAyORBXNWWUS1xr...'; // From database

bcrypt.compare(password, hash).then(result => {
  console.log('✓ BCRYPT RESULT:', result); // Should be true
});
```

**Step 4 - Test Database Connection**:
```javascript
console.log('📁 DATABASE:', db.sequelize.config.storage);
console.log('🔌 DB DIALECT:', db.sequelize.config.dialect);

const simpleUser = await db.User.findOne({ where: { username } });
console.log('Simple query result:', simpleUser ? 'FOUND' : 'NOT FOUND');
```

**Step 5 - Verify Data Directly**:
```bash
sqlite3 backend/data/nutrivault.db "SELECT username, substr(password_hash,1,50) as hash, is_active FROM users WHERE username='admin';"
```

**Lesson**: Build diagnostic complexity progressively. Start with high-level error capture, then drill down into specific components (user lookup, password comparison, database connection).

---

### Issue 4: Frontend Authentication Session Not Persisting

**Problem**: User successfully logs in and sees dashboard, but gets redirected to login page when navigating to other routes. Session appears to not persist after initial login.

**Root Cause**: Two critical mismatches between backend API structure and frontend expectations:

1. **Backend Response Structure**: Backend returns nested data in `{ success: true, data: { user, accessToken, refreshToken } }` but frontend code expected flat structure `{ success: true, user, accessToken, refreshToken }`

2. **JWT Token Content Insufficient**: JWT payload only contains minimal data (`sub`, `username`, `role_id`) but frontend tried to decode full user object including `email`, complete `role` object with permissions array. When `getCurrentUser()` decoded JWT, it returned incomplete user object causing authentication checks to fail.

**Solution**:

1. **Fix Response Extraction** in `authService.js`:
```javascript
// ❌ WRONG - extracts from wrong level
const { accessToken, refreshToken, user } = response.data;

// ✅ CORRECT - extracts from nested data object
const { accessToken, refreshToken, user } = response.data.data;
```

2. **Store Complete User Object** instead of relying on JWT decoding:
```javascript
// In authService.login()
tokenStorage.setTokens(accessToken, refreshToken, rememberMe);
tokenStorage.setUser(user, rememberMe); // ← Store full user object from response

// In authService.getCurrentUser()
// ❌ WRONG - decode from JWT (missing email, permissions)
const decoded = tokenStorage.decodeToken(token);
return { id: decoded.userId, username: decoded.username, ... };

// ✅ CORRECT - retrieve stored user object
const user = tokenStorage.getUser();
return user; // Has complete data: id, username, email, role, permissions
```

3. **Add User Storage Functions** to `tokenStorage.js`:
```javascript
const USER_KEY = 'nutrivault_user';

export const setUser = (user, rememberMe = false) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const clearUser = () => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
};
```

**Prevention**:
- **Always inspect actual API responses** during integration - don't assume structure matches documentation
- **Use browser DevTools Network tab** to see exact response format: `curl -s http://localhost:3001/api/auth/login -d '...' | jq .`
- **Decode JWTs during development** to verify what data they contain: `echo $TOKEN | cut -d. -f2 | base64 -d | jq`
- **Store complete user objects** from API responses rather than reconstructing from tokens
- **Test with fresh browser storage** - old tokens/data can mask bugs
- **Add localStorage inspection** to debug tools: `console.log(localStorage)`

**Diagnostic Technique**:
```javascript
// In browser console after login
console.log('Token:', localStorage.getItem('nutrivault_access_token'));
console.log('User:', JSON.parse(localStorage.getItem('nutrivault_user')));

// Decode JWT to see what it actually contains
const token = localStorage.getItem('nutrivault_access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('JWT payload:', payload); // Only has: sub, username, role_id, exp, iat
```

**Testing Checklist**:
- ✅ Clear browser storage before testing (`Application → Clear site data`)
- ✅ Verify login stores both tokens AND user object in storage
- ✅ Verify navigation doesn't clear stored data
- ✅ Verify page refresh preserves authentication
- ✅ Verify "Remember Me" uses localStorage vs sessionStorage correctly
- ✅ Test logout clears all stored data

**Reference**: This affects Phase 12-13 (Frontend Authentication) integration with backend auth API.

---

## Development Workflow

### Issue 5: Server Restart Requirements

**Problem**: Code changes not taking effect; forgot to restart development server.

**Solution**: Use `nodemon` for auto-reload during development.

**Package.json Scripts**:
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"  // ← Auto-reloads on file changes
  }
}
```

**When Auto-Reload Doesn't Work**:
- Changes to `.env` files (requires manual restart)
- Changes to `package.json` dependencies (run `npm install` first)
- Changes to `/models/index.js` associations (Sequelize caches these)
- Some module-level code that executes only once on require

**Verification**: After saving changes, check terminal for nodemon restart message:
```
[nodemon] restarting due to changes...
[nodemon] starting `node src/server.js`
```

---

## Testing Strategy

### Issue 6: Isolating Logic vs Integration Testing

**Problem**: Couldn't determine if authentication logic was broken or if integration with database was the issue.

**Strategy**: Create standalone test scripts to isolate components:

**Test 1 - bcrypt Logic**:
```javascript
// test-bcrypt.js
const bcrypt = require('bcryptjs');
const password = 'Admin123!';
const hash = '$2b$12$...'; // Copy from database

bcrypt.compare(password, hash).then(result => {
  console.log('Password match:', result);
  process.exit(result ? 0 : 1);
});
```

**Test 2 - Database Query**:
```javascript
// test-db-query.js
const db = require('./models');

db.User.findOne({ where: { username: 'admin' } })
  .then(user => {
    console.log('User found:', !!user);
    if (user) console.log('User details:', user.toJSON());
    process.exit(user ? 0 : 1);
  });
```

**Test 3 - Service Method**:
```javascript
// test-service.js
const authService = require('./backend/src/services/auth.service');

authService.login('admin', 'Admin123!')
  .then(result => {
    console.log('Login successful:', !!result.accessToken);
    process.exit(0);
  })
  .catch(error => {
    console.error('Login failed:', error.message);
    process.exit(1);
  });
```

**Lesson**: When integration tests fail, create minimal standalone tests to isolate which component is actually broken. This prevents chasing ghosts in the wrong part of the codebase.

---

### Issue 7: Testing with Running Servers

**Problem**: Tests that require backend and/or frontend servers running can interfere with development workflow if servers are stopped/restarted automatically.

**Critical Rules for AI Agents**:

1. **NEVER stop or restart servers** - Backend and frontend servers are assumed to be running in separate terminals managed by the user
2. **NEVER start servers yourself** - If a server is not running, ask the user to start it and wait for confirmation
3. **Request user actions explicitly** - For any server-related operations (restart, check status, etc.), ask the user to perform them
4. **Wait for user confirmation** - Do not proceed with tests until the user confirms servers are ready

**Correct Workflow**:
```
Agent: "I need to test the login endpoint. Please confirm:
        1. Backend server is running on port 3001
        2. You can see the server output in your terminal
        
        Once confirmed, I'll proceed with curl tests."

User: "Confirmed, backend is running"

Agent: [Proceeds with curl test commands]
```

**Wrong Workflow**:
```
❌ Agent: "Starting backend server..."
   [Uses run_in_terminal to start npm run dev]
   
❌ Agent: "Restarting backend to apply changes..."
   [Kills and restarts server]
```

**Why This Matters**:
- User may be actively developing and watching server logs
- Stopping servers disrupts user's workflow and debugging
- User has better control over which terminal shows which server
- Servers may require specific environment setup that agent doesn't know about
- User can manually apply hot-reload or restart when they're ready

**Exception**: Creating standalone test scripts that don't require servers (like bcrypt tests, database query tests) can run independently.

**Lesson**: Respect the user's development environment. Ask, don't assume. Wait for confirmation before proceeding.

---

## Diagnostic Logging Best Practices

### Effective Diagnostic Logging During Development

**Use Visual Markers** (emojis for quick scanning):
- 🔥 Errors and exceptions
- 🔐 Authentication attempts
- 🔍 Query results and lookups
- ✅ Successful operations
- ❌ Failed operations
- 📁 File and path information
- 🔌 Connection information
- 🔑 Security-related operations (be careful not to log secrets!)

**Log Structure** (provide context at multiple levels):
```javascript
// High level - What operation?
console.log('🔐 LOGIN ATTEMPT:', { username, passwordLength: password.length });

// Mid level - What was found?
console.log('🔍 USER FOUND:', user ? 'YES' : 'NO');

// Detail level - Specific data (safe preview)
if (user) {
  console.log('   User ID:', user.id);
  console.log('   Is Active:', user.is_active);
  console.log('   Hash preview:', user.password_hash.substring(0, 20) + '...');
}

// Result level - What happened?
console.log('✅ LOGIN SUCCESSFUL:', { userId: user.id, tokenType: 'JWT' });
```

**Remove Diagnostic Logging** after issue is resolved:
- Diagnostic logs add noise to production
- May expose sensitive information
- Commit the fix, not the debug scaffolding

---

## Git & Version Control

### Issue 6: Committing Fixes Properly

**Good Practice**:
```bash
# Fix the issue
git add backend/src/services/auth.service.js
git add backend/src/middleware/authenticate.js
git add models/index.js
git add config/database.js

# Commit with clear message
git commit -m "fix: Correct Sequelize association aliases and database path

- Fixed User->Role association alias ('role' not 'Role')
- Fixed Role->Permission association alias in auth code
- Changed database.js to use absolute path with path.join()
- Prevents 'not associated' errors and path resolution issues"
```

**Bad Practice**:
- Committing diagnostic logging code
- Vague commit messages: "fix bug"
- Mixing unrelated changes in one commit
- Not referencing related issues or tickets

---

## Summary of Key Takeaways

1. **Always use absolute paths** in configuration files using `path.join(__dirname, ...)`
2. **Match Sequelize association aliases exactly** between model definitions and query includes
3. **Use progressive diagnostic logging** to isolate issues (start broad, narrow down)
4. **Create standalone test scripts** to isolate component logic from integration issues
5. **Use nodemon during development** for automatic server reloads
6. **Add visual markers (emojis)** to logs for quick scanning during debugging
7. **Verify database connection early** when queries return unexpected results
8. **Remove diagnostic code** before committing fixes
9. **Test the fix thoroughly** before considering the issue resolved
10. **Document lessons learned** to prevent recurring issues
11. **Never stop or restart user's servers** - Always ask user to manage their own development servers
12. **Always inspect actual API response structure** - don't assume it matches expectations
13. **Store complete data from API responses** - don't reconstruct from limited JWT payloads
14. **Test with fresh browser storage** - clear localStorage/sessionStorage to catch bugs

---

## When to Apply These Lessons

- **During implementation Phase**: Authentication, authorization, data access layers
- **When adding new Sequelize models**: Verify association aliases are consistent
- **When database queries return no results**: Check database path configuration first
- **When authentication fails mysteriously**: Use progressive diagnostic logging strategy
- **When integrating frontend with backend APIs**: Always inspect actual response structure with curl/DevTools
- **When authentication works once but fails on navigation**: Check if user data is properly persisted in storage
- **When JWT tokens are involved**: Decode them to verify they contain expected data

---

**Last Updated**: January 9, 2026  
**Next Review**: After completing Phase 1

**Last Updated**: January 9, 2026  
**Next Review**: After completing Phase 4 implementation
