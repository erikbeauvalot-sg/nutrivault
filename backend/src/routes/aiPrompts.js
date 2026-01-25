/**
 * AI Prompts Routes
 * API endpoints for managing AI prompts
 */

const express = require('express');
const router = express.Router();
const aiPromptController = require('../controllers/aiPromptController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// Get usage types (authenticated users)
router.get('/usage-types', aiPromptController.getUsageTypes);

// Get active prompt for a usage type (authenticated users)
router.get('/usage/:usage', aiPromptController.getActivePrompt);

// List all prompts (ADMIN only)
router.get('/', requireRole('ADMIN'), aiPromptController.getAllPrompts);

// Get prompt by ID (ADMIN only)
router.get('/:id', requireRole('ADMIN'), aiPromptController.getPromptById);

// Create new prompt (ADMIN only)
router.post('/', requireRole('ADMIN'), aiPromptController.createPrompt);

// Update prompt (ADMIN only)
router.put('/:id', requireRole('ADMIN'), aiPromptController.updatePrompt);

// Delete prompt (ADMIN only)
router.delete('/:id', requireRole('ADMIN'), aiPromptController.deletePrompt);

// Set prompt as default (ADMIN only)
router.post('/:id/set-default', requireRole('ADMIN'), aiPromptController.setAsDefault);

// Duplicate prompt (ADMIN only)
router.post('/:id/duplicate', requireRole('ADMIN'), aiPromptController.duplicatePrompt);

// Test prompt with sample data (ADMIN only)
router.post('/:id/test', requireRole('ADMIN'), aiPromptController.testPrompt);

module.exports = router;
