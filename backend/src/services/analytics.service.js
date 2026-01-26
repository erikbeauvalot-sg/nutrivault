/**
 * Analytics Service
 * Sprint 6: Advanced Data Visualization
 *
 * Provides aggregated analytics for:
 * - Health trends across patients
 * - Financial metrics
 * - Communication effectiveness
 * - Patient health scores
 */

const db = require('../../../models');
const { Op, fn, col, literal } = db.Sequelize;
const Patient = db.Patient;
const PatientMeasure = db.PatientMeasure;
const MeasureDefinition = db.MeasureDefinition;
const Visit = db.Visit;
const Billing = db.Billing;
const EmailLog = db.EmailLog;
const trendAnalysis = require('./trendAnalysis.service');

/**
 * Get health trends analytics
 * @param {Object} options - Filter options
 * @param {Date} options.startDate - Start date for analysis
 * @param {Date} options.endDate - End date for analysis
 * @returns {Promise<Object>} Health analytics data
 */
async function getHealthTrends(options = {}) {
  const { startDate, endDate } = options;

  const dateFilter = {};
  if (startDate) dateFilter[Op.gte] = new Date(startDate);
  if (endDate) dateFilter[Op.lte] = new Date(endDate);

  const measureDateFilter = Object.keys(dateFilter).length > 0
    ? { measured_at: dateFilter }
    : {};

  try {
    // 1. Get top tracked measures
    const topMeasures = await PatientMeasure.findAll({
      attributes: [
        'measure_definition_id',
        [fn('COUNT', col('PatientMeasure.id')), 'count']
      ],
      where: measureDateFilter,
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['id', 'name', 'display_name', 'unit', 'category'],
        where: { is_active: true }
      }],
      group: ['measure_definition_id', 'measureDefinition.id'],
      order: [[literal('count'), 'DESC']],
      limit: 10
    });

    // 2. Get measure statistics per definition
    const measureStats = await PatientMeasure.findAll({
      attributes: [
        'measure_definition_id',
        [fn('COUNT', col('PatientMeasure.id')), 'total_count'],
        [fn('COUNT', fn('DISTINCT', col('PatientMeasure.patient_id'))), 'patient_count'],
        [fn('AVG', col('numeric_value')), 'avg_value'],
        [fn('MIN', col('numeric_value')), 'min_value'],
        [fn('MAX', col('numeric_value')), 'max_value']
      ],
      where: {
        ...measureDateFilter,
        numeric_value: { [Op.not]: null }
      },
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['id', 'name', 'display_name', 'unit', 'category', 'min_normal', 'max_normal'],
        where: { is_active: true }
      }],
      group: ['measure_definition_id', 'measureDefinition.id'],
      order: [[literal('total_count'), 'DESC']]
    });

    // 3. Count out-of-range measures per patient (risk score basis)
    const outOfRangeCounts = await getOutOfRangeMeasureCounts(measureDateFilter);

    // 4. Calculate risk distribution
    const riskDistribution = calculateRiskDistribution(outOfRangeCounts);

    // 5. Get measure trends over time (monthly aggregates)
    const monthlyTrends = await getMeasureTrendsMonthly(startDate, endDate);

    // 6. Get total patients with measures
    const totalPatientsWithMeasures = await PatientMeasure.count({
      distinct: true,
      col: 'patient_id',
      where: measureDateFilter
    });

    // 7. Get total measures logged
    const totalMeasures = await PatientMeasure.count({
      where: measureDateFilter
    });

    return {
      summary: {
        totalMeasures,
        totalPatientsWithMeasures,
        avgMeasuresPerPatient: totalPatientsWithMeasures > 0
          ? Math.round(totalMeasures / totalPatientsWithMeasures * 10) / 10
          : 0
      },
      topMeasures: topMeasures.map(m => ({
        id: m.measure_definition_id,
        name: m.measureDefinition?.display_name || m.measureDefinition?.name,
        unit: m.measureDefinition?.unit,
        category: m.measureDefinition?.category,
        count: parseInt(m.get('count'))
      })),
      measureStats: measureStats.map(m => ({
        id: m.measure_definition_id,
        name: m.measureDefinition?.display_name || m.measureDefinition?.name,
        unit: m.measureDefinition?.unit,
        category: m.measureDefinition?.category,
        totalCount: parseInt(m.get('total_count')),
        patientCount: parseInt(m.get('patient_count')),
        avgValue: parseFloat(m.get('avg_value')) || 0,
        minValue: parseFloat(m.get('min_value')) || 0,
        maxValue: parseFloat(m.get('max_value')) || 0,
        normalRange: {
          min: m.measureDefinition?.min_normal,
          max: m.measureDefinition?.max_normal
        }
      })),
      riskDistribution,
      monthlyTrends
    };
  } catch (error) {
    console.error('Error in getHealthTrends:', error);
    throw error;
  }
}

