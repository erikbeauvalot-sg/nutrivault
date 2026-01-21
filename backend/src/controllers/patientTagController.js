const patientTagService = require('../services/patientTagService');
const { body, param, validationResult } = require('express-validator');

/**
 * Patient Tag Controller
 * Handles HTTP requests for patient tagging functionality
 */

/**
 * Add a tag to a patient
 * POST /api/patients/:patientId/tags
 */
const addTag = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { patientId } = req.params;
    const { tagName } = req.body;
    const user = req.user;

    const tag = await patientTagService.addTag(patientId, tagName, user);

    res.json({
      success: true,
      data: tag,
      message: 'Tag added successfully'
    });
  } catch (error) {
    console.error('Add tag error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to add tag'
    });
  }
};

/**
 * Remove a tag from a patient
 * DELETE /api/patients/:patientId/tags/:tagName
 */
const removeTag = async (req, res) => {
  try {
    const { patientId, tagName } = req.params;
    const user = req.user;

    await patientTagService.removeTag(patientId, tagName, user);

    res.json({
      success: true,
      message: 'Tag removed successfully'
    });
  } catch (error) {
    console.error('Remove tag error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to remove tag'
    });
  }
};

/**
 * Get all tags for a patient
 * GET /api/patients/:patientId/tags
 */
const getPatientTags = async (req, res) => {
  try {
    const { patientId } = req.params;
    const user = req.user;

    const tags = await patientTagService.getPatientTags(patientId, user);

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Get patient tags error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get patient tags'
    });
  }
};

/**
 * Get all available tags (for filtering)
 * GET /api/patients/tags
 */
const getAllTags = async (req, res) => {
  try {
    const user = req.user;

    const tags = await patientTagService.getAllTags(user);

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Get all tags error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get tags'
    });
  }
};

/**
 * Update all tags for a patient (replace existing)
 * PUT /api/patients/:patientId/tags
 */
const updatePatientTags = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { patientId } = req.params;
    const { tags } = req.body;
    const user = req.user;

    const updatedTags = await patientTagService.updatePatientTags(patientId, tags, user);

    res.json({
      success: true,
      data: updatedTags,
      message: 'Tags updated successfully'
    });
  } catch (error) {
    console.error('Update patient tags error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update patient tags'
    });
  }
};

// Validation middleware
const validateAddTag = [
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  body('tagName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Tag name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Tag name can only contain letters, numbers, spaces, hyphens, and underscores')
];

const validateUpdateTags = [
  param('patientId').isUUID().withMessage('Invalid patient ID'),
  body('tags')
    .isArray({ min: 0, max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),
  body('tags.*')
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Tag names can only contain letters, numbers, spaces, hyphens, and underscores')
];

module.exports = {
  addTag,
  removeTag,
  getPatientTags,
  getAllTags,
  updatePatientTags,
  validateAddTag,
  validateUpdateTags
};