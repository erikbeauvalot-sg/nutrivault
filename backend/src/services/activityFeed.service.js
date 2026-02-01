/**
 * Activity Feed Service
 * Provides real-time activity stream for the dashboard
 */

const db = require('../../../models');
const { Op } = db.Sequelize;

// Activity type definitions with icons
const ACTIVITY_TYPES = {
  PATIENT_CREATED: { icon: '👤', color: 'primary' },
  VISIT_COMPLETED: { icon: '✅', color: 'success' },
  VISIT_SCHEDULED: { icon: '📅', color: 'info' },
  VISIT_CANCELLED: { icon: '❌', color: 'warning' },
  VISIT_NO_SHOW: { icon: '🚫', color: 'danger' },
  PAYMENT_RECEIVED: { icon: '💰', color: 'success' },
  DOCUMENT_SHARED: { icon: '📄', color: 'info' },
  MEASURE_ALERT: { icon: '⚠️', color: 'warning' },
  INVOICE_CREATED: { icon: '📋', color: 'primary' },
  INVOICE_OVERDUE: { icon: '⏰', color: 'danger' },
  RECIPE_SHARED: { icon: '🍽️', color: 'info' },
  TASK_COMPLETED: { icon: '✓', color: 'success' }
};

/**
 * Get recent activity feed
 * @param {number} limit - Number of activities to return
 * @param {Date} since - Only get activities since this date
 */