/**
 * Get out-of-range measure counts per patient
 */
async function getOutOfRangeMeasureCounts(dateFilter = {}) {
  const measures = await PatientMeasure.findAll({
    where: {
      ...dateFilter,
      numeric_value: { [Op.not]: null }
    },
    include: [{
      model: MeasureDefinition,
      as: 'measureDefinition',
      attributes: ['min_normal', 'max_normal', 'min_critical', 'max_critical'],
      where: { is_active: true }
    }],
    attributes: ['patient_id', 'numeric_value']
  });

  const patientOutOfRange = {};

  measures.forEach(m => {
    const value = parseFloat(m.numeric_value);
    const def = m.measureDefinition;

    if (!def) return;

    const isOutOfRange =
      (def.min_normal !== null && value < def.min_normal) ||
      (def.max_normal !== null && value > def.max_normal);

    const isCritical =
      (def.min_critical !== null && value < def.min_critical) ||
      (def.max_critical !== null && value > def.max_critical);

    if (!patientOutOfRange[m.patient_id]) {
      patientOutOfRange[m.patient_id] = { outOfRange: 0, critical: 0, total: 0 };
    }

    patientOutOfRange[m.patient_id].total++;
    if (isOutOfRange) patientOutOfRange[m.patient_id].outOfRange++;
    if (isCritical) patientOutOfRange[m.patient_id].critical++;
  });

  return patientOutOfRange;
}

/**
 * Calculate risk distribution based on out-of-range measures
 */
function calculateRiskDistribution(outOfRangeCounts) {
  const distribution = {
    low: 0,      // 0-10% out of range
    medium: 0,   // 10-25% out of range
    high: 0,     // 25-50% out of range
    critical: 0  // >50% out of range or any critical
  };

  Object.values(outOfRangeCounts).forEach(counts => {
    if (counts.total === 0) return;

    const outOfRangePercent = (counts.outOfRange / counts.total) * 100;

    if (counts.critical > 0 || outOfRangePercent > 50) {
      distribution.critical++;
    } else if (outOfRangePercent > 25) {
      distribution.high++;
    } else if (outOfRangePercent > 10) {
      distribution.medium++;
    } else {
      distribution.low++;
    }
  });

  return distribution;
}

/**
 * Get monthly measure trends
 */
async function getMeasureTrendsMonthly(startDate, endDate) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Get top 5 measure definitions
  const topDefs = await PatientMeasure.findAll({
    attributes: [
      'measure_definition_id',
      [fn('COUNT', col('PatientMeasure.id')), 'count']
    ],
    where: {
      measured_at: { [Op.between]: [start, end] },
      numeric_value: { [Op.not]: null }
    },
    include: [{
      model: MeasureDefinition,
      as: 'measureDefinition',
      attributes: ['id', 'name', 'display_name', 'unit']
    }],
    group: ['measure_definition_id', 'measureDefinition.id'],
    order: [[literal('count'), 'DESC']],
    limit: 5
  });

  const trends = {};

  for (const def of topDefs) {
    const measureId = def.measure_definition_id;
    const measureName = def.measureDefinition?.display_name || def.measureDefinition?.name;

    // Get monthly averages for this measure
    const monthlyData = await PatientMeasure.findAll({
      attributes: [
        [fn('strftime', '%Y-%m', col('measured_at')), 'month'],
        [fn('AVG', col('numeric_value')), 'avg_value'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        measure_definition_id: measureId,
        measured_at: { [Op.between]: [start, end] },
        numeric_value: { [Op.not]: null }
      },
      group: [fn('strftime', '%Y-%m', col('measured_at'))],
      order: [[fn('strftime', '%Y-%m', col('measured_at')), 'ASC']]
    });

    trends[measureName] = monthlyData.map(d => ({
      month: d.get('month'),
      avgValue: parseFloat(d.get('avg_value')) || 0,
      count: parseInt(d.get('count'))
    }));
  }

  return trends;
}

/**
 * Get financial metrics analytics
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Financial analytics data
 */
