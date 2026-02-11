const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const db = require('../../../models');
const { Op } = db.Sequelize;

/**
 * GET /api/messages/conversations — List conversations for current dietitian
 * Admin sees all; dietitian sees their own.
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const roleName = req.user.role?.name || req.user.role;
    const where = {};
    if (roleName !== 'ADMIN') {
      where.dietitian_id = req.user.id;
    }

    const conversations = await db.Conversation.findAll({
      where,
      include: [
        {
          model: db.Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: db.User,
          as: 'dietitian',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
      order: [['last_message_at', 'DESC NULLS LAST']],
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
});

/**
 * POST /api/messages/conversations — Create or get existing conversation
 */
router.post('/conversations',
  authenticate,
  body('patient_id').isUUID(),
  async (req, res) => {
    try {
      const { patient_id } = req.body;

      const patient = await db.Patient.findByPk(patient_id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }

      const [conversation, created] = await db.Conversation.findOrCreate({
        where: { patient_id, dietitian_id: req.user.id },
        defaults: {},
      });

      if (created) {
        // Reload with includes
        const full = await db.Conversation.findByPk(conversation.id, {
          include: [
            { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: db.User, as: 'dietitian', attributes: ['id', 'first_name', 'last_name'] },
          ],
        });
        return res.status(201).json({ success: true, data: full });
      }

      const full = await db.Conversation.findByPk(conversation.id, {
        include: [
          { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: db.User, as: 'dietitian', attributes: ['id', 'first_name', 'last_name'] },
        ],
      });
      res.json({ success: true, data: full });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to create conversation' });
    }
  }
);

/**
 * GET /api/messages/conversations/:id/messages — Get messages for a conversation
 */
router.get('/conversations/:id/messages',
  authenticate,
  param('id').isUUID(),
  query('before').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  async (req, res) => {
    try {
      const conversation = await db.Conversation.findByPk(req.params.id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      // RBAC: dietitian sees own, admin sees all
      const roleName = req.user.role?.name || req.user.role;
      if (roleName !== 'ADMIN' && conversation.dietitian_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const where = { conversation_id: conversation.id };
      if (req.query.before) {
        where.created_at = { [Op.lt]: req.query.before };
      }

      const limit = parseInt(req.query.limit) || 50;

      const messages = await db.Message.findAll({
        where,
        include: [
          { model: db.User, as: 'sender', attributes: ['id', 'first_name', 'last_name'] },
        ],
        order: [['created_at', 'DESC']],
        limit,
      });

      // Mark unread messages as read (for dietitian)
      if (conversation.dietitian_unread_count > 0) {
        await db.Message.update(
          { is_read: true, read_at: new Date() },
          {
            where: {
              conversation_id: conversation.id,
              sender_id: { [Op.ne]: req.user.id },
              is_read: false,
            },
          }
        );
        await conversation.update({ dietitian_unread_count: 0 });
      }

      res.json({ success: true, data: messages.reverse() });
    } catch (error) {
      console.error('Error listing messages:', error);
      res.status(500).json({ success: false, error: 'Failed to list messages' });
    }
  }
);

/**
 * POST /api/messages/conversations/:id/messages — Send a message
 */
router.post('/conversations/:id/messages',
  authenticate,
  param('id').isUUID(),
  body('content').notEmpty().isLength({ max: 5000 }),
  async (req, res) => {
    try {
      const conversation = await db.Conversation.findByPk(req.params.id, {
        include: [
          { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'user_id'] },
        ],
      });
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const roleName = req.user.role?.name || req.user.role;
      if (roleName !== 'ADMIN' && conversation.dietitian_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const message = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: req.user.id,
        content: req.body.content.trim(),
      });

      // Update conversation metadata
      const preview = req.body.content.trim().substring(0, 200);
      await conversation.update({
        last_message_at: new Date(),
        last_message_preview: preview,
        patient_unread_count: conversation.patient_unread_count + 1,
      });

      // Send push notification to patient
      if (conversation.patient?.user_id) {
        try {
          const pushNotificationService = require('../services/pushNotification.service');
          const senderName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim();
          await pushNotificationService.sendNewMessageNotification(
            conversation.patient.user_id,
            senderName,
            preview
          );
        } catch (pushErr) {
          console.error('[Messages] Push notification failed:', pushErr.message);
        }
      }

      const created = await db.Message.findByPk(message.id, {
        include: [{ model: db.User, as: 'sender', attributes: ['id', 'first_name', 'last_name'] }],
      });

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  }
);

/**
 * GET /api/messages/unread-count — Get total unread count for dietitian
 */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const roleName = req.user.role?.name || req.user.role;
    const where = {};
    if (roleName !== 'ADMIN') {
      where.dietitian_id = req.user.id;
    }

    const total = await db.Conversation.sum('dietitian_unread_count', { where }) || 0;
    res.json({ success: true, data: { unread_count: total } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

module.exports = router;
