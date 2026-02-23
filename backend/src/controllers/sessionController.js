/**
 * Session Controller
 *
 * Handles HTTP requests for session management endpoints:
 * - GET    /api/sessions          - List all sessions (paginated, filterable)
 * - GET    /api/sessions/stats    - Session statistics
 * - DELETE /api/sessions/:id      - Revoke a single session
 * - DELETE /api/sessions/user/:userId - Revoke all active sessions for a user
 */

const { Op } = require('sequelize');
const db = require('../../../models');

/**
 * Derive a human-readable device name from a user-agent string
 */
function getDeviceName(userAgent) {
  if (!userAgent) return 'Unknown device';

  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('android') && ua.includes('mobile')) return 'Android Phone';
  if (ua.includes('android')) return 'Android Tablet';
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'Mac';
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('capacitor') || ua.includes('ionic')) return 'Mobile App';

  return 'Browser';
}

/**
 * GET /api/sessions
 * Query params: page, limit, status (active|revoked|all), userId, search
 */
async function getSessions(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const { status = 'all', userId, search } = req.query;

    // Build where clause for RefreshToken
    const tokenWhere = {};
    if (status === 'active') {
      tokenWhere.is_revoked = false;
      tokenWhere.expires_at = { [Op.gt]: new Date() };
    } else if (status === 'revoked') {
      tokenWhere[Op.or] = [
        { is_revoked: true },
        { expires_at: { [Op.lte]: new Date() } }
      ];
    }

    // Build where clause for User
    const userWhere = {};
    if (userId) {
      userWhere.id = userId;
    }
    if (search) {
      userWhere[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email:    { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name:  { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.RefreshToken.findAndCountAll({
      where: tokenWhere,
      include: [
        {
          model: db.User,
          as: 'user',
          where: userWhere,
          attributes: ['id', 'username', 'email', 'first_name', 'last_name'],
          include: [
            {
              model: db.Role,
              as: 'role',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const sessions = rows.map(token => ({
      id:           token.id,
      user: {
        id:         token.user.id,
        username:   token.user.username,
        email:      token.user.email,
        first_name: token.user.first_name,
        last_name:  token.user.last_name,
        role:       token.user.role?.name || null
      },
      user_agent:   token.user_agent,
      ip_address:   token.ip_address,
      device_name:  getDeviceName(token.user_agent),
      is_revoked:   token.is_revoked,
      is_expired:   new Date(token.expires_at) <= new Date(),
      is_active:    !token.is_revoked && new Date(token.expires_at) > new Date(),
      created_at:   token.created_at,
      expires_at:   token.expires_at,
      revoked_at:   token.revoked_at
    }));

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sessions/stats
 */
async function getStats(req, res, next) {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Active sessions (not revoked and not expired)
    const activeSessions = await db.RefreshToken.count({
      where: {
        is_revoked: false,
        expires_at: { [Op.gt]: now }
      }
    });

    // Distinct users with active sessions
    const activeUsersResult = await db.RefreshToken.findAll({
      where: {
        is_revoked: false,
        expires_at: { [Op.gt]: now }
      },
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('user_id'))), 'count']
      ],
      raw: true
    });
    const activeUsers = parseInt(activeUsersResult[0]?.count || 0);

    // Logins in last 24h — count refresh tokens created in that window
    const loginsLast24h = await db.RefreshToken.count({
      where: {
        created_at: { [Op.gte]: yesterday }
      }
    });

    // Sessions revoked today
    const revokedToday = await db.RefreshToken.count({
      where: {
        is_revoked: true,
        revoked_at: { [Op.gte]: todayStart }
      }
    });

    res.json({
      success: true,
      data: {
        activeSessions,
        activeUsers,
        loginsLast24h,
        revokedToday
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/sessions/:id
 */
async function revokeSession(req, res, next) {
  try {
    const { id } = req.params;

    const token = await db.RefreshToken.findByPk(id);

    if (!token) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (token.is_revoked) {
      return res.status(400).json({ success: false, error: 'Session is already revoked' });
    }

    await token.update({ is_revoked: true, revoked_at: new Date() });

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/sessions/user/:userId
 * Revoke all active sessions for the given user
 */
async function revokeUserSessions(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await db.User.findByPk(userId, { attributes: ['id', 'username'] });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const [count] = await db.RefreshToken.update(
      { is_revoked: true, revoked_at: new Date() },
      {
        where: {
          user_id: userId,
          is_revoked: false
        }
      }
    );

    res.json({
      success: true,
      message: `Revoked ${count} session(s) for user ${user.username}`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getSessions, getStats, revokeSession, revokeUserSessions };