async function getFinancialMetrics(options = {}) {
  const { startDate, endDate } = options;

  const dateFilter = {};
  if (startDate) dateFilter[Op.gte] = new Date(startDate);
  if (endDate) dateFilter[Op.lte] = new Date(endDate);

  const invoiceDateFilter = Object.keys(dateFilter).length > 0
    ? { invoice_date: dateFilter }
    : {};

  try {
    // 1. Revenue by status
    const revenueByStatus = await Billing.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('total_amount')), 'total'],
        [fn('SUM', col('amount_paid')), 'paid'],
        [fn('SUM', col('amount_due')), 'due']
      ],
      where: {
        ...invoiceDateFilter,
        is_active: true
      },
      group: ['status']
    });

    // 2. Monthly revenue trends
    const monthlyRevenue = await Billing.findAll({
      attributes: [
        [fn('strftime', '%Y-%m', col('invoice_date')), 'month'],
        [fn('SUM', col('total_amount')), 'total'],
        [fn('SUM', col('amount_paid')), 'paid'],
        [fn('COUNT', col('id')), 'invoice_count']
      ],
      where: {
        ...invoiceDateFilter,
        is_active: true
      },
      group: [fn('strftime', '%Y-%m', col('invoice_date'))],
      order: [[fn('strftime', '%Y-%m', col('invoice_date')), 'ASC']]
    });

    // 3. Payment method breakdown
    const paymentMethods = await Billing.findAll({
      attributes: [
        'payment_method',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('amount_paid')), 'total_paid']
      ],
      where: {
        ...invoiceDateFilter,
        is_active: true,
        payment_method: { [Op.not]: null }
      },
      group: ['payment_method']
    });

    // 4. Summary statistics
    const totalStats = await Billing.findOne({
      attributes: [
        [fn('COUNT', col('id')), 'total_invoices'],
        [fn('SUM', col('total_amount')), 'total_revenue'],
        [fn('SUM', col('amount_paid')), 'total_collected'],
        [fn('SUM', col('amount_due')), 'total_outstanding'],
        [fn('AVG', col('total_amount')), 'avg_invoice_amount']
      ],
      where: {
        ...invoiceDateFilter,
        is_active: true
      }
    });

    // 5. Average payment time (days between invoice and payment)
    const paidInvoices = await Billing.findAll({
      attributes: ['invoice_date', 'payment_date'],
      where: {
        ...invoiceDateFilter,
        is_active: true,
        status: 'PAID',
        payment_date: { [Op.not]: null }
      }
    });

    let avgPaymentDays = 0;
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const invoiceDate = new Date(inv.invoice_date);
        const paymentDate = new Date(inv.payment_date);
        const days = (paymentDate - invoiceDate) / (1000 * 60 * 60 * 24);
        return sum + Math.max(0, days);
      }, 0);
      avgPaymentDays = Math.round(totalDays / paidInvoices.length);
    }

    // 6. Overdue invoices count
    const overdueCount = await Billing.count({
      where: {
        ...invoiceDateFilter,
        is_active: true,
        status: 'OVERDUE'
      }
    });

    return {
      summary: {
        totalInvoices: parseInt(totalStats?.get('total_invoices')) || 0,
        totalRevenue: parseFloat(totalStats?.get('total_revenue')) || 0,
        totalCollected: parseFloat(totalStats?.get('total_collected')) || 0,
        totalOutstanding: parseFloat(totalStats?.get('total_outstanding')) || 0,
        avgInvoiceAmount: parseFloat(totalStats?.get('avg_invoice_amount')) || 0,
        avgPaymentDays,
        overdueCount
      },
      revenueByStatus: revenueByStatus.map(r => ({
        status: r.status,
        count: parseInt(r.get('count')),
        total: parseFloat(r.get('total')) || 0,
        paid: parseFloat(r.get('paid')) || 0,
        due: parseFloat(r.get('due')) || 0
      })),
      monthlyRevenue: monthlyRevenue.map(m => ({
        month: m.get('month'),
        total: parseFloat(m.get('total')) || 0,
        paid: parseFloat(m.get('paid')) || 0,
        invoiceCount: parseInt(m.get('invoice_count'))
      })),
      paymentMethods: paymentMethods.map(p => ({
        method: p.payment_method || 'Non spécifié',
        count: parseInt(p.get('count')),
        totalPaid: parseFloat(p.get('total_paid')) || 0
      }))
    };
  } catch (error) {
    console.error('Error in getFinancialMetrics:', error);
    throw error;
  }
}

