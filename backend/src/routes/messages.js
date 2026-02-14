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

    // Status filter
    if (req.query.status && ['open', 'closed'].includes(req.query.status)) {
      where.status = req.query.status;
    }

    // Search filter (patient name or title)
    if (req.query.search) {
      // handled client-side for now, but title search server-side
      const searchTerm = `%${req.query.search}%`;
      where[Op.or] = [
        { title: { [Op.like]: searchTerm } },
      ];
    }

    // Sort
    let order = [['last_message_at', 'DESC NULLS LAST']];
    if (req.query.sort === 'oldest') {
      order = [['last_message_at', 'ASC NULLS LAST']];
    } else if (req.query.sort === 'unread') {
      order = [['dietitian_unread_count', 'DESC'], ['last_message_at', 'DESC NULLS LAST']];
    }

    const includeOpts = [
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
      {
        model: db.ConversationLabel,
        as: 'labels',
      },
    ];

    // Label filter
    if (req.query.label) {
      includeOpts[2].where = { label: req.query.label };
      includeOpts[2].required = true;
    }

    const conversations = await db.Conversation.findAll({
      where,
      include: includeOpts,
      order,
    });

    // If we filtered by label with required:true, we need to re-fetch labels for those conversations
    // so the full label set is visible, not just the filtered one
    if (req.query.label && conversations.length > 0) {
      const convoIds = conversations.map(c => c.id);
      const allLabels = await db.ConversationLabel.findAll({
        where: { conversation_id: convoIds },
      });
      const labelMap = {};
      allLabels.forEach(l => {
        if (!labelMap[l.conversation_id]) labelMap[l.conversation_id] = [];
        labelMap[l.conversation_id].push(l);
      });
      const result = conversations.map(c => {
        const plain = c.toJSON();
        plain.labels = labelMap[c.id] || [];
        return plain;
      });
      return res.json({ success: true, data: result });
    }

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

      // Update conversation metadata + auto-reopen if closed
      const preview = req.body.content.trim().substring(0, 200);
      const updateData = {
        last_message_at: new Date(),
        last_message_preview: preview,
        patient_unread_count: conversation.patient_unread_count + 1,
      };
      if (conversation.status === 'closed') {
        updateData.status = 'open';
        updateData.closed_at = null;
        updateData.closed_by = null;
      }
      await conversation.update(updateData);

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
 * PUT /api/messages/conversations/:id — Update conversation (title, status)
 */
