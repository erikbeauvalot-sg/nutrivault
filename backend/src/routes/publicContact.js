const express = require('express');
const router = express.Router();
const discordService = require('../services/discord.service');

// Simple in-memory rate limiter: max 5 submissions per IP per 15 minutes
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry) {
    // Clean expired timestamps
    entry.timestamps = entry.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (entry.timestamps.length >= RATE_LIMIT_MAX) {
      return res.status(429).json({ success: false, error: 'Trop de soumissions, réessayez plus tard.' });
    }
    entry.timestamps.push(now);
  } else {
    rateLimitMap.set(ip, { timestamps: [now] });
  }

  next();
}

// Clean up rate limit map periodically (every 30 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (entry.timestamps.length === 0) rateLimitMap.delete(ip);
  }
}, 30 * 60 * 1000);

/**
 * POST /api/public/contact
 * Public endpoint — sends a Discord notification for MarionDiet contact form
 */
router.post('/', rateLimit, async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Champs requis manquants.' });
    }

    // Fire-and-forget Discord notification
    discordService.notifyContact({ name, email, phone, subject, message }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('Contact notification error:', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
});

module.exports = router;
