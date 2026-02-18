/**
 * Follow-up Routes
 * US-5.5.5: AI-Generated Follow-ups
 *
 * API routes for generating and sending AI follow-up emails
 */

const express = require('express');
const router = express.Router();
const followupController = require('../controllers/followupController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/followups/status
 * @desc    Check if AI service is available
 * @access  Private (any authenticated user)
 */
router.get('/status', followupController.getAIStatus);

/**
 * @route   POST /api/followups/generate/:visitId
 * @desc    Generate AI follow-up content for a visit
 * @access  Private (requires visits.read permission)
 * @body    {language, tone, includeNextSteps, includeNextAppointment}
 */
router.post(
  '/generate/:visitId',
  requirePermission('visits.read'),
  followupController.generateFollowup
);

/**
 * @route   POST /api/followups/save/:visitId
 * @desc    Save follow-up report as draft (without sending)
 * @access  Private (requires visits.update permission)
 * @body    {subject, body_html, body_text, ai_generated}
 */
router.post(
  '/save/:visitId',
  requirePermission('visits.update'),
  followupController.saveFollowup
);

/**
 * @route   POST /api/followups/send/:visitId
 * @desc    Send follow-up email to patient
 * @access  Private (requires visits.update permission)
 * @body    {subject, body_html, body_text, ai_generated}
 */
router.post(
  '/send/:visitId',
  requirePermission('visits.update'),
  followupController.sendFollowup
);

/**
 * @route   GET /api/followups/history/:visitId
 * @desc    Get follow-up email history for a visit
 * @access  Private (requires visits.read permission)
 */
router.get(
  '/history/:visitId',
  requirePermission('visits.read'),
  followupController.getFollowupHistory
);

module.exports = router;
