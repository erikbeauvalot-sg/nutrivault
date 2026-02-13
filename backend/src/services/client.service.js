/**
 * Client Service
 * Business logic for client management with RBAC scoping.
 */

const db = require('../../../models');
const Client = db.Client;
const Patient = db.Patient;
const Quote = db.Quote;
const { Op } = db.Sequelize;
const { getScopedDietitianIds } = require('../helpers/scopeHelper');
const auditService = require('./audit.service');

/**
 * Apply created_by scoping based on user role.
 * ADMIN: no filter. DIETITIAN: own. ASSISTANT: linked dietitians.
 */
async function applyCreatorScope(whereClause, user) {
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return true; // ADMIN
  if (dietitianIds.length === 0) return false;
  whereClause.created_by = { [Op.in]: dietitianIds };
  return true;
}

async function getClients(user, filters = {}, requestMetadata = {}) {
  const whereClause = { is_active: true };

  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    return { clients: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  if (filters.client_type) {
    whereClause.client_type = filters.client_type;
  }

  if (filters.search) {
    whereClause[Op.or] = [
      { company_name: { [Op.like]: `%${filters.search}%` } },
      { first_name: { [Op.like]: `%${filters.search}%` } },
      { last_name: { [Op.like]: `%${filters.search}%` } },
      { email: { [Op.like]: `%${filters.search}%` } }
    ];
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;

  const { count, rows } = await Client.findAndCountAll({
    where: whereClause,
    include: [
      { model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] },
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'], required: false }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  return {
    clients: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit)
  };
}

async function getClientById(id, user, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const client = await Client.findOne({
    where: whereClause,
    include: [
      { model: db.User, as: 'creator', attributes: ['id', 'username', 'first_name', 'last_name'] },
      { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email'], required: false },
      { model: Quote, as: 'quotes', where: { is_active: true }, required: false, order: [['created_at', 'DESC']] }
    ]
  });

  if (!client) {
    const error = new Error('Client not found');
    error.statusCode = 404;
    throw error;
  }

  return client;
}

async function createClient(user, clientData, requestMetadata = {}) {
  if (clientData.client_type === 'company' && !clientData.company_name) {
    const error = new Error('Company name is required for company clients');
    error.statusCode = 400;
    throw error;
  }
  if (clientData.client_type === 'person' && (!clientData.first_name || !clientData.last_name)) {
    const error = new Error('First name and last name are required for person clients');
    error.statusCode = 400;
    throw error;
  }

  const client = await Client.create({
    ...clientData,
    created_by: user.id
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    resource_type: 'client',
    resource_id: client.id,
    new_values: clientData,
    ...requestMetadata
  });

  return client;
}

async function updateClient(id, user, clientData, requestMetadata = {}) {
  const whereClause = { id, is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  const client = await Client.findOne({ where: whereClause });
  if (!client) {
    const error = new Error('Client not found');
    error.statusCode = 404;
    throw error;
  }

  const oldValues = client.toJSON();
  await client.update(clientData);

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    resource_type: 'client',
    resource_id: client.id,
    old_values: oldValues,
    new_values: clientData,
    ...requestMetadata
  });

  return client;
}

async function deleteClient(id, user, requestMetadata = {}) {
  const client = await Client.findOne({ where: { id, is_active: true } });
  if (!client) {
    const error = new Error('Client not found');
    error.statusCode = 404;
    throw error;
  }

  await client.update({ is_active: false });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    resource_type: 'client',
    resource_id: client.id,
    ...requestMetadata
  });

  return { message: 'Client deleted successfully' };
}

async function searchClients(user, query, requestMetadata = {}) {
  const whereClause = { is_active: true };
  const hasAccess = await applyCreatorScope(whereClause, user);
  if (!hasAccess) return [];

  whereClause[Op.or] = [
    { company_name: { [Op.like]: `%${query}%` } },
    { first_name: { [Op.like]: `%${query}%` } },
    { last_name: { [Op.like]: `%${query}%` } },
    { email: { [Op.like]: `%${query}%` } }
  ];

  return Client.findAll({
    where: whereClause,
    attributes: ['id', 'client_type', 'company_name', 'first_name', 'last_name', 'email'],
    limit: 20,
    order: [['created_at', 'DESC']]
  });
}

async function createClientFromPatient(user, patientId, requestMetadata = {}) {
  const patient = await Patient.findByPk(patientId);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  // Check if a client already exists for this patient
  const existing = await Client.findOne({ where: { patient_id: patientId, is_active: true } });
  if (existing) {
    return existing;
  }

  const client = await Client.create({
    client_type: 'person',
    first_name: patient.first_name,
    last_name: patient.last_name,
    email: patient.email,
    phone: patient.phone,
    patient_id: patientId,
    created_by: user.id
  });

  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    resource_type: 'client',
    resource_id: client.id,
    details: `Created from patient ${patientId}`,
    ...requestMetadata
  });

  return client;
}

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  createClientFromPatient
};
