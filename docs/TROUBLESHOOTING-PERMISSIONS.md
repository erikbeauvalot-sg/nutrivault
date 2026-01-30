# Troubleshooting Guide - Permission Issues

## Error: "Échec du chargement des patients" (Failed to load patients)

### Symptom
- User with DIETITIAN role cannot see the patient list
- Error message: "common.error: Échec du chargement des patients"
- Empty patient list or error screen

### Root Cause
The DIETITIAN role is missing the `patients.read` permission required to view patients.

### Quick Fix

#### 1. Check the User's Permissions

```bash
./check-user-permissions.sh <username>
```

This will show:
- User's role
- All permissions assigned to that role
- Specific check for patient permissions

#### 2. Fix DIETITIAN Role Permissions

```bash
./fix-dietitian-permissions.sh
```

This will:
- Assign all required permissions to the DIETITIAN role
- Show which users are affected
- Remind users to log out and back in

#### 3. Ask User to Re-login

**IMPORTANT:** Users must log out and log back in for permission changes to take effect.

The JWT token contains the permissions and is only refreshed on login.

### Detailed Diagnostics

#### List All Users

```bash
./list-all-users.sh
```

Shows:
- All users with their roles
- Permission count for each user
- Users without roles or permissions

#### Check Roles and Permissions

```bash
./check-roles-permissions.sh
```

Shows:
- All roles in system
- All permissions in system
- Role-permission associations

#### Initialize Missing Permissions

```bash
./init-roles-permissions.sh
```

Creates:
- All system roles (ADMIN, DIETITIAN, SECRETARY)
- All 26 system permissions
- Proper role-permission associations

## Expected Permissions by Role

### ADMIN
- **All permissions** (26 total)
- Full access to entire system

### DIETITIAN
- **Patients:** create, read, update, delete (4)
- **Visits:** create, read, update, delete (4)
- **Documents:** upload, read, download, update, delete, share (6)
- **Reports:** view, export (2)
- **Total:** 16 permissions

### SECRETARY
- **Patients:** read (1)
- **Visits:** create, read, update (3)
- **Billing:** read (1)
- **Documents:** read (1)
- **Total:** 6 permissions

## Common Issues

### Issue 1: User Has No Role

**Symptom:**
```
❌ No role assigned to this user!
```

**Fix:**
```bash
./assign-role-to-user.sh <username> DIETITIAN
```

### Issue 2: Role Has No Permissions

**Symptom:**
```
❌ Role has NO permissions assigned!
```

**Fix:**
```bash
./init-roles-permissions.sh
```

### Issue 3: Wrong Permissions Assigned

**Symptom:**
User has role but wrong permissions (e.g., can't read patients)

**Fix:**
```bash
./fix-dietitian-permissions.sh
```

### Issue 4: User Still Can't Access After Fix

**Cause:**
User hasn't logged out and back in.

**Solution:**
1. User must log out completely
2. Clear browser cache (optional but recommended)
3. Log back in
4. New JWT token will have updated permissions

## API Permission Checks

The backend checks permissions in two places:

### 1. Middleware (routes)
```javascript
requirePermission('patients.read')
```

### 2. Service Layer
```javascript
if (!user.permissions?.some(p => p.code === 'patients.read')) {
  throw new Error('Insufficient permissions');
}
```

## Database Schema

### Tables Involved
- `users` - User accounts
- `roles` - Role definitions (ADMIN, DIETITIAN, SECRETARY)
- `permissions` - Permission definitions (patients.read, etc.)
- `role_permissions` - Many-to-many association

### Key Queries

Check user permissions:
```sql
SELECT u.username, r.name as role, p.code as permission
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'john.doe';
```

Check role permissions:
```sql
SELECT r.name, COUNT(rp.permission_id) as perm_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name;
```

## Testing

### Test Patient Access

1. **As DIETITIAN:**
   - Should see patient list
   - Should be able to create patients
   - Should be able to edit patients
   - Should be able to delete patients

2. **As SECRETARY:**
   - Should see patient list (read-only)
   - Should NOT be able to create patients
   - Should NOT be able to edit patients
   - Should NOT be able to delete patients

### Test After Permission Fix

```bash
# 1. Check permissions
./check-user-permissions.sh dietitian-user

# 2. Expected output
✅ User should be able to view patients

# 3. Have user test in browser
# - Log out
# - Log back in
# - Navigate to /patients
# - Should see patient list without errors
```

## Logs

Check backend logs for permission errors:

```bash
docker-compose logs backend | grep -i "permission\|insufficient"
```

Common log messages:
- `Insufficient permissions to read patients`
- `User does not have permission: patients.read`
- `Permission check failed for user: <username>`

## Prevention

### For New Users

When creating a new user:

1. **Always assign a role:**
   ```bash
   ./assign-role-to-user.sh newuser DIETITIAN
   ```

2. **Verify permissions:**
   ```bash
   ./check-user-permissions.sh newuser
   ```

3. **Test access:**
   - Have user log in
   - Verify they can access expected features
   - Check no permission errors in console

### For New Deployments

After deploying to a new server:

1. **Initialize permissions:**
   ```bash
   ./init-roles-permissions.sh
   ```

2. **Create admin user:**
   ```bash
   docker exec nutrivault-backend node /app/scripts/create-admin.js "password"
   ```

3. **Verify setup:**
   ```bash
   ./check-roles-permissions.sh
   ./list-all-users.sh
   ```

## Support

If issues persist after following this guide:

1. **Check logs:**
   ```bash
   docker-compose logs backend | tail -100
   ```

2. **Verify database:**
   ```bash
   docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM permissions;"
   docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM roles;"
   docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM role_permissions;"
   ```

3. **Check migration status:**
   ```bash
   docker exec nutrivault-backend npx sequelize-cli db:migrate:status
   ```

Expected counts:
- Permissions: 26
- Roles: 3 (ADMIN, DIETITIAN, SECRETARY)
- Role_permissions: ~48 (26 for ADMIN + 16 for DIETITIAN + 6 for SECRETARY)
