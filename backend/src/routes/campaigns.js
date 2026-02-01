/**
 * Campaign Routes
 *
 * Email marketing campaign management routes.
 * Most routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const campaignController = require('../controllers/campaignController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

/**
 * Validation middleware
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

// ============================================
// PUBLIC ROUTES (no authentication required)
// ============================================

/**
 * GET /api/campaigns/track/open/:campaignId/:patientId - Track email open
 * Public endpoint for tracking pixel
 */
router.get(
  '/track/open/:campaignId/:patientId',
  [
    param('campaignId').isUUID().withMessage('Campaign ID must be a valid UUID'),
    param('patientId').isUUID().withMessage('Patient ID must be a valid UUID'),
    validate
  ],
  campaignController.trackOpen
);

/**
 * GET /api/campaigns/track/click/:campaignId/:patientId - Track link click
 * Public endpoint for click tracking
 */
router.get(
  '/track/click/:campaignId/:patientId',
  [
    param('campaignId').isUUID().withMessage('Campaign ID must be a valid UUID'),
    param('patientId').isUUID().withMessage('Patient ID must be a valid UUID'),
    query('url').notEmpty().withMessage('URL is required'),
    validate
  ],
  campaignController.trackClick
);

/**
 * GET /api/campaigns/unsubscribe/:token - Unsubscribe page
 * Public endpoint for email unsubscription
 */
router.get(
  '/unsubscribe/:token',
  [
    param('token').notEmpty().withMessage('Token is required'),
    validate
  ],
  campaignController.unsubscribe
);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * GET /api/campaigns/segment-fields - Get available segment fields
 */
router.get(
  '/segment-fields',
  authenticate,
  requirePermission('campaigns.read'),
  campaignController.getSegmentFields
);

/**
 * POST /api/campaigns/preview-audience - Preview audience for criteria
 */
router.post(
  '/preview-audience',
  authenticate,
  requirePermission('campaigns.read'),
  campaignController.previewAudienceCriteria
);

/**
 * GET /api/campaigns - Get all campaigns
 */
router.get(
  '/',
  authenticate,
  requirePermission('campaigns.read'),
  [
    query('status').optional().isIn(['draft', 'scheduled', 'sending', 'sent', 'cancelled']),
    query('campaign_type').optional().isIn(['newsletter', 'promotional', 'educational', 'reminder']),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    validate
  ],
  campaignController.getAllCampaigns
);

/**
 * GET /api/campaigns/:id - Get campaign by ID
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('campaigns.read'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    validate
  ],
  campaignController.getCampaignById
);

/**
 * POST /api/campaigns - Create new campaign
 */
router.post(
  '/',
  authenticate,
  requirePermission('campaigns.create'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 200 })
      .withMessage('Name must be less than 200 characters'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required')
      .isLength({ max: 500 })
      .withMessage('Subject must be less than 500 characters'),
    body('body_html')
      .optional()
      .trim(),
    body('body_text')
      .optional()
      .trim(),
    body('campaign_type')
      .optional()
      .isIn(['newsletter', 'promotional', 'educational', 'reminder'])
      .withMessage('Invalid campaign type'),
    body('target_audience')
      .optional()
      .isObject()
      .withMessage('Target audience must be an object'),
    validate
  ],
  campaignController.createCampaign
);

/**
 * PUT /api/campaigns/:id - Update campaign
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('campaigns.update'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Name must be less than 200 characters'),
    body('subject')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Subject must be less than 500 characters'),
    body('body_html')
      .optional()
      .trim(),
    body('body_text')
      .optional()
      .trim(),
    body('campaign_type')
      .optional()
      .isIn(['newsletter', 'promotional', 'educational', 'reminder'])
      .withMessage('Invalid campaign type'),
    body('target_audience')
      .optional()
      .isObject()
      .withMessage('Target audience must be an object'),
    validate
  ],
  campaignController.updateCampaign
);

/**
 * DELETE /api/campaigns/:id - Delete campaign
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('campaigns.delete'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    validate
  ],
  campaignController.deleteCampaign
);

/**
 * POST /api/campaigns/:id/duplicate - Duplicate campaign
 */
router.post(
  '/:id/duplicate',
  authenticate,
  requirePermission('campaigns.create'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    validate
  ],
  campaignController.duplicateCampaign
);

/**
 * POST /api/campaigns/:id/preview-audience - Preview campaign audience
 */
router.post(
  '/:id/preview-audience',
  authenticate,
  requirePermission('campaigns.read'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    validate
  ],
  campaignController.previewCampaignAudience
);

/**
 * POST /api/campaigns/:id/send - Send campaign immediately
 */
router.post(
  '/:id/send',
  authenticate,
  requirePermission('campaigns.send'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    validate
  ],
  campaignController.sendCampaign
);

/**
 * POST /api/campaigns/:id/schedule - Schedule campaign
 */
router.post(
  '/:id/schedule',
  authenticate,
  requirePermission('campaigns.send'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    body('scheduled_at')
      .notEmpty()
      .withMessage('Scheduled time is required')
      .isISO8601()
      .withMessage('Scheduled time must be a valid date'),
    validate
  ],
  campaignController.scheduleCampaign
);

/**
 * POST /api/campaigns/:id/cancel - Cancel campaign
 */
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('campaigns.send'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    validate
  ],
  campaignController.cancelCampaign
);

/**
 * GET /api/campaigns/:id/stats - Get campaign statistics
 */
router.get(
  '/:id/stats',
  authenticate,
  requirePermission('campaigns.read'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    validate
  ],
  campaignController.getCampaignStats
);

/**
 * GET /api/campaigns/:id/recipients - Get campaign recipients
 */
router.get(
  '/:id/recipients',
  authenticate,
  requirePermission('campaigns.read'),
  [
    param('id').isUUID().withMessage('Campaign ID must be a valid UUID'),
    query('status').optional().isIn(['pending', 'sent', 'failed', 'bounced']),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    validate
  ],
  campaignController.getCampaignRecipients
);

module.exports = router;
