const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const db = require('../../../models');

/**
 * GET /api/notifications — List notifications for current user (paginated)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await db.Notification.findAndCountAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count — Count unread notifications
 */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await db.Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    res.json({ count });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ error: 'Failed to count unread notifications' });
  }
});

/**
 * PUT /api/notifications/read-all — Mark all as read
 */
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const [updated] = await db.Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.json({ updated });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

/**
 * PUT /api/notifications/:id/read — Mark one as read
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    await notification.update({ is_read: true, read_at: new Date() });
    res.json({ data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * DELETE /api/notifications/:id — Delete a notification
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const deleted = await db.Notification.destroy({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * POST /api/notifications/reset-badge — Reset iOS badge to 0 via silent push
 */
router.post('/reset-badge', authenticate, async (req, res) => {
  try {
    const pushService = require('../services/pushNotification.service');
    await pushService.resetBadge(req.user.id);
    res.json({ message: 'Badge reset' });
  } catch (error) {
    console.error('Error resetting badge:', error);
    res.status(500).json({ error: 'Failed to reset badge' });
  }
});

module.exports = router;
