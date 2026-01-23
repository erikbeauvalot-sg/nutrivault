# Implementation Plan: US-5.1.1 - RBAC Management UI

**User Story**: Sprint 1: RBAC Management UI (US-5.1.1)
**Status**: In Progress
**Branch**: `feature/US-5.1.1-rbac-ui`
**Developer**: TBD
**Estimated Effort**: 5-7 days

---

## Overview

Build an admin interface for managing user roles and permissions. The backend RBAC system is already complete, so this task focuses on creating the frontend UI.

---

## Acceptance Criteria

- [ ] New page `/settings/roles` with list of roles
- [ ] Create/Edit role modal with permission checkboxes organized by resource
- [ ] User management page shows role assignment dropdown
- [ ] Real-time permission updates reflected in UI
- [ ] Audit log entries for role/permission changes

---

## Technical Analysis

### Existing Backend Infrastructure ✅

**Models** (already implemented in `/models/`):
- `Role.js` - UUID, name (ADMIN/DIETITIAN/ASSISTANT/VIEWER), description, is_active
- `Permission.js` - UUID, code, resource, action, description, is_active
- `RolePermission.js` - Junction table for many-to-many

**Existing Endpoints** (in `/backend/src/routes/users.js`):
- ✅ `GET /api/users/roles` - Get all active roles

**Missing Endpoints** (need to add):
- ❌ `POST /api/roles` - Create new role
- ❌ `PUT /api/roles/:id` - Update role
- ❌ `DELETE /api/roles/:id` - Delete role
- ❌ `GET /api/permissions` - Get all permissions
- ❌ `PUT /api/roles/:id/permissions` - Update role permissions

**RBAC Middleware** (already in `/backend/src/middleware/rbac.js`):
- ✅ `requireRole('ADMIN')` - Can be used to protect new endpoints

---

## Implementation Plan

### Phase 1: Backend Endpoints (1-2 days)

#### Step 1.1: Create Role Routes

**File**: `/backend/src/routes/roles.js` (new file)

```javascript
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const roleController = require('../controllers/roleController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// GET /api/roles - Get all roles
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  roleController.getRoles
);

// GET /api/roles/:id - Get role by ID with permissions
router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  roleController.getRoleById
);

// POST /api/roles - Create new role (Admin only)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  [
    body('name')
      .trim()
      .notEmpty()
      .isIn(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'])
      .withMessage('Role name must be one of: ADMIN, DIETITIAN, ASSISTANT, VIEWER'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
  ],
  validate,
  roleController.createRole
);

// PUT /api/roles/:id - Update role (Admin only)
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  [
    param('id').isUUID(),
    body('name')
      .optional()
      .trim()
      .isIn(['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER']),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('is_active')
      .optional()
      .isBoolean()
  ],
  validate,
  roleController.updateRole
);

// PUT /api/roles/:id/permissions - Update role permissions (Admin only)
router.put(
  '/:id/permissions',
  authenticate,
  requireRole('ADMIN'),
  [
    param('id').isUUID(),
    body('permission_ids')
      .isArray()
      .withMessage('permission_ids must be an array'),
    body('permission_ids.*')
      .isUUID()
      .withMessage('Each permission ID must be a valid UUID')
  ],
  validate,
  roleController.updateRolePermissions
);

// DELETE /api/roles/:id - Delete role (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validate,
  roleController.deleteRole
);

// GET /api/permissions - Get all permissions (Admin only)
router.get(
  '/all/permissions', // Note: 'all' prefix to avoid conflict with /:id
  authenticate,
  requireRole('ADMIN'),
  roleController.getAllPermissions
);

module.exports = router;
```

#### Step 1.2: Create Role Controller

**File**: `/backend/src/controllers/roleController.js` (new file)

