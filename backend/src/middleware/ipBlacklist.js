/**
 * IP Blacklist Middleware
 *
 * Checks if the request IP is in the blacklist before processing.
 * Returns 403 for blocked IPs.
 */

const db = require('../../../models');

// In-memory cache to avoid hitting DB on every request
let blacklistCache = new Set();
let cacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

async function refreshCache() {
  const rows = await db.IpBlacklist.findAll({
    where: { is_active: true },
    attributes: ['ip_address']
  });
  blacklistCache = new Set(rows.map(r => r.ip_address));
  cacheTime = Date.now();
}

function invalidateBlacklistCache() {
  cacheTime = 0;
}

async function ipBlacklistMiddleware(req, res, next) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || '';
    const normalizedIp = ip.replace(/^::ffff:/, ''); // normalize IPv4-mapped IPv6

    if (Date.now() - cacheTime > CACHE_TTL_MS) {
      await refreshCache();
    }

    if (blacklistCache.has(normalizedIp) || blacklistCache.has(ip)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Your IP address has been blocked.'
      });
    }

    next();
  } catch (err) {
    // On DB error, let the request through (fail open for availability)
    console.error('[ipBlacklist] middleware error:', err.message);
    next();
  }
}

/**
 * Auto-blacklist an IP after too many rate-limit hits.
 * Called from the rate limiter handler.
 */
async function autoBlacklistIp(ip, reason = 'Trop de tentatives de connexion (rate limit)') {
  try {
    const normalizedIp = ip.replace(/^::ffff:/, '');

    // Check if already blacklisted
    const existing = await db.IpBlacklist.findOne({
      where: { ip_address: normalizedIp, is_active: true }
    });
    if (existing) return;

    await db.IpBlacklist.create({
      ip_address: normalizedIp,
      reason,
      auto_blocked: true,
      is_active: true,
      blocked_at: new Date()
    });

    // Invalidate cache so next request sees the new entry
    invalidateBlacklistCache();

    // Notify Discord
    const discordService = require('../services/discord.service');
    discordService.notifySecurity({
      eventCode: 'security.IP_BLOCKED',
      ipAddress: normalizedIp,
      reason
    }).catch(() => {});

    console.log(`[ipBlacklist] Auto-blocked IP: ${normalizedIp} — ${reason}`);
  } catch (err) {
    console.error('[ipBlacklist] autoBlacklistIp error:', err.message);
  }
}

module.exports = { ipBlacklistMiddleware, autoBlacklistIp, invalidateBlacklistCache };
