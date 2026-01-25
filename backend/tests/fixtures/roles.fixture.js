/**
 * Roles Fixtures
 * Test data for role-related tests
 */

/**
 * System roles (seeded in testDb.seedBaseData)
 */
const systemRoles = {
  admin: {
    id: 1,
    name: 'ADMIN',
    description: 'Administrator with full access',
    is_system_role: true,
    is_active: true
  },
  dietitian: {
    id: 2,
    name: 'DIETITIAN',
    description: 'Dietitian with patient access',
    is_system_role: true,
    is_active: true
  },
  assistant: {
    id: 3,
    name: 'ASSISTANT',
    description: 'Assistant with limited access',
    is_system_role: true,
    is_active: true
  }
};

/**
 * Valid custom role
 */
const validRole = {
  name: 'VIEWER',
  description: 'Viewer role with read-only access',
  is_active: true
};

/**
 * Custom roles for testing
 */
const customRoles = [
  {
    name: 'VIEWER',
    description: 'Viewer role with read access',
    is_active: true
  }
];

/**
 * Invalid role data
 */
const invalidRoles = {
  missingName: {
    description: 'Role without name',
    is_active: true
  },
  duplicateName: {
    name: 'ADMIN', // Already exists
    description: 'Duplicate admin role',
    is_active: true
  },
  emptyName: {
    name: '',
    description: 'Role with empty name',
    is_active: true
  },
  nameTooLong: {
    name: 'A'.repeat(100), // Exceeds max length
    description: 'Role with very long name',
    is_active: true
  }
};

/**
 * Role update data
 */
const roleUpdates = {
  updateDescription: {
    description: 'Updated role description'
  },
  deactivate: {
    is_active: false
  },
  activate: {
    is_active: true
  },
  updateName: {
    name: 'UPDATED_ROLE_NAME'
  }
};

/**
 * Permission assignments
 */
const permissionAssignments = {
  // Read-only permissions
  readOnly: [
    'patients.read',
    'visits.read',
    'billing.read'
  ],
  // Full patient management
  patientManagement: [
    'patients.create',
    'patients.read',
    'patients.update',
    'patients.delete'
  ],
  // Billing permissions
  billing: [
    'billing.create',
    'billing.read',
    'billing.update',
    'billing.delete'
  ],
  // Admin permissions
  admin: [
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'roles.create',
    'roles.read',
    'roles.update',
    'roles.delete',
    'admin.settings'
  ]
};

/**
 * Role with permissions
 */
const roleWithPermissions = {
  role: {
    name: 'VIEWER',
    description: 'Custom role with specific permissions',
    is_active: true
  },
  permissions: ['patients.read', 'patients.update', 'visits.read', 'visits.create']
};

/**
 * Permission categories (for reference)
 */
const permissionCategories = [
  'patients',
  'visits',
  'billing',
  'users',
  'roles',
  'custom_fields',
  'measures',
  'email_templates',
  'billing_templates',
  'invoice_customization',
  'export',
  'admin'
];

module.exports = {
  systemRoles,
  validRole,
  customRoles,
  invalidRoles,
  roleUpdates,
  permissionAssignments,
  roleWithPermissions,
  permissionCategories
};
