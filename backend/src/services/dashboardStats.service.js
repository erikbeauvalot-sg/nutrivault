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
 * Build quote scope where clause (via created_by)
 */
async function buildQuoteWhere(user, baseWhere = {}) {
  const dietitianIds = await getScopedDietitianIds(user);
  if (dietitianIds === null) return baseWhere; // ADMIN
  if (dietitianIds.length === 0) return { ...baseWhere, id: null };
  return { ...baseWhere, created_by: { [Op.in]: dietitianIds } };
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
      status: { [Op.in]: ['SENT', 'OVERDUE'] }
    }),
    raw: true
  });
  const outstandingAmount = parseFloat(outstandingResult?.total || 0);

  // Pending quotes (SENT quotes awaiting decision)
  const pendingQuotesResult = await db.Quote.findOne({
    attributes: [
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']
    ],
    where: await buildQuoteWhere(user, {
      status: 'SENT', is_active: true
    }),
    raw: true
  });
  const pendingQuotesCount = parseInt(pendingQuotesResult?.count || 0, 10);
  const pendingQuotesAmount = parseFloat(pendingQuotesResult?.total || 0);

  // Accepted quotes this month
  const acceptedQuotesResult = await db.Quote.findOne({
    attributes: [
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'total']
    ],
    where: await buildQuoteWhere(user, {
      status: 'ACCEPTED',
      is_active: true,
      accepted_date: { [Op.gte]: startOfMonth }
    }),
    raw: true
  });
  const acceptedQuotesThisMonth = parseInt(acceptedQuotesResult?.count || 0, 10);
  const acceptedQuotesAmount = parseFloat(acceptedQuotesResult?.total || 0);

  // Expenses this month
  let expensesThisMonth = 0;
  let expensesLastMonth = 0;
  if (db.Expense) {
    const expThisResult = await db.Expense.findOne({
      attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']],
      where: { expense_date: { [Op.gte]: startOfMonth }, is_active: true },
      raw: true
    });
    expensesThisMonth = parseFloat(expThisResult?.total || 0);

    const expLastResult = await db.Expense.findOne({
      attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']],
      where: {
        expense_date: { [Op.gte]: startOfLastMonth, [Op.lte]: endOfLastMonth },
        is_active: true
      },
      raw: true
    });
    expensesLastMonth = parseFloat(expLastResult?.total || 0);
  }

  // Accounting adjustments this month
  let adjustmentsThisMonth = 0;
  if (db.AccountingEntry) {
    const adjResult = await db.AccountingEntry.findOne({
      attributes: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']],
      where: { entry_date: { [Op.gte]: startOfMonth }, is_active: true },
      raw: true
    });
    adjustmentsThisMonth = parseFloat(adjResult?.total || 0);
  }

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
    outstandingAmount,
    pendingQuotesCount,
    pendingQuotesAmount,
    acceptedQuotesThisMonth,
    acceptedQuotesAmount,
    expensesThisMonth,
    expensesLastMonth,
    expensesChange: expensesThisMonth - expensesLastMonth,
    adjustmentsThisMonth,
    netProfitThisMonth: revenueThisMonth - expensesThisMonth + adjustmentsThisMonth
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

      // Quote pipeline for this period
      const quoteResult = await db.Quote.findOne({
        attributes: [
          [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'quote_value'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'quotes_count']
        ],
        where: await buildQuoteWhere(user, {
          quote_date: { [Op.gte]: startDate, [Op.lte]: endDate },
          is_active: true
        }),
        raw: true
      });

      data.push({
        period: startDate.toISOString().slice(0, 7), // YYYY-MM format
        month: startDate.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: parseFloat(result?.revenue || 0),
        invoices: parseInt(result?.invoices || 0, 10),
        quoteValue: parseFloat(quoteResult?.quote_value || 0),
        quotesCount: parseInt(quoteResult?.quotes_count || 0, 10)
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

      const quoteResult = await db.Quote.findOne({
        attributes: [
          [db.sequelize.fn('SUM', db.sequelize.col('amount_total')), 'quote_value'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'quotes_count']
        ],
        where: await buildQuoteWhere(user, {
          quote_date: { [Op.gte]: quarterStart, [Op.lte]: quarterEnd },
          is_active: true
        }),
        raw: true
      });

      const q = Math.floor((quarterStart.getMonth() + 3) / 3);
      data.push({
        period: `Q${q} ${quarterStart.getFullYear()}`,
        revenue: parseFloat(result?.revenue || 0),
        invoices: parseInt(result?.invoices || 0, 10),
        quoteValue: parseFloat(quoteResult?.quote_value || 0),
        quotesCount: parseInt(quoteResult?.quotes_count || 0, 10)
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

/**
 * Get "Ma Journée" day stats — all 11 stat counts in one call
 */
const getDayStats = async (user) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const patientIds = await getScopedPatientIds(user);
  const dietitianIds = await getScopedDietitianIds(user);

  // --- Visits ---
  const visitBaseWhere = await buildVisitWhere(user, {});
  const todaysAppointments = await db.Visit.count({
    where: {
      ...visitBaseWhere,
      visit_date: { [Op.between]: [todayStart, todayEnd] },
      status: { [Op.in]: ['SCHEDULED', 'COMPLETED', 'IN_PROGRESS'] }
    }
  });

  const completedToday = await db.Visit.count({
    where: {
      ...visitBaseWhere,
      visit_date: { [Op.between]: [todayStart, todayEnd] },
      status: 'COMPLETED'
    }
  });

  const upcomingVisits = await db.Visit.count({
    where: {
      ...visitBaseWhere,
      visit_date: { [Op.gt]: now },
      status: 'SCHEDULED'
    }
  });

  // --- Messages ---
  let messageWhere = {};
  if (dietitianIds !== null) {
    messageWhere.dietitian_id = { [Op.in]: dietitianIds };
  }
  const unreadResult = await db.Conversation.findOne({
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('dietitian_unread_count')), 'total']],
    where: messageWhere,
    raw: true
  });
  const newMessages = parseInt(unreadResult?.total || 0, 10);

  // --- Unpaid invoices ---
  const unpaidInvoices = await db.Billing.count({
    where: await buildBillingWhere(user, {
      status: { [Op.in]: ['SENT', 'OVERDUE'] }
    })
  });

  // --- Pending quotes ---
  const pendingQuotes = await db.Quote.count({
    where: await buildQuoteWhere(user, {
      status: 'SENT',
      is_active: true
    })
  });

  // --- Journal entries today ---
  let journalWhere = {
    entry_date: { [Op.between]: [todayStart.toISOString().slice(0, 10), todayEnd.toISOString().slice(0, 10)] },
    is_private: false
  };
  if (patientIds !== null) {
    if (patientIds.length === 0) {
      journalWhere.id = null; // impossible match
    } else {
      journalWhere.patient_id = { [Op.in]: patientIds };
    }
  }
  const todaysJournalEntries = await db.JournalEntry.count({ where: journalWhere });

  // --- Patients without follow-up (no visit in 30+ days) ---
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  // Find patient IDs with recent visits
  const recentVisitPatients = await db.Visit.findAll({
    attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('patient_id')), 'patient_id']],
    where: await buildVisitWhere(user, {
      visit_date: { [Op.gte]: thirtyDaysAgo },
      status: { [Op.in]: ['SCHEDULED', 'COMPLETED'] }
    }),
    raw: true
  });
  const recentPatientIds = recentVisitPatients.map(r => r.patient_id);

  let noFollowupWhere = await buildPatientWhere(user, { is_active: true });
  if (recentPatientIds.length > 0) {
    noFollowupWhere.id = {
      ...(noFollowupWhere.id || {}),
      [Op.notIn]: recentPatientIds
    };
  }
  const patientsWithoutFollowup = await db.Patient.count({ where: noFollowupWhere });

  // --- Upcoming birthdays (next 7 days) ---
  let upcomingBirthdays = 0;
  let birthdayList = [];
  try {
    // Find the date_of_birth custom field definition
    const dobField = await db.CustomFieldDefinition.findOne({
      where: { field_name: 'date_of_birth', is_active: true },
      raw: true
    });

    if (dobField) {
      // Get all patients' date_of_birth values
      let cfvWhere = { field_definition_id: dobField.id };
      if (patientIds !== null) {
        if (patientIds.length === 0) {
          cfvWhere.patient_id = null;
        } else {
          cfvWhere.patient_id = { [Op.in]: patientIds };
        }
      }

      const dobValues = await db.PatientCustomFieldValue.findAll({
        where: cfvWhere,
        include: [{
          model: db.Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name']
        }],
        raw: false
      });

      // Filter for next 7 days by month+day
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      for (const val of dobValues) {
        try {
          const dob = new Date(val.field_value);
          if (isNaN(dob.getTime())) continue;
          // Calculate this year's birthday
          let bday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
          // If already passed this year, check next year
          if (bday < today) {
            bday = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
          }
          const diffDays = Math.floor((bday - today) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 7) {
            const age = bday.getFullYear() - dob.getFullYear();
            birthdayList.push({
              patient_id: val.patient_id,
              patient_name: val.patient ? `${val.patient.first_name} ${val.patient.last_name}` : '—',
              date_of_birth: val.field_value,
              birthday_date: bday.toISOString().slice(0, 10),
              age,
              days_until: diffDays
            });
          }
        } catch { /* skip invalid dates */ }
      }
      birthdayList.sort((a, b) => a.days_until - b.days_until);
      upcomingBirthdays = birthdayList.length;
    }
  } catch { /* no birthday field — count stays 0 */ }

  // --- Tasks due today ---
  const roleName = user.role?.name || user.role;
  let taskWhere = {
    due_date: todayStart.toISOString().slice(0, 10),
    status: { [Op.ne]: 'completed' },
    is_active: true
  };
  if (roleName !== 'ADMIN') {
    taskWhere[Op.or] = [
      { assigned_to: user.id },
      { created_by: user.id }
    ];
  }
  const tasksDueToday = await db.Task.count({ where: taskWhere });

  // --- New patient measures today ---
  let measureWhere = {
    measured_at: { [Op.between]: [todayStart, todayEnd] }
  };
  if (patientIds !== null) {
    if (patientIds.length === 0) {
      measureWhere.id = null;
    } else {
      measureWhere.patient_id = { [Op.in]: patientIds };
    }
  }
  const newPatientMeasures = await db.PatientMeasure.count({ where: measureWhere });

  return {
    todaysAppointments,
    completedToday,
    upcomingVisits,
    newMessages,
    unpaidInvoices,
    pendingQuotes,
    todaysJournalEntries,
    patientsWithoutFollowup,
    upcomingBirthdays,
    birthdayList,
    tasksDueToday,
    newPatientMeasures
  };
};

module.exports = {
  getPracticeOverview,
  getRevenueChart,
  getPracticeHealthScore,
  getDayStats
};