router.put('/conversations/:id',
  authenticate,
  param('id').isUUID(),
  async (req, res) => {
    try {
      const conversation = await db.Conversation.findByPk(req.params.id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const roleName = req.user.role?.name || req.user.role;
      if (roleName !== 'ADMIN' && conversation.dietitian_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const updates = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.status && ['open', 'closed'].includes(req.body.status)) {
        updates.status = req.body.status;
        if (req.body.status === 'closed') {
          updates.closed_at = new Date();
          updates.closed_by = req.user.id;
        } else {
          updates.closed_at = null;
          updates.closed_by = null;
        }
      }

      await conversation.update(updates);

      const full = await db.Conversation.findByPk(conversation.id, {
        include: [
          { model: db.Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: db.User, as: 'dietitian', attributes: ['id', 'first_name', 'last_name'] },
          { model: db.ConversationLabel, as: 'labels' },
        ],
      });

      res.json({ success: true, data: full });
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to update conversation' });
    }
  }
);

/**
 * POST /api/messages/conversations/:id/labels — Add label (max 10/conversation)
 */
router.post('/conversations/:id/labels',
  authenticate,
  param('id').isUUID(),
  body('label').notEmpty().isLength({ max: 50 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
  async (req, res) => {
    try {
      const conversation = await db.Conversation.findByPk(req.params.id);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const roleName = req.user.role?.name || req.user.role;
      if (roleName !== 'ADMIN' && conversation.dietitian_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const count = await db.ConversationLabel.count({ where: { conversation_id: conversation.id } });
      if (count >= 10) {
        return res.status(400).json({ success: false, error: 'Maximum 10 labels per conversation' });
      }

      const label = await db.ConversationLabel.create({
        conversation_id: conversation.id,
        label: req.body.label.trim(),
        color: req.body.color || null,
        created_by: req.user.id,
      });

      res.status(201).json({ success: true, data: label });
    } catch (error) {
      console.error('Error adding label:', error);
      res.status(500).json({ success: false, error: 'Failed to add label' });
    }
  }
);

/**
 * DELETE /api/messages/conversations/:id/labels/:labelId — Remove label
 */
router.delete('/conversations/:id/labels/:labelId',
  authenticate,
  param('id').isUUID(),
  param('labelId').isUUID(),
  async (req, res) => {
    try {
      const label = await db.ConversationLabel.findOne({
        where: { id: req.params.labelId, conversation_id: req.params.id },
      });
      if (!label) {
        return res.status(404).json({ success: false, error: 'Label not found' });
      }

      await label.destroy();
      res.json({ success: true, message: 'Label removed' });
    } catch (error) {
      console.error('Error removing label:', error);
      res.status(500).json({ success: false, error: 'Failed to remove label' });
    }
  }
);

/**
 * GET /api/messages/labels — Distinct labels for the current dietitian (for autocomplete)
 */
router.get('/labels', authenticate, async (req, res) => {
  try {
    const labels = await db.ConversationLabel.findAll({
      where: { created_by: req.user.id },
      attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('label')), 'label']],
      raw: true,
    });
    res.json({ success: true, data: labels.map(l => l.label) });
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch labels' });
  }
});

/**
 * PUT /api/messages/messages/:messageId — Edit a message (sender only, 24h limit)
 */
router.put('/messages/:messageId',
  authenticate,
  param('messageId').isUUID(),
  body('content').notEmpty().isLength({ max: 5000 }),
  async (req, res) => {
    try {
      const message = await db.Message.findByPk(req.params.messageId);
      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }

      // Only sender can edit
      if (message.sender_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Only the sender can edit this message' });
      }

      // 24h limit
      const hoursSinceCreation = (Date.now() - new Date(message.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        return res.status(403).json({ success: false, error: 'Messages can only be edited within 24 hours' });
      }

      // Save original content on first edit
      if (!message.original_content) {
        message.original_content = message.content;
      }

      message.content = req.body.content.trim();
      message.edited_at = new Date();
      await message.save();

      const updated = await db.Message.findByPk(message.id, {
        include: [{ model: db.User, as: 'sender', attributes: ['id', 'first_name', 'last_name'] }],
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error editing message:', error);
      res.status(500).json({ success: false, error: 'Failed to edit message' });
    }
  }
);

/**
 * DELETE /api/messages/messages/:messageId — Delete a message (sender only, soft delete)
 */
router.delete('/messages/:messageId',
  authenticate,
  param('messageId').isUUID(),
  async (req, res) => {
    try {
      const message = await db.Message.findByPk(req.params.messageId);
      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }

      // Only sender can delete
      if (message.sender_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Only the sender can delete this message' });
      }

      // Soft delete (paranoid)
      await message.destroy();

      res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ success: false, error: 'Failed to delete message' });
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

/**
 * POST /api/messages/conversations/:id/messages/from-journal — Send journal reference
 */
router.post('/conversations/:id/messages/from-journal',
  authenticate,
  param('id').isUUID(),
  body('journal_entry_id').isInt(),
  body('comment').optional().isLength({ max: 5000 }),
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

      // Verify the journal entry belongs to the patient and is not private
      const entry = await db.JournalEntry.findOne({
        where: {
          id: req.body.journal_entry_id,
          patient_id: conversation.patient_id,
        },
      });
      if (!entry) {
        return res.status(404).json({ success: false, error: 'Journal entry not found' });
      }

      const content = req.body.comment?.trim() || entry.title || entry.content?.substring(0, 200) || 'Journal entry';
      const message = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: req.user.id,
        content,
        message_type: 'journal_ref',
        metadata: {
          journal_entry_id: entry.id,
          title: entry.title || null,
          entry_type: entry.entry_type,
          entry_date: entry.entry_date,
        },
      });

      // Update conversation
      const preview = content.substring(0, 200);
      const updateData = {
        last_message_at: new Date(),
        last_message_preview: `📓 ${preview}`,
        patient_unread_count: conversation.patient_unread_count + 1,
      };
      if (conversation.status === 'closed') {
        updateData.status = 'open';
        updateData.closed_at = null;
        updateData.closed_by = null;
      }
      await conversation.update(updateData);

      // Push notification
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
      console.error('Error sending journal ref:', error);
      res.status(500).json({ success: false, error: 'Failed to send journal reference' });
    }
  }
);

/**
 * POST /api/messages/conversations/:id/messages/from-objective — Send objective reference
 */
router.post('/conversations/:id/messages/from-objective',
  authenticate,
  param('id').isUUID(),
  body('objective_number').isInt({ min: 1, max: 3 }),
  body('comment').optional().isLength({ max: 5000 }),
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

      const objective = await db.PatientObjective.findOne({
        where: {
          patient_id: conversation.patient_id,
          objective_number: req.body.objective_number,
        },
      });

      const objContent = objective?.content || `Objectif #${req.body.objective_number}`;
      const content = req.body.comment?.trim() || objContent;

      const message = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: req.user.id,
        content,
        message_type: 'objective_ref',
        metadata: {
          objective_number: req.body.objective_number,
          objective_title: objContent,
        },
      });

      const preview = content.substring(0, 200);
      const updateData = {
        last_message_at: new Date(),
        last_message_preview: `🎯 ${preview}`,
        patient_unread_count: conversation.patient_unread_count + 1,
      };
      if (conversation.status === 'closed') {
        updateData.status = 'open';
        updateData.closed_at = null;
        updateData.closed_by = null;
      }
      await conversation.update(updateData);

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
      console.error('Error sending objective ref:', error);
      res.status(500).json({ success: false, error: 'Failed to send objective reference' });
    }
  }
);

module.exports = router;
