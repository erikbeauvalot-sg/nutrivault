/**
 * Page View Controller
 * Handles page view tracking for public landing pages like /mariondiet
 */

const db = require('../../../models');
const { Op } = require('sequelize');
const UAParser = require('ua-parser-js');

/**
 * Anonymize IP address (keep first 3 octets for IPv4, first 3 groups for IPv6)
 */
const anonymizeIP = (ip) => {
  if (!ip) return null;

  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  // Handle IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::`;
    }
  }

  return null;
};

/**
 * Parse user agent to extract device info
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: null, os: null };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  let deviceType = 'unknown';
  const device = result.device.type;

  if (device === 'mobile') {
    deviceType = 'mobile';
  } else if (device === 'tablet') {
    deviceType = 'tablet';
  } else if (!device || device === undefined) {
    // Desktop doesn't have a type in ua-parser-js
    deviceType = 'desktop';
  }

  return {
    deviceType,
    browser: result.browser.name || null,
    os: result.os.name || null
  };
};

/**
 * POST /api/page-views/track
 * Track a page view (public endpoint, no auth required)
 */
exports.trackPageView = async (req, res, next) => {
  try {
    const {
      page_path,
      visitor_id,
      session_id,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign
    } = req.body;

    if (!page_path) {
      return res.status(400).json({
        success: false,
        error: 'page_path is required'
      });
    }

    // Get client info
    const userAgent = req.headers['user-agent'];
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip;

    // Parse user agent
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Create page view record
    const pageView = await db.PageView.create({
      page_path,
      visitor_id,
      session_id,
      referrer: referrer || req.headers.referer || null,
      user_agent: userAgent,
      ip_address: anonymizeIP(ip),
      device_type: deviceType,
      browser,
      os,
      utm_source,
      utm_medium,
      utm_campaign
    });

    res.status(201).json({
      success: true,
      data: {
        id: pageView.id
      }
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
    next(error);
  }
};

/**
 * GET /api/page-views/stats
 * Get page view statistics (requires authentication)
 */
exports.getPageViewStats = async (req, res, next) => {
  try {
    const { page_path, start_date, end_date, period = 'day' } = req.query;

    // Build where clause
    const where = {};

    if (page_path) {
      where.page_path = { [Op.like]: `${page_path}%` };
    }

    if (start_date) {
      where.created_at = where.created_at || {};
      where.created_at[Op.gte] = new Date(start_date);
    }

    if (end_date) {
      where.created_at = where.created_at || {};
      // Set to end of day (23:59:59.999) to include the entire end date
      const endOfDay = new Date(end_date);
      endOfDay.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = endOfDay;
    }

    // Get total page views
    const totalViews = await db.PageView.count({ where });

    // Get unique visitors
    const uniqueVisitors = await db.PageView.count({
      where,
      distinct: true,
      col: 'visitor_id'
    });

    // Get views by device type
    const viewsByDevice = await db.PageView.findAll({
      where,
      attributes: [
        'device_type',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['device_type'],
      raw: true
    });

    // Get views by browser
    const viewsByBrowser = await db.PageView.findAll({
      where,
      attributes: [
        'browser',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['browser'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get views by page path
    const viewsByPage = await db.PageView.findAll({
      where,
      attributes: [
        'page_path',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['page_path'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      limit: 20,
      raw: true
    });

    // Get top referrers
    const topReferrers = await db.PageView.findAll({
      where: {
        ...where,
        referrer: { [Op.ne]: null }
      },
      attributes: [
        'referrer',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['referrer'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get views over time
    let dateFormat;
    if (db.sequelize.getDialect() === 'sqlite') {
      switch (period) {
        case 'hour':
          dateFormat = '%Y-%m-%d %H:00';
          break;
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          dateFormat = '%Y-%W';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        default:
          dateFormat = '%Y-%m-%d';
      }
    } else {
      // PostgreSQL format
      switch (period) {
        case 'hour':
          dateFormat = 'YYYY-MM-DD HH24:00';
          break;
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'week':
          dateFormat = 'IYYY-IW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }
    }

    let viewsOverTime;
    if (db.sequelize.getDialect() === 'sqlite') {
      viewsOverTime = await db.PageView.findAll({
        where,
        attributes: [
          [db.sequelize.fn('strftime', dateFormat, db.sequelize.col('created_at')), 'date'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: [db.sequelize.fn('strftime', dateFormat, db.sequelize.col('created_at'))],
        order: [[db.sequelize.fn('strftime', dateFormat, db.sequelize.col('created_at')), 'ASC']],
        raw: true
      });
    } else {
      viewsOverTime = await db.PageView.findAll({
        where,
        attributes: [
          [db.sequelize.fn('to_char', db.sequelize.col('created_at'), dateFormat), 'date'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: [db.sequelize.fn('to_char', db.sequelize.col('created_at'), dateFormat)],
        order: [[db.sequelize.fn('to_char', db.sequelize.col('created_at'), dateFormat), 'ASC']],
        raw: true
      });
    }

    // Get UTM campaign stats
    const utmStats = await db.PageView.findAll({
      where: {
        ...where,
        utm_source: { [Op.ne]: null }
      },
      attributes: [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['utm_source', 'utm_medium', 'utm_campaign'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      limit: 20,
      raw: true
    });

    res.json({
      success: true,
      data: {
        totalViews,
        uniqueVisitors,
        viewsByDevice,
        viewsByBrowser,
        viewsByPage,
        topReferrers,
        viewsOverTime,
        utmStats
      }
    });
  } catch (error) {
    console.error('Error getting page view stats:', error);
    next(error);
  }
};

/**
 * GET /api/page-views/recent
 * Get recent page views with details (requires authentication)
 */
exports.getRecentPageViews = async (req, res, next) => {
  try {
    const { page_path, limit = 50 } = req.query;

    const where = {};
    if (page_path) {
      where.page_path = { [Op.like]: `${page_path}%` };
    }

    const pageViews = await db.PageView.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      attributes: [
        'id',
        'page_path',
        'visitor_id',
        'referrer',
        'device_type',
        'browser',
        'os',
        'country',
        'city',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'created_at'
      ]
    });

    res.json({
      success: true,
      data: pageViews
    });
  } catch (error) {
    console.error('Error getting recent page views:', error);
    next(error);
  }
};
