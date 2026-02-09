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
 */
router.get('/my-dietitians', requireBookingFeature, portalController.getMyDietitians);

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

module.exports = router;