const getRecentActivity = async (limit = 20, since = null) => {
  const activities = [];
  const now = new Date();
  const defaultSince = since || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  // 1. New Patients
  const newPatients = await db.Patient.findAll({
    where: {
      created_at: { [Op.gte]: defaultSince },
      is_active: true
    },
    order: [['created_at', 'DESC']],
    limit: 10
  });

  newPatients.forEach(patient => {
    activities.push({
      id: `patient-${patient.id}`,
      type: 'PATIENT_CREATED',
      ...ACTIVITY_TYPES.PATIENT_CREATED,
      message: `Nouveau patient : ${patient.first_name} ${patient.last_name}`,
      patient_id: patient.id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      metadata: {},
      created_at: patient.created_at
    });
  });

  // 2. Recent Visits
  const recentVisits = await db.Visit.findAll({
    where: {
      updated_at: { [Op.gte]: defaultSince }
    },
    include: [{
      model: db.Patient,
      as: 'patient',
      attributes: ['id', 'first_name', 'last_name']
    }],
    order: [['updated_at', 'DESC']],
    limit: 15
  });

  recentVisits.forEach(visit => {
    const patientName = visit.patient
      ? `${visit.patient.first_name} ${visit.patient.last_name}`
      : 'Patient inconnu';

    let type, message;
    if (visit.status === 'COMPLETED') {
      type = 'VISIT_COMPLETED';
      message = `Visite terminée - ${patientName}`;
    } else if (visit.status === 'CANCELLED') {
      type = 'VISIT_CANCELLED';
      message = `Visite annulée - ${patientName}`;
    } else if (visit.status === 'NO_SHOW') {
      type = 'VISIT_NO_SHOW';
      message = `Absence - ${patientName}`;
    } else {
      type = 'VISIT_SCHEDULED';
      message = `Visite programmée - ${patientName}`;
    }

    activities.push({
      id: `visit-${visit.id}`,
      type,
      ...ACTIVITY_TYPES[type],
      message,
      patient_id: visit.patient?.id,
      patient_name: patientName,
      metadata: { visit_date: visit.visit_date },
      created_at: visit.updated_at
    });
  });

  // 3. Recent Payments
  const recentPayments = await db.Payment.findAll({
    where: {
      payment_date: { [Op.gte]: defaultSince }
    },
    include: [{
      model: db.Billing,
      as: 'invoice',
      include: [{
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      }]
    }],
    order: [['payment_date', 'DESC']],
    limit: 10
  });

  recentPayments.forEach(payment => {
    const patient = payment.invoice?.patient;
    const patientName = patient
      ? `${patient.first_name} ${patient.last_name}`
      : 'Patient';

    activities.push({
      id: `payment-${payment.id}`,
      type: 'PAYMENT_RECEIVED',
      ...ACTIVITY_TYPES.PAYMENT_RECEIVED,
      message: `Paiement reçu - €${payment.amount.toFixed(2)} de ${patientName}`,
      patient_id: patient?.id,
      patient_name: patientName,
      metadata: { amount: payment.amount, invoice_id: payment.billing_id },
      created_at: payment.payment_date
    });
  });

  // 4. Recent Document Shares
  const recentShares = await db.DocumentShare.findAll({
    where: {
      created_at: { [Op.gte]: defaultSince },
      is_active: true
    },
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: db.Document,
        as: 'document',
        attributes: ['id', 'file_name']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: 10
  });

  recentShares.forEach(share => {
    const patientName = share.patient
      ? `${share.patient.first_name} ${share.patient.last_name}`
      : 'Patient';

    activities.push({
      id: `share-${share.id}`,
      type: 'DOCUMENT_SHARED',
      ...ACTIVITY_TYPES.DOCUMENT_SHARED,
      message: `Document partagé avec ${patientName}`,
      patient_id: share.patient?.id,
      patient_name: patientName,
      metadata: { document_name: share.document?.file_name },
      created_at: share.created_at
    });
  });

  // 5. Measure Alerts
  const recentAlerts = await db.MeasureAlert.findAll({
    where: {
      created_at: { [Op.gte]: defaultSince },
      is_active: true
    },
    include: [
      {
        model: db.Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: db.MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['id', 'name']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: 10
  });

  recentAlerts.forEach(alert => {
    const patientName = alert.patient
      ? `${alert.patient.first_name} ${alert.patient.last_name}`
      : 'Patient';

    activities.push({
      id: `alert-${alert.id}`,
      type: 'MEASURE_ALERT',
      ...ACTIVITY_TYPES.MEASURE_ALERT,
      message: `Alerte mesure (${alert.measureDefinition?.name || 'Mesure'}) - ${patientName}`,
      patient_id: alert.patient?.id,
      patient_name: patientName,
      metadata: {
        measure_name: alert.measureDefinition?.name,
        severity: alert.severity
      },
      created_at: alert.created_at
    });
  });

  // 6. Recent Invoices (created recently)
  const recentInvoices = await db.Billing.findAll({
    where: {
      created_at: { [Op.gte]: defaultSince }
    },
    include: [{
      model: db.Patient,
      as: 'patient',
      attributes: ['id', 'first_name', 'last_name']
    }],
    order: [['created_at', 'DESC']],
    limit: 10
  });

  recentInvoices.forEach(invoice => {
    const patientName = invoice.patient
      ? `${invoice.patient.first_name} ${invoice.patient.last_name}`
      : 'Patient';

    activities.push({
      id: `invoice-${invoice.id}`,
      type: 'INVOICE_CREATED',
      ...ACTIVITY_TYPES.INVOICE_CREATED,
      message: `Facture créée - €${invoice.total_amount.toFixed(2)} pour ${patientName}`,
      patient_id: invoice.patient?.id,
      patient_name: patientName,
      metadata: { amount: invoice.total_amount },
      created_at: invoice.created_at
    });
  });

  // 7. Overdue Invoices
  const overdueInvoices = await db.Billing.findAll({
    where: {
      due_date: { [Op.lt]: now },
      payment_status: { [Op.in]: ['PENDING', 'PARTIAL'] }
    },
    include: [{
      model: db.Patient,
      as: 'patient',
      attributes: ['id', 'first_name', 'last_name']
    }],
    order: [['due_date', 'DESC']],
    limit: 5
  });

  overdueInvoices.forEach(invoice => {
    const patientName = invoice.patient
      ? `${invoice.patient.first_name} ${invoice.patient.last_name}`
      : 'Patient';

    activities.push({
      id: `overdue-${invoice.id}`,
      type: 'INVOICE_OVERDUE',
      ...ACTIVITY_TYPES.INVOICE_OVERDUE,
      message: `Facture en retard - €${invoice.amount_due.toFixed(2)} de ${patientName}`,
      patient_id: invoice.patient?.id,
      patient_name: patientName,
      metadata: { amount: invoice.amount_due, due_date: invoice.due_date },
      created_at: invoice.due_date
    });
  });

  // Sort all activities by date and limit
  activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return activities.slice(0, limit);
};

/**
 * Get activity count by type for the current period
 */
const getActivitySummary = async () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const summary = {
    today: {
      visits: 0,
      payments: 0,
      newPatients: 0
    },
    week: {
      visits: 0,
      payments: 0,
      newPatients: 0
    }
  };

  // Today's stats
  summary.today.visits = await db.Visit.count({
    where: {
      visit_date: { [Op.gte]: startOfDay },
      status: 'COMPLETED'
    }
  });

  summary.today.payments = await db.Payment.count({
    where: {
      payment_date: { [Op.gte]: startOfDay }
    }
  });

  summary.today.newPatients = await db.Patient.count({
    where: {
      created_at: { [Op.gte]: startOfDay },
      is_active: true
    }
  });

  // Week's stats
  summary.week.visits = await db.Visit.count({
    where: {
      visit_date: { [Op.gte]: startOfWeek },
      status: 'COMPLETED'
    }
  });

  summary.week.payments = await db.Payment.count({
    where: {
      payment_date: { [Op.gte]: startOfWeek }
    }
  });

  summary.week.newPatients = await db.Patient.count({
    where: {
      created_at: { [Op.gte]: startOfWeek },
      is_active: true
    }
  });

  return summary;
};

module.exports = {
  getRecentActivity,
  getActivitySummary,
  ACTIVITY_TYPES
};