```javascript
const roleService = require('../services/role.service');

function getRequestMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.originalUrl
  };
}

exports.getRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getRoles();
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const user = req.user;
    const roleData = req.body;
    const metadata = getRequestMetadata(req);

    const role = await roleService.createRole(user, roleData, metadata);
    res.status(201).json({ success: true, data: role, message: 'Role created successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const user = req.user;
    const roleId = req.params.id;
    const updateData = req.body;
    const metadata = getRequestMetadata(req);

    const role = await roleService.updateRole(user, roleId, updateData, metadata);
    res.json({ success: true, data: role, message: 'Role updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateRolePermissions = async (req, res, next) => {
  try {
    const user = req.user;
    const roleId = req.params.id;
    const { permission_ids } = req.body;
    const metadata = getRequestMetadata(req);

    const role = await roleService.updateRolePermissions(user, roleId, permission_ids, metadata);
    res.json({ success: true, data: role, message: 'Role permissions updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const user = req.user;
    const roleId = req.params.id;
    const metadata = getRequestMetadata(req);

    await roleService.deleteRole(user, roleId, metadata);
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await roleService.getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
};
```

#### Step 1.3: Create Role Service

**File**: `/backend/src/services/role.service.js` (new file)

```javascript
const db = require('../../../models');
const Role = db.Role;
const Permission = db.Permission;
const RolePermission = db.RolePermission;
const auditService = require('./audit.service');

async function getRoles() {
  return await Role.findAll({
    where: { is_active: true },
    include: [{
      model: Permission,
      as: 'permissions',
      through: { attributes: [] }
    }],
    order: [['name', 'ASC']]
  });
}

async function getRoleById(roleId) {
  const role = await Role.findByPk(roleId, {
    include: [{
      model: Permission,
      as: 'permissions',
      through: { attributes: [] }
    }]
  });

  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  return role;
}

async function createRole(user, roleData, requestMetadata) {
  // Check for duplicate role name
  const existing = await Role.findOne({ where: { name: roleData.name } });
  if (existing) {
    const error = new Error('Role with this name already exists');
    error.statusCode = 409;
    throw error;
  }

  const role = await Role.create(roleData);

  // Audit log
  await auditService.log({
    action: 'ROLE_CREATE',
    user_id: user.id,
    resource_type: 'Role',
    resource_id: role.id,
    details: { role_name: role.name },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  return role;
}

async function updateRole(user, roleId, updateData, requestMetadata) {
  const role = await Role.findByPk(roleId);
  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent renaming to existing role name
  if (updateData.name && updateData.name !== role.name) {
    const existing = await Role.findOne({ where: { name: updateData.name } });
    if (existing) {
      const error = new Error('Role with this name already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  await role.update(updateData);

  // Audit log
  await auditService.log({
    action: 'ROLE_UPDATE',
    user_id: user.id,
    resource_type: 'Role',
    resource_id: role.id,
    details: { changes: updateData },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  return role;
}

async function updateRolePermissions(user, roleId, permissionIds, requestMetadata) {
  const role = await getRoleById(roleId);

  // Delete existing permissions for this role
  await RolePermission.destroy({ where: { role_id: roleId } });

  // Add new permissions
  const rolePermissions = permissionIds.map(permId => ({
    role_id: roleId,
    permission_id: permId
  }));

  if (rolePermissions.length > 0) {
    await RolePermission.bulkCreate(rolePermissions);
  }

  // Audit log
  await auditService.log({
    action: 'ROLE_PERMISSIONS_UPDATE',
    user_id: user.id,
    resource_type: 'Role',
    resource_id: role.id,
    details: { permission_count: permissionIds.length },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });

  // Reload role with updated permissions
  return await getRoleById(roleId);
}

async function deleteRole(user, roleId, requestMetadata) {
  const role = await Role.findByPk(roleId);
  if (!role) {
    const error = new Error('Role not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if role is in use
  const db = require('../../../models');
  const User = db.User;
  const usersWithRole = await User.count({ where: { role_id: roleId } });

  if (usersWithRole > 0) {
    const error = new Error(`Cannot delete role: ${usersWithRole} user(s) are assigned to this role`);
    error.statusCode = 409;
    throw error;
  }

  // Soft delete by setting is_active to false
  await role.update({ is_active: false });

  // Audit log
  await auditService.log({
    action: 'ROLE_DELETE',
    user_id: user.id,
    resource_type: 'Role',
    resource_id: role.id,
    details: { role_name: role.name },
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent
  });
}

async function getAllPermissions() {
  return await Permission.findAll({
    where: { is_active: true },
    order: [['resource', 'ASC'], ['action', 'ASC']]
  });
}

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
  getAllPermissions
};
```

