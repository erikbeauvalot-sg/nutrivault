/**
 * Patient Portal Routes
 * Public: set-password
 * Protected: all other routes (auth + PATIENT role + portalScope)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const portalController = require('../controllers/portalController');
const authenticate = require('../middleware/authenticate');
const { resolvePatient } = require('../middleware/portalScope');
const db = require('../../../models');

// Multer config for journal photo uploads (images only, max 10MB per file)
const journalPhotoUpload = multer({
  dest: path.join(__dirname, '../../temp_uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
  }
});

// Rate limiter for set-password endpoint
const setPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: 'Too many attempts. Please try again later.' }
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * POST /api/portal/set-password — Set password from invitation token
 */
router.post(
  '/set-password',
  setPasswordLimiter,
  body('token').notEmpty().withMessage('Token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  portalController.setPassword
);

// ==========================================
// PROTECTED ROUTES (auth + PATIENT + portalScope)
// ==========================================

// Apply auth and portal scope to all routes below
router.use(authenticate);
router.use(resolvePatient());

/**
 * GET /api/portal/features — Feature flags for the portal UI
 */
router.get('/features', portalController.getFeatures);

/**
 * GET /api/portal/me — Get patient profile
 */
router.get('/me', portalController.getProfile);

/**
 * PUT /api/portal/me — Update profile (phone, language)
 */
router.put('/me',
  body('phone').optional().isLength({ max: 20 }),
  body('language_preference').optional().isIn(['fr', 'en', 'es', 'nl', 'de']),
  portalController.updateProfile
);

/**
 * PUT /api/portal/password — Change password
 */
router.put('/password',
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  portalController.changePassword
);

/**
 * GET /api/portal/measures — Get patient measures
 */
router.get('/measures',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('measure_definition_id').optional().isUUID(),
  portalController.getMeasures
);

/**
 * POST /api/portal/measures — Log a measure (patient self-logging)
 */
router.post('/measures',
  body('measure_definition_id').isUUID().withMessage('Valid measure definition ID is required'),
  body('value').notEmpty().withMessage('Value is required'),
  body('measured_at').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be 500 characters or less'),
  portalController.logMeasure
);

/**
 * GET /api/portal/visits — Get visit history
 */
router.get('/visits', portalController.getVisits);

// ==========================================
// PATIENT BOOKING ROUTES (feature-flagged)
// ==========================================

/** Middleware: require FEATURE_PATIENT_BOOKING=true */
const requireBookingFeature = (req, res, next) => {
  if (process.env.FEATURE_PATIENT_BOOKING !== 'true') {
    return res.status(403).json({ success: false, error: 'Patient booking is not enabled' });
  }
  next();
};

/**
 * GET /api/portal/visit-types — Get active visit types for booking
 */
router.get('/visit-types', requireBookingFeature, portalController.getVisitTypes);

/**
 * GET /api/portal/my-dietitians — Get dietitians linked to this patient
 * (No feature flag — needed for messaging and booking)
 */
router.get('/my-dietitians', portalController.getMyDietitians);

/**
 * POST /api/portal/visits — Request a visit appointment
 */
router.post('/visits',
  requireBookingFeature,
  body('dietitian_id').isUUID().withMessage('Dietitian ID is required'),
  body('visit_date').isISO8601().withMessage('Valid date is required'),
  body('visit_type').optional().isString().isLength({ max: 50 }),
  body('request_message').optional().isString().isLength({ max: 1000 }),
  body('duration_minutes').optional().isInt({ min: 1, max: 480 }),
  portalController.createVisitRequest
);

/**
 * PUT /api/portal/visits/:id/cancel — Cancel a visit
 */
router.put('/visits/:id/cancel',
  requireBookingFeature,
  param('id').isUUID(),
  portalController.cancelVisit
);

/**
 * GET /api/portal/documents — Get shared documents
 */
router.get('/documents', portalController.getDocuments);

/**
 * GET /api/portal/documents/:id/download — Download a document
 */
router.get('/documents/:id/download',
  param('id').isUUID(),
  portalController.downloadDocument
);

/**
 * GET /api/portal/recipes — Get shared recipes
 */
router.get('/recipes', portalController.getRecipes);

/**
 * GET /api/portal/recipes/:id — Get recipe detail
 */
router.get('/recipes/:id',
  param('id').isUUID(),
  portalController.getRecipeDetail
);

// ==========================================
// OBJECTIVES ROUTES
// ==========================================

/**
 * GET /api/portal/objectives — Get patient's objectives
 */
router.get('/objectives', portalController.getObjectives);

// ==========================================
// RADAR CHART (WIND ROSE) ROUTES
// ==========================================

/**
 * GET /api/portal/radar — Get radar chart data for patient
 */
router.get('/radar', portalController.getRadarData);

// ==========================================
// INVOICE ROUTES
// ==========================================

/**
 * GET /api/portal/invoices — List patient invoices
 */
router.get('/invoices', portalController.getInvoices);

/**
 * GET /api/portal/invoices/:id/pdf — Download invoice PDF
 */
router.get('/invoices/:id/pdf',
  param('id').isUUID(),
  portalController.downloadInvoicePDF
);

// ==========================================
// JOURNAL ROUTES
// ==========================================

/**
 * GET /api/portal/journal — List journal entries
 */
router.get('/journal',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('entry_type').optional().isIn(['food', 'symptom', 'mood', 'activity', 'note', 'other']),
  query('mood').optional().isIn(['very_bad', 'bad', 'neutral', 'good', 'very_good']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  portalController.getJournalEntries
);

/**
 * POST /api/portal/journal — Create journal entry
 */
router.post('/journal',
  body('content').notEmpty().withMessage('Content is required'),
  body('entry_date').optional().isISO8601(),
  body('entry_type').optional().isIn(['food', 'symptom', 'mood', 'activity', 'note', 'other']),
  body('mood').optional({ nullable: true }).isIn(['very_bad', 'bad', 'neutral', 'good', 'very_good']),
  body('energy_level').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  body('is_private').optional().isBoolean(),
  portalController.createJournalEntry
);

/**
 * PUT /api/portal/journal/:id — Update journal entry
 */
router.put('/journal/:id',
  param('id').isUUID(),
  body('content').optional().notEmpty(),
  body('entry_date').optional().isISO8601(),
  body('entry_type').optional().isIn(['food', 'symptom', 'mood', 'activity', 'note', 'other']),
  body('mood').optional({ nullable: true }).isIn(['very_bad', 'bad', 'neutral', 'good', 'very_good']),
  body('energy_level').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  body('is_private').optional().isBoolean(),
  portalController.updateJournalEntry
);

/**
 * DELETE /api/portal/journal/:id — Delete journal entry
 */
router.delete('/journal/:id',
  param('id').isUUID(),
  portalController.deleteJournalEntry
);

/**
 * POST /api/portal/journal/:id/comments — Add comment to a journal entry
 */
router.post('/journal/:id/comments',
  param('id').isUUID(),
  body('content').notEmpty().withMessage('Content is required'),
  portalController.addJournalComment
);

/**
 * POST /api/portal/journal/:id/photos — Upload photos to journal entry (max 5)
 */
router.post('/journal/:id/photos',
  param('id').isUUID(),
  journalPhotoUpload.array('photos', 5),
  portalController.uploadJournalPhotos
);

/**
 * DELETE /api/portal/journal/:id/photos/:photoId — Delete a journal photo
 */
router.delete('/journal/:id/photos/:photoId',
  param('id').isUUID(),
  param('photoId').isUUID(),
  portalController.deleteJournalPhoto
);

/**
 * PUT /api/portal/theme — Change theme
 */
router.put('/theme',
  body('theme_id').optional({ nullable: true }).isUUID(),
  portalController.updateTheme
);

// ==========================================
// MESSAGING ROUTES (Patient side)
// ==========================================

/**
 * POST /api/portal/messages/conversations — Patient creates a conversation with a linked dietitian
 */
router.post('/messages/conversations',
  body('dietitian_id').isUUID(),
  async (req, res) => {
    try {
      const { dietitian_id } = req.body;

      // Verify the dietitian is linked to this patient
      const link = await db.PatientDietitian.findOne({
        where: { patient_id: req.patient.id, dietitian_id }
      });
      if (!link) {
        return res.status(403).json({ success: false, error: 'This dietitian is not linked to your account' });
      }

      const [conversation, created] = await db.Conversation.findOrCreate({
        where: { patient_id: req.patient.id, dietitian_id },
        defaults: {},
      });

      const full = await db.Conversation.findByPk(conversation.id, {
        include: [
          { model: db.User, as: 'dietitian', attributes: ['id', 'first_name', 'last_name'] },
        ],
      });

      res.status(created ? 201 : 200).json({ success: true, data: full });
    } catch (error) {
      console.error('Error creating patient conversation:', error);
      res.status(500).json({ success: false, error: 'Failed to create conversation' });
    }
  }
);

/**
 * GET /api/portal/messages/conversations — List patient's conversations
 */
router.get('/messages/conversations', async (req, res) => {
  try {
    const conversations = await db.Conversation.findAll({
      where: { patient_id: req.patient.id },
      include: [
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
    console.error('Error listing patient conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
});

/**
 * GET /api/portal/messages/conversations/:id/messages — Get messages
 */
router.get('/messages/conversations/:id/messages',
  param('id').isUUID(),
  async (req, res) => {
    try {
      const conversation = await db.Conversation.findOne({
        where: { id: req.params.id, patient_id: req.patient.id },
      });
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const where = { conversation_id: conversation.id };
      if (req.query.before) {
        where.created_at = { [db.Sequelize.Op.lt]: req.query.before };
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

      // Mark unread messages as read (for patient)
      if (conversation.patient_unread_count > 0) {
        await db.Message.update(
          { is_read: true, read_at: new Date() },
          {
            where: {
              conversation_id: conversation.id,
              sender_id: { [db.Sequelize.Op.ne]: req.user.id },
              is_read: false,
            },
          }
        );
        await conversation.update({ patient_unread_count: 0 });
      }

      res.json({ success: true, data: messages.reverse() });
    } catch (error) {
      console.error('Error listing patient messages:', error);
      res.status(500).json({ success: false, error: 'Failed to list messages' });
    }
  }
);

/**
 * POST /api/portal/messages/conversations/:id/messages — Send a message (patient)
 */
router.post('/messages/conversations/:id/messages',
  param('id').isUUID(),
  body('content').notEmpty().isLength({ max: 5000 }),
  async (req, res) => {
    try {
      const conversation = await db.Conversation.findOne({
        where: { id: req.params.id, patient_id: req.patient.id },
        include: [
          { model: db.User, as: 'dietitian', attributes: ['id', 'first_name', 'last_name'] },
        ],
      });
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const message = await db.Message.create({
        conversation_id: conversation.id,
        sender_id: req.user.id,
        content: req.body.content.trim(),
      });

      const preview = req.body.content.trim().substring(0, 200);
      await conversation.update({
        last_message_at: new Date(),
        last_message_preview: preview,
        dietitian_unread_count: conversation.dietitian_unread_count + 1,
      });

      // Send push notification to dietitian
      try {
        const pushNotificationService = require('../services/pushNotification.service');
        const patient = req.patient;
        const senderName = `${patient.first_name} ${patient.last_name}`;
        await pushNotificationService.sendNewMessageNotification(
          conversation.dietitian_id,
          senderName,
          preview
        );
      } catch (pushErr) {
        console.error('[PortalMessages] Push notification failed:', pushErr.message);
      }

      const created = await db.Message.findByPk(message.id, {
        include: [{ model: db.User, as: 'sender', attributes: ['id', 'first_name', 'last_name'] }],
      });

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Error sending patient message:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  }
);

/**
 * GET /api/portal/messages/unread-count — Get total unread count for patient
 */
router.get('/messages/unread-count', async (req, res) => {
  try {
    const total = await db.Conversation.sum('patient_unread_count', {
      where: { patient_id: req.patient.id },
    }) || 0;
    res.json({ success: true, data: { unread_count: total } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

module.exports = router;
