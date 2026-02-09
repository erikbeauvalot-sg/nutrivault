/**
 * Patient Routes
 * 
 * All routes require authentication and appropriate permissions.
 * RBAC enforced via middleware and service layer.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const patientController = require('../controllers/patientController');
const patientTagController = require('../controllers/patientTagController');
const patientCustomFieldController = require('../controllers/patientCustomFieldController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

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

/**
 * Validation middleware - check for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for creating a patient
 */
const createPatientValidation = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),

  body('assigned_dietitian_id')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('assigned_dietitian_id must be a valid UUID'),

  validate
];

/**
 * Validation rules for updating a patient
 */
const updatePatientValidation = [
  param('id')
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),
  
  body('first_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('last_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be less than 20 characters'),

  body('assigned_dietitian_id')
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage('assigned_dietitian_id must be a valid UUID'),

  validate
];

const patientIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Patient ID must be a valid UUID'),
  
  validate
];

/**
 * GET /api/patients - Get all patients
 * Requires: patients.read permission
 * ADMIN: sees all patients
 * DIETITIAN: sees only assigned patients
 * ASSISTANT: sees all patients (read-only)
 * VIEWER: sees all patients (read-only)
 */
router.get(
  '/',
  authenticate,
  requirePermission('patients.read'),
  query('search')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Search must be at least 1 character'),
  query('is_active')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string for "all"
      if (value === 'true' || value === 'false') return true;
      throw new Error('is_active must be true, false, or empty');
    }),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  patientController.getAllPatients
);

/**
 * Patient-specific Routes
 * NOTE: These specific routes MUST come before the /:id parameterized routes
 * to prevent Express from matching paths like "tags", "check-email" as patient IDs
 */

/**
 * GET /api/patients/check-email/:email - Check if email is available
 * Requires: patients.read permission
 */
router.get(
  '/check-email/:email',
  authenticate,
  requirePermission('patients.read'),
  param('email').isEmail().withMessage('Invalid email format'),
  validate,
  patientController.checkEmailAvailability
);

/**
 * GET /api/patients/tags - Get all available tags
 * Requires: patients.read permission
 */
router.get(
  '/tags',
  authenticate,
  requirePermission('patients.read'),
  patientTagController.getAllTags
);

/**
 * GET /api/patients/:patientId/tags - Get tags for a specific patient
 * Requires: patients.read permission
 */