/**
 * Get communication effectiveness analytics
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Communication analytics data
 */
async function getCommunicationEffectiveness(options = {}) {
  const { startDate, endDate } = options;

  const dateFilter = {};
  if (startDate) dateFilter[Op.gte] = new Date(startDate);
  if (endDate) dateFilter[Op.lte] = new Date(endDate);

  const emailDateFilter = Object.keys(dateFilter).length > 0
    ? { sent_at: dateFilter }
    : {};

  try {
    // 1. Email stats by type
    const emailsByType = await EmailLog.findAll({
      attributes: [
        'email_type',
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal("CASE WHEN status = 'sent' THEN 1 ELSE 0 END")), 'sent'],
        [fn('SUM', literal("CASE WHEN status = 'failed' THEN 1 ELSE 0 END")), 'failed']
      ],
      where: emailDateFilter,
      group: ['email_type']
    });

    // 2. Monthly email volume
    const monthlyEmails = await EmailLog.findAll({
      attributes: [
        [fn('strftime', '%Y-%m', col('sent_at')), 'month'],
        [fn('COUNT', col('id')), 'total'],
        'email_type'
      ],
      where: emailDateFilter,
      group: [fn('strftime', '%Y-%m', col('sent_at')), 'email_type'],
      order: [[fn('strftime', '%Y-%m', col('sent_at')), 'ASC']]
    });

    // 3. Visit no-show rate (before/after reminders)
    const visitStats = await Visit.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('AVG', col('reminders_sent')), 'avg_reminders']
      ],
      where: {
        visit_date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
      },
      group: ['status']
    });

    // 4. Reminder effectiveness
    const reminderEffectiveness = await Visit.findAll({
      attributes: [
        [literal("CASE WHEN reminders_sent > 0 THEN 'with_reminder' ELSE 'no_reminder' END"), 'reminder_status'],
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        visit_date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        status: { [Op.in]: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] }
      },
      group: [literal("CASE WHEN reminders_sent > 0 THEN 'with_reminder' ELSE 'no_reminder' END"), 'status']
    });

    // 5. Summary stats
    const totalEmails = await EmailLog.count({ where: emailDateFilter });
    const sentEmails = await EmailLog.count({
      where: { ...emailDateFilter, status: 'sent' }
    });
    const failedEmails = await EmailLog.count({
      where: { ...emailDateFilter, status: 'failed' }
    });

    // Calculate no-show rates
    const noShowWithReminder = reminderEffectiveness.find(
      r => r.get('reminder_status') === 'with_reminder' && r.status === 'NO_SHOW'
    );
    const totalWithReminder = reminderEffectiveness
      .filter(r => r.get('reminder_status') === 'with_reminder')
      .reduce((sum, r) => sum + parseInt(r.get('count')), 0);

    const noShowWithoutReminder = reminderEffectiveness.find(
      r => r.get('reminder_status') === 'no_reminder' && r.status === 'NO_SHOW'
    );
    const totalWithoutReminder = reminderEffectiveness
      .filter(r => r.get('reminder_status') === 'no_reminder')
      .reduce((sum, r) => sum + parseInt(r.get('count')), 0);

    const noShowRateWithReminder = totalWithReminder > 0
      ? ((parseInt(noShowWithReminder?.get('count') || 0) / totalWithReminder) * 100).toFixed(1)
      : 0;

    const noShowRateWithoutReminder = totalWithoutReminder > 0
      ? ((parseInt(noShowWithoutReminder?.get('count') || 0) / totalWithoutReminder) * 100).toFixed(1)
      : 0;

    return {
      summary: {
        totalEmails,
        sentEmails,
        failedEmails,
        deliveryRate: totalEmails > 0 ? ((sentEmails / totalEmails) * 100).toFixed(1) : 0,
        noShowRateWithReminder: parseFloat(noShowRateWithReminder),
        noShowRateWithoutReminder: parseFloat(noShowRateWithoutReminder),
        reminderEffectiveness: noShowRateWithoutReminder - noShowRateWithReminder
      },
      emailsByType: emailsByType.map(e => ({
        type: e.email_type,
        total: parseInt(e.get('total')),
        sent: parseInt(e.get('sent')) || 0,
        failed: parseInt(e.get('failed')) || 0
      })),
      monthlyEmails: aggregateMonthlyEmails(monthlyEmails),
      visitStats: visitStats.map(v => ({
        status: v.status,
        count: parseInt(v.get('count')),
        avgReminders: parseFloat(v.get('avg_reminders')) || 0
      })),
      reminderEffectiveness: reminderEffectiveness.map(r => ({
        reminderStatus: r.get('reminder_status'),
        visitStatus: r.status,
        count: parseInt(r.get('count'))
      }))
    };
  } catch (error) {
    console.error('Error in getCommunicationEffectiveness:', error);
    throw error;
  }
}