#### Step 1.4: Update Model Associations

**File**: `/models/index.js` (update existing)

Add associations for Role and Permission:

```javascript
// Add to existing associations section
db.Role.belongsToMany(db.Permission, {
  through: db.RolePermission,
  as: 'permissions',
  foreignKey: 'role_id',
  otherKey: 'permission_id'
});

db.Permission.belongsToMany(db.Role, {
  through: db.RolePermission,
  as: 'roles',
  foreignKey: 'permission_id',
  otherKey: 'role_id'
});
```

#### Step 1.5: Register Routes

**File**: `/backend/src/app.js` or `/backend/src/index.js` (update existing)

```javascript
const roleRoutes = require('./routes/roles');
app.use('/api/roles', roleRoutes);
```

---

### Phase 2: Frontend Service (0.5 day)

#### Step 2.1: Create Role Service

**File**: `/frontend/src/services/roleService.js` (new file)

```javascript
import api from './api';

/**
 * Get all roles
 */
export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data.data;
};

/**
 * Get role by ID
 */
export const getRoleById = async (id) => {
  const response = await api.get(`/roles/${id}`);
  return response.data.data;
};

/**
 * Create new role
 */
export const createRole = async (roleData) => {
  const response = await api.post('/roles', roleData);
  return response.data.data;
};

/**
 * Update role
 */
export const updateRole = async (id, updateData) => {
  const response = await api.put(`/roles/${id}`, updateData);
  return response.data.data;
};

/**
 * Update role permissions
 */
export const updateRolePermissions = async (id, permissionIds) => {
  const response = await api.put(`/roles/${id}/permissions`, {
    permission_ids: permissionIds
  });
  return response.data.data;
};

/**
 * Delete role
 */
export const deleteRole = async (id) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};

/**
 * Get all permissions
 */
export const getAllPermissions = async () => {
  const response = await api.get('/roles/all/permissions');
  return response.data.data;
};

export default {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
  getAllPermissions
};
```

---

### Phase 3: Frontend UI Components (2-3 days)

#### Step 3.1: Create Roles Management Page

**File**: `/frontend/src/pages/RolesManagementPage.jsx` (new file)

Template: Copy from `UsersPage.jsx` and adapt

Key features:
- Table with columns: Role Name, Description, # Users, # Permissions, Actions
- Filter/search bar
- Create Role button
- Edit/Delete actions per row
- Mobile-responsive Card view fallback

#### Step 3.2: Create Role Modal

**File**: `/frontend/src/components/RoleModal.jsx` (new file)

Template: Copy from `UserModal.jsx` and adapt

Key features:
- Create/Edit modes
- Form fields: name (dropdown), description (textarea)
- Permission tree (grouped by resource)
- Checkboxes for each permission
- Validation: name required, description max 500 chars
- Success/error feedback

#### Step 3.3: Create Permission Tree Component

**File**: `/frontend/src/components/PermissionTree.jsx` (new file)

Structure permissions by resource:
- Accordion or Collapsible sections per resource
- Checkbox "Select All" per resource
- Individual checkboxes per permission (resource.action)
- Display format: "Create Patients" (from "patients.create")

#### Step 3.4: Update User Modal

**File**: `/frontend/src/components/UserModal.jsx` (update existing)

Update role dropdown to show role names and descriptions:
```jsx
<Form.Select
  {...register('role_id')}
  isInvalid={!!errors.role_id}
>
  <option value="">{t('users.selectRole', 'Select role...')}</option>
  {roles.map(role => (
    <option key={role.id} value={role.id}>
      {role.name} {role.description && `- ${role.description}`}
    </option>
  ))}
</Form.Select>
```

---

### Phase 4: Routing & Navigation (0.5 day)

#### Step 4.1: Update App.jsx Routing

