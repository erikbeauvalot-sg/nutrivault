/**
 * Dashboard Controller
 * Handles dashboard-related API endpoints
 */

const dashboardStatsService = require('../services/dashboardStats.service');
const activityFeedService = require('../services/activityFeed.service');
const whatsNewService = require('../services/whatsNew.service');
const { getScopedPatientIds } = require('../helpers/scopeHelper');
const db = require('../../../models');

/**
 * Get practice overview KPIs
 * GET /api/dashboard/overview
 */
const getOverview = async (req, res) => {
  try {
    const overview = await dashboardStatsService.getPracticeOverview(req.user);
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview'
    });
  }
};

/**
 * Get revenue chart data
 * GET /api/dashboard/revenue-chart?period=monthly|quarterly
 */
const getRevenueChart = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const data = await dashboardStatsService.getRevenueChart(req.user, period);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching revenue chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue chart data'
    });
  }
};

/**
 * Get practice health score
 * GET /api/dashboard/health-score
 */
const getHealthScore = async (req, res) => {
  try {
    const score = await dashboardStatsService.getPracticeHealthScore(req.user);
    res.json({
      success: true,
      data: score
    });
  } catch (error) {
    console.error('Error fetching health score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch practice health score'
    });
  }
};

/**
 * Get activity feed
 * GET /api/dashboard/activity?limit=20
 */
const getActivityFeed = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activities = await activityFeedService.getRecentActivity(parseInt(limit, 10));
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity feed'
    });
  }
};

/**
 * Get activity summary
 * GET /api/dashboard/activity-summary
 */
const getActivitySummary = async (req, res) => {
  try {
    const summary = await activityFeedService.getActivitySummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity summary'
    });
  }
};

/**
 * Get what's new / changelog
 * GET /api/dashboard/whats-new?language=fr
 */
const getWhatsNew = async (req, res) => {
  try {
    const { language = 'fr' } = req.query;
    const changelog = whatsNewService.getLatestChangelog(language);
    const currentVersion = whatsNewService.getCurrentVersion();

    res.json({
      success: true,
      data: {
        currentVersion,
        changelog
      }
    });
  } catch (error) {
    console.error('Error fetching what\'s new:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch what\'s new'
    });
  }
};

/**
 * Get all changelogs
 * GET /api/dashboard/changelogs?language=fr&limit=5
 */
const getAllChangelogs = async (req, res) => {
  try {
    const { language = 'fr', limit = 5 } = req.query;
    const changelogs = whatsNewService.getAllChangelogs(language, parseInt(limit, 10));

    res.json({
      success: true,
      data: changelogs
    });
  } catch (error) {
    console.error('Error fetching changelogs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch changelogs'
    });
  }
};

/**
 * Get recent journal entries across the dietitian's patients
 * GET /api/dashboard/recent-journal?limit=10
 */
const getRecentJournal = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const patientIds = await getScopedPatientIds(req.user);

    if (patientIds !== null && patientIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const where = { is_private: false };
    if (patientIds !== null) {
      where.patient_id = { [db.Sequelize.Op.in]: patientIds };
    }

    const entries = await db.JournalEntry.findAll({
      where,
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      include: [
        {
          model: db.Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: db.JournalComment,
          as: 'comments',
          attributes: ['id']
        }
      ]
    });

    const data = entries.map(e => ({
      id: e.id,
      patient_id: e.patient_id,
      patient_name: e.patient ? `${e.patient.first_name} ${e.patient.last_name}` : '—',
      entry_date: e.entry_date,
      entry_type: e.entry_type,
      title: e.title,
      content: e.content?.substring(0, 120) + (e.content?.length > 120 ? '...' : ''),
      mood: e.mood,
      energy_level: e.energy_level,
      tags: e.tags,
      comment_count: e.comments ? e.comments.length : 0,
      created_at: e.created_at
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching recent journal:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent journal entries' });
  }
};

/**
 * Get all day stats in one call
 * GET /api/dashboard/day-stats
 */
const getDayStats = async (req, res) => {
  try {
    const stats = await dashboardStatsService.getDayStats(req.user);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching day stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch day stats' });
  }
};

/**
 * Get dashboard preferences
 * GET /api/dashboard/preferences
 */
const DEFAULT_WIDGETS = {
  todaysAppointments: true,
  completedToday: true,
  upcomingVisits: true,
  newMessages: true,
  unpaidInvoices: true,
  pendingQuotes: true,
  todaysJournalEntries: true,
  patientsWithoutFollowup: true,
  upcomingBirthdays: true,
  tasksDueToday: true,
  newPatientMeasures: true,
  alertsWidget: true,
  measureAlertsWidget: true,
  recentJournalWidget: true,
  todaysAppointmentsList: true,
  birthdaysWidget: true,
  tasksDueTodayWidget: true,
};

const getDashboardPreferences = async (req, res) => {
  try {
    const [pref] = await db.DashboardPreference.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { widgets: DEFAULT_WIDGETS }
    });
    // Merge with defaults so new widgets are always enabled by default
    const merged = { ...DEFAULT_WIDGETS, ...pref.widgets };
    res.json({ success: true, data: { widgets: merged } });
  } catch (error) {
    console.error('Error fetching dashboard preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard preferences' });
  }
};

/**
 * Update dashboard preferences
 * PUT /api/dashboard/preferences
 */
const updateDashboardPreferences = async (req, res) => {
  try {
    const { widgets } = req.body;
    if (!widgets || typeof widgets !== 'object') {
      return res.status(400).json({ success: false, error: 'widgets object is required' });
    }
    const [pref] = await db.DashboardPreference.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { widgets: DEFAULT_WIDGETS }
    });
    // Merge with existing so only the provided keys are toggled
    const merged = { ...DEFAULT_WIDGETS, ...pref.widgets, ...widgets };
    pref.widgets = merged;
    await pref.save();
    res.json({ success: true, data: { widgets: merged } });
  } catch (error) {
    console.error('Error updating dashboard preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to update dashboard preferences' });
  }
};

module.exports = {
  getOverview,
  getRevenueChart,
  getHealthScore,
  getActivityFeed,
  getActivitySummary,
  getWhatsNew,
  getAllChangelogs,
  getRecentJournal,
  getDayStats,
  getDashboardPreferences,
  updateDashboardPreferences
};
