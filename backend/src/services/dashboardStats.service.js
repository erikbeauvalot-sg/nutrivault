/**
 * Dashboard Statistics Service
 * Provides KPIs and metrics for the "Mon Cabinet" dashboard
 * All queries are scoped by user role (ADMIN sees all, DIETITIAN sees own data)
 */

const db = require('../../../models');
const { Op } = db.Sequelize;
const { getScopedPatientIds, getScopedDietitianIds } = require('../helpers/scopeHelper');

/**
 * Build patient scope where clause for counts
 */
async function buildPatientWhere(user, baseWhere = {}) {
  const patientIds = await getScopedPatientIds(user);
  if (patientIds === null) return baseWhere; // ADMIN
  return { ...baseWhere, id: { [Op.in]: patientIds } };
}

/**
 * Build visit scope where clause
 */
async function buildVisitWhere(user, baseWhere = {}) {
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return baseWhere; // ADMIN
  if (dietitianIds.length === 0) return { ...baseWhere, id: null }; // impossible match
  const patientIds = await getScopedPatientIds(user);
  return {
    ...baseWhere,
    [Op.or]: [
      { dietitian_id: { [Op.in]: dietitianIds } },
      ...(patientIds && patientIds.length > 0
        ? [{ patient_id: { [Op.in]: patientIds } }]
        : [])
    ]
  };
}

/**
 * Build billing scope where clause (via patient)
 */
async function buildBillingWhere(user, baseWhere = {}) {
  const patientIds = await getScopedPatientIds(user);
  if (patientIds === null) return baseWhere; // ADMIN
  if (patientIds.length === 0) return { ...baseWhere, id: null };
  return { ...baseWhere, patient_id: { [Op.in]: patientIds } };
}

/**
 * Get practice overview KPIs
 */
const getPracticeOverview = async (user) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Total active patients
  const totalPatients = await db.Patient.count({
    where: await buildPatientWhere(user, { is_active: true })
  });

  // New patients this month
  const newPatientsThisMonth = await db.Patient.count({
    where: await buildPatientWhere(user, {
      is_active: true,
      created_at: { [Op.gte]: startOfMonth }
    })
  });

  // New patients last month
  const newPatientsLastMonth = await db.Patient.count({
    where: await buildPatientWhere(user, {
      is_active: true,
      created_at: {
        [Op.gte]: startOfLastMonth,
        [Op.lte]: endOfLastMonth
      }
    })
  });

  // Visits this month
  const visitsThisMonth = await db.Visit.count({
    where: await buildVisitWhere(user, {
      visit_date: { [Op.gte]: startOfMonth },
      status: { [Op.in]: ['COMPLETED', 'SCHEDULED'] }
    })
  });

  // Visits last month
  const visitsLastMonth = await db.Visit.count({
    where: await buildVisitWhere(user, {
      visit_date: {
        [Op.gte]: startOfLastMonth,
        [Op.lte]: endOfLastMonth
      },
      status: { [Op.in]: ['COMPLETED', 'SCHEDULED'] }
    })
  });

  // Revenue this month (from billing)
  const revenueThisMonthResult = await db.Billing.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']
    ],
    where: await buildBillingWhere(user, {
      invoice_date: { [Op.gte]: startOfMonth }
    }),
    raw: true
  });
  const revenueThisMonth = parseFloat(revenueThisMonthResult?.total || 0);

  // Revenue last month
  const revenueLastMonthResult = await db.Billing.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']
    ],
    where: await buildBillingWhere(user, {
      invoice_date: {
        [Op.gte]: startOfLastMonth,
        [Op.lte]: endOfLastMonth
      }
    }),
    raw: true
  });
  const revenueLastMonth = parseFloat(revenueLastMonthResult?.total || 0);

  // Outstanding amount (unpaid invoices)
  const outstandingResult = await db.Billing.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount_due')), 'total']
    ],
    where: await buildBillingWhere(user, {
      payment_status: { [Op.in]: ['PENDING', 'PARTIAL'] }
    }),
    raw: true
  });
  const outstandingAmount = parseFloat(outstandingResult?.total || 0);

  // Patient retention rate (patients with visits in last 3 months / total patients)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const patientsWithRecentVisits = await db.Visit.count({
    where: await buildVisitWhere(user, {
      visit_date: { [Op.gte]: threeMonthsAgo },
      status: 'COMPLETED'
    }),
    distinct: true,
    col: 'patient_id'
  });
  const retentionRate = totalPatients > 0
    ? Math.round((patientsWithRecentVisits / totalPatients) * 100)
    : 0;

  return {
    totalPatients,
    newPatientsThisMonth,
    newPatientsLastMonth,
    patientsChange: newPatientsThisMonth - newPatientsLastMonth,
    visitsThisMonth,
    visitsLastMonth,
    visitsChange: visitsThisMonth - visitsLastMonth,
    revenueThisMonth,
    revenueLastMonth,
    revenueChange: revenueThisMonth - revenueLastMonth,
    retentionRate,
    outstandingAmount
  };
};

/**
 * Get revenue chart data for the last 12 months
 */