```jsx
const RolesManagementPage = React.lazy(() => import('./pages/RolesManagementPage'));

// Add route
<Route
  path="/settings/roles"
  element={
    <ProtectedRoute>
      <RolesManagementPage />
    </ProtectedRoute>
  }
/>
```

#### Step 4.2: Add Navigation Link

Update sidebar/navbar to include:
- Settings dropdown with "Manage Roles" link (visible to ADMIN only)
- Link to `/settings/roles`

---

### Phase 5: Translations (0.5 day)

**File**: `/frontend/src/locales/en/translation.json` and `fr/translation.json`

Add keys:
```json
{
  "roles": {
    "title": "Manage Roles",
    "createRole": "Create Role",
    "editRole": "Edit Role",
    "roleName": "Role Name",
    "description": "Description",
    "permissions": "Permissions",
    "permissionCount": "{{count}} permissions",
    "selectAll": "Select All",
    "deselectAll": "Deselect All",
    "confirmDelete": "Are you sure you want to delete this role?",
    "cannotDelete": "Cannot delete role: users are assigned to it",
    "createSuccess": "Role created successfully",
    "updateSuccess": "Role updated successfully",
    "deleteSuccess": "Role deleted successfully"
  },
  "permissions": {
    "patients": "Patients",
    "visits": "Visits",
    "billing": "Billing",
    "documents": "Documents",
    "users": "Users",
    "reports": "Reports",
    "system": "System",
    "create": "Create",
    "read": "Read",
    "update": "Update",
    "delete": "Delete"
  }
}
```

---

### Phase 6: Testing (1 day)

#### Unit Tests
- [ ] Service functions (create, update, delete roles)
- [ ] Permission validation
- [ ] Form validation

#### Integration Tests
- [ ] API endpoints (roles CRUD)
- [ ] Permission assignment flow
- [ ] Role deletion with validation

#### E2E Tests
- [ ] Admin can create role
- [ ] Admin can assign permissions to role
- [ ] Admin can edit role
- [ ] Admin can delete unused role
- [ ] Cannot delete role in use

---

## Files to Create

### Backend
1. `/backend/src/routes/roles.js`
2. `/backend/src/controllers/roleController.js`
3. `/backend/src/services/role.service.js`

### Frontend
1. `/frontend/src/services/roleService.js`
2. `/frontend/src/pages/RolesManagementPage.jsx`
3. `/frontend/src/components/RoleModal.jsx`
4. `/frontend/src/components/PermissionTree.jsx`

### Updates
1. `/models/index.js` - Add associations
2. `/backend/src/app.js` - Register routes
3. `/frontend/src/App.jsx` - Add routing
4. `/frontend/src/components/UserModal.jsx` - Enhance role dropdown
5. `/frontend/src/locales/*/translation.json` - Add translations

---

## Estimated Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Backend | 1-2 days | Routes, controller, service, model updates |
| Phase 2: Frontend Service | 0.5 day | Role service API wrapper |
| Phase 3: UI Components | 2-3 days | Page, modals, permission tree |
| Phase 4: Routing | 0.5 day | App routing and navigation |
| Phase 5: Translations | 0.5 day | i18n keys for EN/FR |
| Phase 6: Testing | 1 day | Unit, integration, E2E tests |

**Total**: 5-7 days

---

## Definition of Done

- [x] All files created
- [ ] All backend endpoints tested with Postman
- [ ] UI matches UsersPage pattern
- [ ] Permission checkboxes organized by resource
- [ ] Role CRUD works end-to-end
- [ ] Audit logs created for all actions
- [ ] Translations added for EN and FR
- [ ] Unit tests written (80%+ coverage)
- [ ] E2E tests pass
- [ ] Code reviewed and approved
- [ ] Deployed to staging
- [ ] No console errors or warnings

---

## Next Steps

1. Create backend routes and service (Phase 1)
2. Test endpoints with Postman
3. Create frontend service (Phase 2)
4. Build UI components (Phase 3)
5. Add routing and translations (Phase 4-5)
6. Write tests (Phase 6)
7. Submit PR for review