router.get(
  '/:patientId/tags',
  authenticate,
  requirePermission('patients.read'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  validate,
  patientTagController.getPatientTags
);

/**
 * POST /api/patients/:patientId/tags - Add a tag to a patient
 * Requires: patients.update permission
 */
router.post(
  '/:patientId/tags',
  authenticate,
  requirePermission('patients.update'),
  patientTagController.validateAddTag,
  validate,
  patientTagController.addTag
);

/**
 * PUT /api/patients/:patientId/tags - Update all tags for a patient
 * Requires: patients.update permission
 */
router.put(
  '/:patientId/tags',
  authenticate,
  requirePermission('patients.update'),
  patientTagController.validateUpdateTags,
  validate,
  patientTagController.updatePatientTags
);

/**
 * DELETE /api/patients/:patientId/tags/:tagName - Remove a tag from a patient
 * Requires: patients.update permission
 */
router.delete(
  '/:patientId/tags/:tagName',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('tagName').isLength({ min: 1, max: 50 }).withMessage('Invalid tag name'),
  validate,
  patientTagController.removeTag
);

/**
 * Patient Custom Fields Routes
 */

/**
 * GET /api/patients/:patientId/custom-fields - Get all custom field values for a patient
 * Requires: patients.read permission
 */
router.get(
  '/:patientId/custom-fields',
  authenticate,
  requirePermission('patients.read'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  validate,
  patientCustomFieldController.getPatientCustomFields
);

/**
 * PUT /api/patients/:patientId/custom-fields - Update custom field values for a patient
 * Requires: patients.update permission
 */
router.put(
  '/:patientId/custom-fields',
  authenticate,
  requirePermission('patients.update'),
  patientCustomFieldController.validateUpdatePatientCustomFields,
  validate,
  patientCustomFieldController.updatePatientCustomFields
);

/**
 * DELETE /api/patients/:patientId/custom-fields/:fieldValueId - Delete a custom field value
 * Requires: patients.update permission
 */
router.delete(
  '/:patientId/custom-fields/:fieldValueId',
  authenticate,
  requirePermission('patients.update'),
  patientCustomFieldController.validateDeletePatientCustomField,
  validate,
  patientCustomFieldController.deletePatientCustomField
);

/**
 * Patient-Dietitian Link Routes (M2M)
 */

/**
 * GET /api/patients/:id/dietitians - List dietitians linked to a patient
 * Requires: patients.read permission
 */
router.get(
  '/:id/dietitians',
  authenticate,
  requirePermission('patients.read'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  validate,
  patientController.getPatientDietitians
);

/**
 * POST /api/patients/:id/dietitians - Add a dietitian link
 * Requires: patients.update permission
 */
router.post(
  '/:id/dietitians',
  authenticate,
  requirePermission('patients.update'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  body('dietitian_id').isUUID().withMessage('dietitian_id must be a valid UUID'),
  validate,
  patientController.addPatientDietitian
);

/**
 * DELETE /api/patients/:id/dietitians/:dietitianId - Remove a dietitian link
 * Requires: patients.update permission (ADMIN only enforced in controller)
 */
router.delete(
  '/:id/dietitians/:dietitianId',
  authenticate,
  requirePermission('patients.update'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  param('dietitianId').isUUID().withMessage('Dietitian ID must be a valid UUID'),
  validate,
  patientController.removePatientDietitian
);

/**
 * Patient Portal Management Routes
 */

/**
 * GET /api/patients/:id/portal/status — Get portal status for a patient
 * Requires: patients.read permission
 */
router.get(
  '/:id/portal/status',
  authenticate,
  requirePermission('patients.read'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  validate,
  patientController.getPortalStatus
);

/**
 * POST /api/patients/:id/portal/activate — Activate patient portal
 * Requires: patients.update permission
 */
router.post(
  '/:id/portal/activate',
  authenticate,
  requirePermission('patients.update'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  validate,
  patientController.activatePortal
);

/**
 * POST /api/patients/:id/portal/deactivate — Deactivate patient portal
 * Requires: patients.update permission
 */
router.post(
  '/:id/portal/deactivate',
  authenticate,
  requirePermission('patients.update'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  validate,
  patientController.deactivatePortal
);

/**
 * POST /api/patients/:id/portal/reactivate — Reactivate patient portal
 * Requires: patients.update permission
 */
router.post(
  '/:id/portal/reactivate',
  authenticate,
  requirePermission('patients.update'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  validate,
  patientController.reactivatePortal
);

/**
 * POST /api/patients/:id/portal/resend — Resend portal invitation
 * Requires: patients.update permission
 */
router.post(
  '/:id/portal/resend',
  authenticate,
  requirePermission('patients.update'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  validate,
  patientController.resendInvitation
);

/**
 * POST /api/patients/:id/portal/reset-password — Send password reset email
 * Requires: patients.update permission
 */
router.post(
  '/:id/portal/reset-password',
  authenticate,
  requirePermission('patients.update'),
  param('id').isUUID().withMessage('Patient ID must be a valid UUID'),
  validate,
  patientController.sendPortalPasswordReset
);

/**
 * Patient CRUD Routes
 * NOTE: These parameterized routes come AFTER specific routes
 */

/**
 * GET /api/patients/:id - Get patient by ID
 * Requires: patients.read permission
 * RBAC enforced in service layer (dietitian filtering)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('patients.read'),
  patientIdValidation,
  patientController.getPatientById
);

/**
 * GET /api/patients/:id/details - Get patient details with visits and measurements
 * Requires: patients.read permission
 * RBAC enforced in service layer (dietitian filtering)
 * Used for graphical patient dashboard view
 */
router.get(
  '/:id/details',
  authenticate,
  requirePermission('patients.read'),
  patientIdValidation,
  patientController.getPatientDetails
);

/**
 * POST /api/patients - Create new patient
 * Requires: patients.create permission
 * Only ADMIN and DIETITIAN can create patients
 */
router.post(
  '/',
  authenticate,
  requirePermission('patients.create'),
  createPatientValidation,
  patientController.createPatient
);

/**
 * PUT /api/patients/:id - Update patient
 * Requires: patients.update permission
 * Only ADMIN and DIETITIAN can update patients
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('patients.update'),
  updatePatientValidation,
  patientController.updatePatient
);

/**
 * DELETE /api/patients/:id - Delete patient (soft delete)
 * Requires: patients.delete permission
 * Only ADMIN and DIETITIAN can delete patients
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('patients.delete'),
  patientIdValidation,
  patientController.deletePatient
);

// =============================================
// JOURNAL ROUTES (Dietitian-facing)
// =============================================

const journalController = require('../controllers/journalController');

/**
 * GET /api/patients/:patientId/journal - View patient's journal entries
 * Requires: patients.read permission
 */
router.get(
  '/:patientId/journal',
  authenticate,
  requirePermission('patients.read'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  validate,
  journalController.getPatientJournal
);

/**
 * POST /api/patients/:patientId/journal - Create a journal entry for a patient (dietitian note)
 * Requires: patients.update permission
 */
router.post(
  '/:patientId/journal',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  body('content').notEmpty().withMessage('Content is required'),
  body('entry_type').optional().isIn(['food', 'symptom', 'mood', 'activity', 'note', 'other']),
  body('entry_date').optional().isDate(),
  validate,
  journalController.createJournalEntry
);

/**
 * PUT /api/patients/:patientId/journal/:entryId - Update own journal entry
 * Requires: patients.update permission
 */
router.put(
  '/:patientId/journal/:entryId',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  body('content').optional().notEmpty().withMessage('Content cannot be empty'),
  body('entry_type').optional().isIn(['food', 'symptom', 'mood', 'activity', 'note', 'other']),
  body('entry_date').optional().isDate(),
  validate,
  journalController.updateJournalEntry
);

/**
 * DELETE /api/patients/:patientId/journal/:entryId - Delete own journal entry
 * Requires: patients.update permission
 */
router.delete(
  '/:patientId/journal/:entryId',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  validate,
  journalController.deleteJournalEntry
);

/**
 * POST /api/patients/:patientId/journal/:entryId/comments - Add comment to journal entry
 * Requires: patients.read permission (dietitians commenting)
 */
router.post(
  '/:patientId/journal/:entryId/comments',
  authenticate,
  requirePermission('patients.read'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  body('content').notEmpty().withMessage('Content is required'),
  validate,
  journalController.addComment
);

/**
 * DELETE /api/patients/:patientId/journal/comments/:commentId - Delete own comment
 * Requires: patients.read permission
 */
router.delete(
  '/:patientId/journal/comments/:commentId',
  authenticate,
  requirePermission('patients.read'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('commentId').isUUID().withMessage('Invalid comment ID'),
  validate,
  journalController.deleteComment
);

/**
 * POST /api/patients/:patientId/journal/:entryId/photos - Upload photos to journal entry
 * Requires: patients.update permission
 */
router.post(
  '/:patientId/journal/:entryId/photos',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  journalPhotoUpload.array('photos', 5),
  journalController.uploadJournalPhotos
);

/**
 * DELETE /api/patients/:patientId/journal/:entryId/photos/:photoId - Delete a journal photo
 * Requires: patients.update permission
 */
router.delete(
  '/:patientId/journal/:entryId/photos/:photoId',
  authenticate,
  requirePermission('patients.update'),
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  param('photoId').isUUID().withMessage('Invalid photo ID'),
  validate,
  journalController.deleteJournalPhoto
);

// =============================================
// EMAIL LOG ROUTES
// =============================================

const emailLogController = require('../controllers/emailLogController');

/**
 * GET /api/patients/:patientId/email-logs - Get email logs for a patient
 * Requires: patients.read permission
 */
router.get(
  '/:patientId/email-logs',
  authenticate,
  requirePermission('patients.read'),
  emailLogController.getPatientEmailLogs
);

/**
 * GET /api/patients/:patientId/email-stats - Get email statistics for a patient
 * Requires: patients.read permission
 */
router.get(
  '/:patientId/email-stats',
  authenticate,
  requirePermission('patients.read'),
  emailLogController.getPatientEmailStats
);

module.exports = router;
