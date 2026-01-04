/**
 * Reports Service
 *
 * Business logic for generating various reports and analytics
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const auditService = require('./audit.service');

/**
 * Get patient statistics report
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Date range and other filters
 * @returns {Object} Patient statistics
 */
async function getPatientStats(user, filters = {}) {
  const { from_date, to_date } = filters;

  // Build base where clause
  const where = {};

  // Apply RBAC - dietitians only see their patients
  if (user.role && user.role.name === 'DIETITIAN') {
    where.assigned_dietitian_id = user.id;
  }

  // Apply date filters if provided
  if (from_date || to_date) {
    where.created_at = {};
    if (from_date) where.created_at[Op.gte] = new Date(from_date);
    if (to_date) where.created_at[Op.lte] = new Date(to_date);
  }

  // Get total counts
  const totalPatients = await db.Patient.count({ where });
  const activePatients = await db.Patient.count({
    where: { ...where, is_active: true }
  });
  const inactivePatients = totalPatients - activePatients;

  // Get patients by gender
  const patientsByGender = await db.Patient.findAll({
    where,
    attributes: [
      'gender',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    group: ['gender'],
    raw: true
  });

  // Get patients by dietitian (only for admins)
  let patientsByDietitian = [];
  if (!user.role || user.role.name !== 'DIETITIAN') {
    patientsByDietitian = await db.Patient.findAll({
      where,
      attributes: [
        'assigned_dietitian_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('Patient.id')), 'count']
      ],
      include: [{
        model: db.User,
        as: 'assignedDietitian',
        attributes: ['id', 'first_name', 'last_name', 'username']
      }],
      group: ['assigned_dietitian_id', 'assignedDietitian.id'],
      raw: false
    });
  }

  // Get new patients trend (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const newPatientsTrend = await db.Patient.findAll({
    where: {
      ...where,
      created_at: { [Op.gte]: twelveMonthsAgo }
    },
    attributes: [
      [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('created_at')), 'month'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    group: [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('created_at'))],
    order: [[db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('created_at')), 'ASC']],
    raw: true
  });

  // Audit log
  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'READ',
    resource_type: 'reports',
    resource_id: 'patient-stats',
    status: 'SUCCESS',
    severity: 'INFO',
    ip_address: user.ip_address,
    user_agent: user.user_agent
  });

  return {
    summary: {
      total: totalPatients,
      active: activePatients,
      inactive: inactivePatients
    },
    byGender: patientsByGender,
    byDietitian: patientsByDietitian,
    newPatientsTrend
  };
}

/**
 * Get visit analytics report
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Date range and other filters
 * @returns {Object} Visit analytics
 */
async function getVisitAnalytics(user, filters = {}) {
  const { from_date, to_date } = filters;

  // Build base where clause
  const where = {};

  // Apply RBAC - dietitians only see their visits
  if (user.role && user.role.name === 'DIETITIAN') {
    where.dietitian_id = user.id;
  }

  // Apply date filters
  if (from_date || to_date) {
    where.visit_date = {};
    if (from_date) where.visit_date[Op.gte] = new Date(from_date);
    if (to_date) where.visit_date[Op.lte] = new Date(to_date);
  }

  // Get total visits
  const totalVisits = await db.Visit.count({ where });

  // Get visits by status
  const visitsByStatus = await db.Visit.findAll({
    where,
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  // Get visits by type
  const visitsByType = await db.Visit.findAll({
    where,
    attributes: [
      'visit_type',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    group: ['visit_type'],
    raw: true
  });

  // Get visits by dietitian (only for admins)
  let visitsByDietitian = [];
  if (!user.role || user.role.name !== 'DIETITIAN') {
    visitsByDietitian = await db.Visit.findAll({
      where,
      attributes: [
        'dietitian_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('Visit.id')), 'count']
      ],
      include: [{
        model: db.User,
        as: 'dietitian',
        attributes: ['id', 'first_name', 'last_name', 'username']
      }],
      group: ['dietitian_id', 'dietitian.id'],
      raw: false
    });
  }

  // Get average visit duration
  const avgDuration = await db.Visit.findOne({
    where,
    attributes: [
      [db.sequelize.fn('AVG', db.sequelize.col('duration_minutes')), 'average']
    ],
    raw: true
  });

  // Get visit trend (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const visitTrend = await db.Visit.findAll({
    where: {
      ...where,
      visit_date: { [Op.gte]: twelveMonthsAgo }
    },
    attributes: [
      [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('visit_date')), 'month'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    group: [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('visit_date'))],
    order: [[db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('visit_date')), 'ASC']],
    raw: true
  });

  // Audit log
  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'READ',
    resource_type: 'reports',
    resource_id: 'visit-analytics',
    status: 'SUCCESS',
    severity: 'INFO',
    ip_address: user.ip_address,
    user_agent: user.user_agent
  });

  return {
    summary: {
      total: totalVisits,
      averageDuration: Math.round(avgDuration?.average || 0)
    },
    byStatus: visitsByStatus,
    byType: visitsByType,
    byDietitian: visitsByDietitian,
    visitTrend
  };
}

