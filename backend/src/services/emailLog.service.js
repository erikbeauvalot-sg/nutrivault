/**
 * Email Log Service
 * Handles saving and retrieving email communication logs
 */

const db = require('../../../models');
const { Op } = require('sequelize');

const EmailLog = db.EmailLog;
const Patient = db.Patient;
const User = db.User;
const Visit = db.Visit;
const Billing = db.Billing;

/**
 * Create an email log entry
 * @param {Object} data - Email log data
 * @returns {Promise<EmailLog>}
 */
async function createEmailLog(data) {
  return await EmailLog.create({
    template_id: data.template_id || null,
    template_slug: data.template_slug || 'custom',
    email_type: data.email_type || 'other',
    sent_to: data.sent_to,
    patient_id: data.patient_id || null,
    visit_id: data.visit_id || null,
    billing_id: data.billing_id || null,
    subject: data.subject,
    body_html: data.body_html || null,
    body_text: data.body_text || null,
    variables_used: data.variables_used || null,
    status: data.status || 'sent',
    error_message: data.error_message || null,
    sent_at: data.sent_at || new Date(),
    sent_by: data.sent_by || null,
    language_code: data.language_code || null
  });
}

/**
 * Get email logs for a patient with filters
 * @param {string} patientId - Patient ID
 * @param {Object} options - Filter options
 * @returns {Promise<{rows: EmailLog[], count: number}>}
 */
async function getPatientEmailLogs(patientId, options = {}) {
  const {
    email_type,
    status,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
    sortBy = 'sent_at',
    sortOrder = 'DESC'
  } = options;

  const where = { patient_id: patientId };

  // Filter by email type
  if (email_type && email_type !== 'all') {
    where.email_type = email_type;
  }

  // Filter by status
  if (status && status !== 'all') {
    where.status = status;
  }

  // Filter by date range
  if (startDate || endDate) {
    where.sent_at = {};
    if (startDate) {
      where.sent_at[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.sent_at[Op.lte] = new Date(endDate);
    }
  }

  return await EmailLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: Visit,
        as: 'visit',
        attributes: ['id', 'visit_date', 'visit_type']
      },
      {
        model: Billing,
        as: 'billing',
        attributes: ['id', 'invoice_number', 'amount_total']
      }
    ],
    order: [[sortBy, sortOrder]],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
}

/**
 * Get a single email log by ID
 * @param {string} id - Email log ID
 * @returns {Promise<EmailLog>}
 */
async function getEmailLogById(id) {
  return await EmailLog.findByPk(id, {
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: Visit,
        as: 'visit',
        attributes: ['id', 'visit_date', 'visit_type']
      },
      {
        model: Billing,
        as: 'billing',
        attributes: ['id', 'invoice_number', 'amount_total']
      }
    ]
  });
}

/**
 * Get email type statistics for a patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>}
 */
async function getPatientEmailStats(patientId) {
  const stats = await EmailLog.findAll({
    where: { patient_id: patientId },
    attributes: [
      'email_type',
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    group: ['email_type', 'status']
  });

  // Format stats
  const result = {
    total: 0,
    byType: {},
    byStatus: { sent: 0, failed: 0, queued: 0 }
  };

  stats.forEach(stat => {
    const type = stat.email_type || 'other';
    const status = stat.status;
    const count = parseInt(stat.dataValues.count);

    result.total += count;

    if (!result.byType[type]) {
      result.byType[type] = { sent: 0, failed: 0, queued: 0, total: 0 };
    }
    result.byType[type][status] = count;
    result.byType[type].total += count;

    result.byStatus[status] += count;
  });

  return result;
}

/**
 * Get available email types
 * @returns {Array<Object>}
 */
function getEmailTypes() {
  return [
    { value: 'followup', label: 'Suivi consultation', labelEn: 'Follow-up' },
    { value: 'invoice', label: 'Facture', labelEn: 'Invoice' },
    { value: 'reminder', label: 'Rappel RDV', labelEn: 'Appointment Reminder' },
    { value: 'payment_reminder', label: 'Relance paiement', labelEn: 'Payment Reminder' },
    { value: 'welcome', label: 'Bienvenue', labelEn: 'Welcome' },
    { value: 'other', label: 'Autre', labelEn: 'Other' }
  ];
}

/**
 * Get email logs for a visit
 * @param {string} visitId - Visit ID
 * @returns {Promise<{rows: EmailLog[], count: number}>}
 */
async function getVisitEmailLogs(visitId) {
  return await EmailLog.findAndCountAll({
    where: { visit_id: visitId },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }
    ],
    order: [['sent_at', 'DESC']]
  });
}

module.exports = {
  createEmailLog,
  getPatientEmailLogs,
  getEmailLogById,
  getPatientEmailStats,
  getEmailTypes,
  getVisitEmailLogs
};
