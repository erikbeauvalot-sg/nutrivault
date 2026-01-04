/**
 * Test Helpers
 *
 * Common utilities for tests
 */

const db = require('../../models');
const bcrypt = require('bcrypt');

/**
 * Create a test role
 */
async function createRole(data = {}) {
  return await db.Role.create({
    name: data.name || 'TEST_ROLE',
    description: data.description || 'Test role',
    ...data
  });
}

/**
 * Create a test permission
 */
async function createPermission(data = {}) {
  return await db.Permission.create({
    name: data.name || 'test.permission',
    resource: data.resource || 'test',
    action: data.action || 'test',
    description: data.description || 'Test permission',
    ...data
  });
}

/**
 * Create a test user
 */
async function createUser(data = {}) {
  const role = data.role || await createRole({ name: 'ADMIN' });

  const passwordHash = await bcrypt.hash(
    data.password || 'Test123!',
    parseInt(process.env.BCRYPT_ROUNDS || 4)
  );

  return await db.User.create({
    username: data.username || 'testuser',
    email: data.email || 'test@example.com',
    password_hash: passwordHash,
    first_name: data.first_name || 'Test',
    last_name: data.last_name || 'User',
    role_id: role.id,
    is_active: data.is_active !== undefined ? data.is_active : true,
    created_by: data.created_by || null,
    updated_by: data.updated_by || null,
    ...data
  });
}

/**
 * Create a test patient
 */
async function createPatient(data = {}) {
  let dietitian = data.dietitian;
  if (!dietitian) {
    const role = await createRole({ name: 'DIETITIAN' });
    dietitian = await createUser({
      username: 'dietitian',
      email: 'dietitian@example.com',
      role
    });
  }

  return await db.Patient.create({
    first_name: data.first_name || 'Test',
    last_name: data.last_name || 'Patient',
    date_of_birth: data.date_of_birth || '1990-01-01',
    gender: data.gender || 'Other',
    email: data.email || 'patient@example.com',
    phone: data.phone || '555-0100',
    assigned_dietitian_id: dietitian.id,
    is_active: data.is_active !== undefined ? data.is_active : true,
    created_by: data.created_by || dietitian.id,
    ...data
  });
}

/**
 * Create a test visit
 */
async function createVisit(data = {}) {
  let patient = data.patient;
  let dietitian = data.dietitian;

  if (!patient) {
    patient = await createPatient({ dietitian });
  }

  if (!dietitian) {
    dietitian = await db.User.findByPk(patient.assigned_dietitian_id);
  }

  return await db.Visit.create({
    patient_id: patient.id,
    dietitian_id: dietitian.id,
    visit_date: data.visit_date || new Date(),
    duration_minutes: data.duration_minutes || 60,
    visit_type: data.visit_type || 'Initial Consultation',
    status: data.status || 'SCHEDULED',
    created_by: data.created_by || dietitian.id,
    ...data
  });
}

/**
 * Create a test billing record
 */
async function createBilling(data = {}) {
  let patient = data.patient;
  let visit = data.visit;

  if (!patient && !visit) {
    patient = await createPatient();
  }

  if (visit && !patient) {
    patient = await db.Patient.findByPk(visit.patient_id);
  }

  return await db.Billing.create({
    patient_id: patient.id,
    visit_id: visit ? visit.id : null,
    invoice_number: data.invoice_number || `INV-${Date.now()}`,
    invoice_date: data.invoice_date || new Date(),
    due_date: data.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    amount: data.amount || 100.00,
    tax_amount: data.tax_amount || 10.00,
    total_amount: data.total_amount || 110.00,
    currency: data.currency || 'USD',
    status: data.status || 'PENDING',
    created_by: data.created_by || patient.assigned_dietitian_id,
    ...data
  });
}

/**
 * Create a test API key
 */
async function createApiKey(data = {}) {
  let user = data.user;
  if (!user) {
    user = await createUser();
  }

  const crypto = require('crypto');
  const key = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  const apiKey = await db.ApiKey.create({
    key_hash: keyHash,
    key_prefix: key.substring(0, 8),
    user_id: user.id,
    name: data.name || 'Test API Key',
    is_active: data.is_active !== undefined ? data.is_active : true,
    created_by: data.created_by || user.id,
    ...data
  });

  // Return both the API key object and the plain key
  return { apiKey, plainKey: key };
}

/**
 * Wait for a specified time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createRole,
  createPermission,
  createUser,
  createPatient,
  createVisit,
  createBilling,
  createApiKey,
  wait
};