/**
 * Aggregate monthly emails by type
 */
function aggregateMonthlyEmails(data) {
  const monthlyMap = {};

  data.forEach(row => {
    const month = row.get('month');
    const type = row.email_type;
    const count = parseInt(row.get('total'));

    if (!monthlyMap[month]) {
      monthlyMap[month] = { month, total: 0 };
    }
    monthlyMap[month][type] = count;
    monthlyMap[month].total += count;
  });

  return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate patient health score
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Health score data
 */
async function calculatePatientHealthScore(patientId) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  try {
    // 1. Measure compliance (% of expected measures logged in last 6 months)
    const measuresCount = await PatientMeasure.count({
      where: {
        patient_id: patientId,
        measured_at: { [Op.gte]: sixMonthsAgo }
      }
    });

    // Expected: at least 1 measure per month = 6 measures
    const measureCompliance = Math.min(100, (measuresCount / 6) * 100);

    // 2. Out-of-range measure percentage
    const outOfRangeMeasures = await PatientMeasure.findAll({
      where: {
        patient_id: patientId,
        measured_at: { [Op.gte]: sixMonthsAgo },
        numeric_value: { [Op.not]: null }
      },
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        attributes: ['min_normal', 'max_normal']
      }]
    });

    let outOfRangeCount = 0;
    outOfRangeMeasures.forEach(m => {
      const value = parseFloat(m.numeric_value);
      const def = m.measureDefinition;
      if (def && (
        (def.min_normal !== null && value < def.min_normal) ||
        (def.max_normal !== null && value > def.max_normal)
      )) {
        outOfRangeCount++;
      }
    });

    const outOfRangePercent = outOfRangeMeasures.length > 0
      ? (outOfRangeCount / outOfRangeMeasures.length) * 100
      : 0;

    // 3. Visit frequency (visits in last 6 months)
    const visitsCount = await Visit.count({
      where: {
        patient_id: patientId,
        visit_date: { [Op.gte]: sixMonthsAgo },
        status: 'COMPLETED'
      }
    });

    // Expected: at least 2 visits in 6 months
    const visitCompliance = Math.min(100, (visitsCount / 2) * 100);

    // 4. No-show rate
    const totalScheduledVisits = await Visit.count({
      where: {
        patient_id: patientId,
        visit_date: { [Op.gte]: sixMonthsAgo },
        status: { [Op.in]: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] }
      }
    });

    const noShowVisits = await Visit.count({
      where: {
        patient_id: patientId,
        visit_date: { [Op.gte]: sixMonthsAgo },
        status: 'NO_SHOW'
      }
    });

    const noShowRate = totalScheduledVisits > 0
      ? (noShowVisits / totalScheduledVisits) * 100
      : 0;

    // Calculate overall score (0-100)
    // Weights: compliance 30%, out-of-range 30%, visits 25%, no-show 15%
    const score = Math.round(
      (measureCompliance * 0.30) +
      ((100 - outOfRangePercent) * 0.30) +
      (visitCompliance * 0.25) +
      ((100 - noShowRate) * 0.15)
    );

    // Determine risk level
    let riskLevel = 'low';
    if (score < 40) riskLevel = 'critical';
    else if (score < 60) riskLevel = 'high';
    else if (score < 80) riskLevel = 'medium';

    return {
      score,
      riskLevel,
      components: {
        measureCompliance: Math.round(measureCompliance),
        outOfRangePercent: Math.round(outOfRangePercent),
        visitCompliance: Math.round(visitCompliance),
        noShowRate: Math.round(noShowRate)
      },
      details: {
        measuresLogged: measuresCount,
        outOfRangeMeasures: outOfRangeCount,
        totalMeasures: outOfRangeMeasures.length,
        completedVisits: visitsCount,
        noShowVisits
      }
    };
  } catch (error) {
    console.error('Error calculating health score:', error);
    throw error;
  }
}

module.exports = {
  getHealthTrends,
  getFinancialMetrics,
  getCommunicationEffectiveness,
  calculatePatientHealthScore
};
