/**
 * Query Configuration for QueryBuilder
 *
 * Defines searchable fields, filterable fields with types,
 * sortable fields, and default sort for each resource.
 *
 * @module queryConfigs
 */

/**
 * Query configuration for patients endpoint
 */
const PATIENTS_CONFIG = {
  searchFields: ['first_name', 'last_name', 'email', 'phone'],
  filterableFields: {
    assigned_dietitian_id: { type: 'uuid' },
    is_active: { type: 'boolean' },
    date_of_birth: { type: 'date' },
    gender: { type: 'string' },
    city: { type: 'string' },
    postal_code: { type: 'string' },
    country: { type: 'string' }
  },
  sortableFields: ['created_at', 'first_name', 'last_name', 'date_of_birth', 'updated_at'],
  defaultSort: { field: 'created_at', order: 'DESC' },
  maxLimit: 100
};

/**
 * Query configuration for users endpoint
 */
const USERS_CONFIG = {
  searchFields: ['username', 'email', 'first_name', 'last_name'],
  filterableFields: {
    role_id: { type: 'uuid' },
    is_active: { type: 'boolean' },
    last_login_at: { type: 'date' },
    failed_login_attempts: { type: 'integer' },
    locked_until: { type: 'date' }
  },
  sortableFields: ['created_at', 'username', 'email', 'last_name', 'last_login_at', 'updated_at'],
  defaultSort: { field: 'created_at', order: 'DESC' },
  maxLimit: 100
};

/**
 * Query configuration for visits endpoint
 */
const VISITS_CONFIG = {
  searchFields: ['chief_complaint', 'assessment', 'recommendations', 'private_notes'],
  filterableFields: {
    patient_id: { type: 'uuid' },
    dietitian_id: { type: 'uuid' },
    status: {
      type: 'enum',
      values: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']
    },
    visit_type: {
      type: 'enum',
      values: ['INITIAL', 'FOLLOW_UP', 'EMERGENCY', 'CONSULTATION', 'TELEHEALTH']
    },
    visit_date: { type: 'date' },
    duration_minutes: { type: 'integer' },
    next_visit_date: { type: 'date' }
  },
  sortableFields: ['created_at', 'visit_date', 'status', 'duration_minutes', 'updated_at'],
  defaultSort: { field: 'visit_date', order: 'DESC' },
  maxLimit: 100
};

/**
 * Query configuration for billing endpoint
 */
const BILLING_CONFIG = {
  searchFields: ['invoice_number', 'notes'],
  filterableFields: {
    patient_id: { type: 'uuid' },
    visit_id: { type: 'uuid' },
    status: {
      type: 'enum',
      values: ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PARTIAL']
    },
    amount: { type: 'float' },
    tax_amount: { type: 'float' },
    total_amount: { type: 'float' },
    invoice_date: { type: 'date' },
    due_date: { type: 'date' },
    payment_date: { type: 'date' },
    payment_method: {
      type: 'enum',
      values: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'INSURANCE', 'BANK_TRANSFER', 'OTHER']
    },
    currency: { type: 'string' }
  },
  sortableFields: ['created_at', 'invoice_date', 'due_date', 'payment_date', 'amount', 'total_amount', 'status', 'updated_at'],
  defaultSort: { field: 'invoice_date', order: 'DESC' },
  maxLimit: 100
};

/**
 * Query configuration for audit logs endpoint
 */
const AUDIT_CONFIG = {
  searchFields: ['username', 'action', 'resource_type', 'request_path', 'error_message'],
  filterableFields: {
    user_id: { type: 'uuid' },
    action: { type: 'string' },
    resource_type: { type: 'string' },
    resource_id: { type: 'uuid' },
    status: {
      type: 'enum',
      values: ['SUCCESS', 'FAILURE', 'ERROR']
    },
    severity: {
      type: 'enum',
      values: ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
    },
    timestamp: { type: 'date' },
    request_method: {
      type: 'enum',
      values: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    request_path: { type: 'string' },
    ip_address: { type: 'string' },
    session_id: { type: 'string' },
    api_key_id: { type: 'uuid' }
  },
  sortableFields: ['timestamp', 'action', 'resource_type', 'status', 'severity'],
  defaultSort: { field: 'timestamp', order: 'DESC' },
  maxLimit: 500 // Higher limit for audit logs
};

/**
 * All query configurations
 */
const QUERY_CONFIGS = {
  patients: PATIENTS_CONFIG,
  users: USERS_CONFIG,
  visits: VISITS_CONFIG,
  billing: BILLING_CONFIG,
  audit: AUDIT_CONFIG
};

module.exports = {
  QUERY_CONFIGS,
  PATIENTS_CONFIG,
  USERS_CONFIG,
  VISITS_CONFIG,
  BILLING_CONFIG,
  AUDIT_CONFIG
};