/**
 * Get billing report
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Date range and other filters
 * @returns {Object} Billing statistics
 */
async function getBillingReport(user, filters = {}) {
  const { from_date, to_date } = filters;

  // Build base where clause
  const where = {};

  // Apply RBAC - dietitians only see billing for their patients
  let patientIds = null;
  if (user.role && user.role.name === 'DIETITIAN') {
    const patients = await db.Patient.findAll({
      where: { assigned_dietitian_id: user.id },
      attributes: ['id'],
      raw: true
    });
    patientIds = patients.map(p => p.id);
    where.patient_id = { [Op.in]: patientIds };
  }

  // Apply date filters
  if (from_date || to_date) {
    where.invoice_date = {};
    if (from_date) where.invoice_date[Op.gte] = new Date(from_date);
    if (to_date) where.invoice_date[Op.lte] = new Date(to_date);
  }

  // Get total revenue
  const revenueStats = await db.Billing.findOne({
    where,
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalRevenue'],
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount'],
      [db.sequelize.fn('SUM', db.sequelize.col('tax_amount')), 'totalTax'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalInvoices']
    ],
    raw: true
  });

  // Get revenue by status
  const revenueByStatus = await db.Billing.findAll({
    where,
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue']
    ],
    group: ['status'],
    raw: true
  });

  // Get revenue by payment method
  const revenueByPaymentMethod = await db.Billing.findAll({
    where: { ...where, payment_method: { [Op.ne]: null } },
    attributes: [
      'payment_method',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue']
    ],
    group: ['payment_method'],
    raw: true
  });

  // Get outstanding invoices
  const outstanding = await db.Billing.findOne({
    where: {
      ...where,
      status: { [Op.in]: ['PENDING', 'OVERDUE'] }
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    raw: true
  });

  // Get revenue trend (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const revenueTrend = await db.Billing.findAll({
    where: {
      ...where,
      invoice_date: { [Op.gte]: twelveMonthsAgo }
    },
    attributes: [
      [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('invoice_date')), 'month'],
      [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'revenue'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    group: [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('invoice_date'))],
    order: [[db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('invoice_date')), 'ASC']],
    raw: true
  });

  // Audit log
  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'READ',
    resource_type: 'reports',
    resource_id: 'billing-report',
    status: 'SUCCESS',
    severity: 'INFO',
    ip_address: user.ip_address,
    user_agent: user.user_agent
  });

  return {
    summary: {
      totalRevenue: parseFloat(revenueStats?.totalRevenue || 0),
      totalAmount: parseFloat(revenueStats?.totalAmount || 0),
      totalTax: parseFloat(revenueStats?.totalTax || 0),
      totalInvoices: parseInt(revenueStats?.totalInvoices || 0),
      outstanding: {
        amount: parseFloat(outstanding?.amount || 0),
        count: parseInt(outstanding?.count || 0)
      }
    },
    byStatus: revenueByStatus,
    byPaymentMethod: revenueByPaymentMethod,
    revenueTrend
  };
}

/**
 * Get practice overview dashboard data
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Date range filters
 * @returns {Object} Dashboard data
 */
async function getPracticeOverview(user, filters = {}) {
  // Get all reports in parallel
  const [patientStats, visitAnalytics, billingReport] = await Promise.all([
    getPatientStats(user, filters),
    getVisitAnalytics(user, filters),
    getBillingReport(user, filters)
  ]);

  // Audit log
  await auditService.log({
    user_id: user.id,
    username: user.username,
    action: 'READ',
    resource_type: 'reports',
    resource_id: 'practice-overview',
    status: 'SUCCESS',
    severity: 'INFO',
    ip_address: user.ip_address,
    user_agent: user.user_agent
  });

  return {
    patients: patientStats.summary,
    visits: visitAnalytics.summary,
    billing: billingReport.summary,
    trends: {
      newPatients: patientStats.newPatientsTrend,
      visits: visitAnalytics.visitTrend,
      revenue: billingReport.revenueTrend
    }
  };
}

module.exports = {
  getPatientStats,
  getVisitAnalytics,
  getBillingReport,
  getPracticeOverview
};