const getRevenueChart = async (user, period = 'monthly') => {
  const now = new Date();
  const data = [];

  if (period === 'monthly') {
    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const result = await db.Billing.findOne({
        attributes: [
          [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'revenue'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'invoices']
        ],
        where: await buildBillingWhere(user, {
          invoice_date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          }
        }),
        raw: true
      });

      data.push({
        period: startDate.toISOString().slice(0, 7), // YYYY-MM format
        month: startDate.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: parseFloat(result?.revenue || 0),
        invoices: parseInt(result?.invoices || 0, 10)
      });
    }
  } else if (period === 'quarterly') {
    // Last 4 quarters
    for (let i = 3; i >= 0; i--) {
      const quarterStart = new Date(now.getFullYear(), now.getMonth() - (i * 3) - 2, 1);
      const quarterEnd = new Date(now.getFullYear(), now.getMonth() - (i * 3) + 1, 0);

      const result = await db.Billing.findOne({
        attributes: [
          [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'revenue'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'invoices']
        ],
        where: await buildBillingWhere(user, {
          invoice_date: {
            [Op.gte]: quarterStart,
            [Op.lte]: quarterEnd
          }
        }),
        raw: true
      });

      const q = Math.floor((quarterStart.getMonth() + 3) / 3);
      data.push({
        period: `Q${q} ${quarterStart.getFullYear()}`,
        revenue: parseFloat(result?.revenue || 0),
        invoices: parseInt(result?.invoices || 0, 10)
      });
    }
  }

  return data;
};

/**
 * Calculate practice health score (0-100)
 * Based on multiple factors
 */
const getPracticeHealthScore = async (user) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  // Scores components
  let patientScore = 0;
  let revenueScore = 0;
  let retentionScore = 0;
  let activityScore = 0;
  let paymentScore = 0;

  // 1. Patient Growth Score (0-20)
  const totalPatients = await db.Patient.count({
    where: await buildPatientWhere(user, { is_active: true })
  });
  const newPatientsThisMonth = await db.Patient.count({
    where: await buildPatientWhere(user, {
      is_active: true,
      created_at: { [Op.gte]: startOfMonth }
    })
  });

  if (totalPatients > 0) {
    const growthRate = (newPatientsThisMonth / totalPatients) * 100;
    patientScore = Math.min(20, Math.round(growthRate * 2)); // 10% growth = 20 points
  }

  // 2. Revenue Trend Score (0-20)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const revenueThisMonthResult = await db.Billing.findOne({
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']],
    where: await buildBillingWhere(user, { invoice_date: { [Op.gte]: startOfMonth } }),
    raw: true
  });
  const revenueThisMonth = parseFloat(revenueThisMonthResult?.total || 0);

  const revenueLastMonthResult = await db.Billing.findOne({
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']],
    where: await buildBillingWhere(user, {
      invoice_date: { [Op.gte]: lastMonthStart, [Op.lte]: lastMonthEnd }
    }),
    raw: true
  });
  const revenueLastMonth = parseFloat(revenueLastMonthResult?.total || 0);

  if (revenueLastMonth > 0) {
    const revenueGrowth = ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
    revenueScore = Math.min(20, Math.max(0, 10 + Math.round(revenueGrowth / 2)));
  } else if (revenueThisMonth > 0) {
    revenueScore = 15;
  }

  // 3. Patient Retention Score (0-20)
  const patientsWithRecentVisits = await db.Visit.count({
    where: await buildVisitWhere(user, {
      visit_date: { [Op.gte]: threeMonthsAgo },
      status: 'COMPLETED'
    }),
    distinct: true,
    col: 'patient_id'
  });

  if (totalPatients > 0) {
    const retentionRate = (patientsWithRecentVisits / totalPatients) * 100;
    retentionScore = Math.min(20, Math.round(retentionRate / 5));
  }

  // 4. Activity Score (0-20) - based on visits completed this month
  const visitsThisMonth = await db.Visit.count({
    where: await buildVisitWhere(user, {
      visit_date: { [Op.gte]: startOfMonth },
      status: 'COMPLETED'
    })
  });
  activityScore = Math.min(20, visitsThisMonth); // 1 point per visit, max 20

  // 5. Payment Health Score (0-20) - based on payment rate
  const totalBilledResult = await db.Billing.findOne({
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']],
    where: await buildBillingWhere(user, {
      invoice_date: { [Op.gte]: threeMonthsAgo }
    }),
    raw: true
  });
  const totalBilled = parseFloat(totalBilledResult?.total || 0);

  // For payments, scope by billing's patient scope
  const patientIds = await getScopedPatientIds(user);
  let paymentWhere = { payment_date: { [Op.gte]: threeMonthsAgo } };
  if (patientIds !== null) {
    // Join through billing to scope payments
    const scopedBillingIds = await db.Billing.findAll({
      where: await buildBillingWhere(user, {}),
      attributes: ['id'],
      raw: true
    });
    paymentWhere.billing_id = { [Op.in]: scopedBillingIds.map(b => b.id) };
  }

  const totalPaidResult = await db.Payment.findOne({
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']],
    where: paymentWhere,
    raw: true
  });
  const totalPaid = parseFloat(totalPaidResult?.total || 0);

  if (totalBilled > 0) {
    const paymentRate = (totalPaid / totalBilled) * 100;
    paymentScore = Math.min(20, Math.round(paymentRate / 5));
  } else {
    paymentScore = 15; // Default if no billing
  }

  const totalScore = patientScore + revenueScore + retentionScore + activityScore + paymentScore;

  return {
    totalScore,
    maxScore: 100,
    components: {
      patientGrowth: { score: patientScore, max: 20, label: 'Croissance patients' },
      revenue: { score: revenueScore, max: 20, label: 'Tendance CA' },
      retention: { score: retentionScore, max: 20, label: 'Rétention' },
      activity: { score: activityScore, max: 20, label: 'Activité' },
      payments: { score: paymentScore, max: 20, label: 'Paiements' }
    },
    level: totalScore >= 80 ? 'excellent' : totalScore >= 60 ? 'good' : totalScore >= 40 ? 'average' : 'needs_improvement'
  };
};

module.exports = {
  getPracticeOverview,
  getRevenueChart,
  getPracticeHealthScore
};
