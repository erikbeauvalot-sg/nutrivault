/**
 * Dashboard Controller
 * Handles dashboard-related API endpoints
 */

const dashboardStatsService = require('../services/dashboardStats.service');
const activityFeedService = require('../services/activityFeed.service');
const whatsNewService = require('../services/whatsNew.service');

/**
 * Get practice overview KPIs
 * GET /api/dashboard/overview
 */
const getOverview = async (req, res) => {
  try {
    const overview = await dashboardStatsService.getPracticeOverview();
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
    const data = await dashboardStatsService.getRevenueChart(period);
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
    const score = await dashboardStatsService.getPracticeHealthScore();
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

module.exports = {
  getOverview,
  getRevenueChart,
  getHealthScore,
  getActivityFeed,
  getActivitySummary,
  getWhatsNew,
  getAllChangelogs
};
