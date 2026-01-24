/**
 * Formula Routes
 * API endpoints for formula validation and preview
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const formulaController = require('../controllers/formulaController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

/**
 * @route   POST /api/formulas/validate
 * @desc    Validate a formula syntax
 * @access  Admin only
 */
router.post(
  '/validate',
  auth,
  rbac(['ADMIN']),
  [
    body('formula')
      .notEmpty()
      .withMessage('Formula is required')
      .isString()
      .withMessage('Formula must be a string')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
  },
  formulaController.validateFormula
);

/**
 * @route   POST /api/formulas/preview
 * @desc    Evaluate a formula with sample data
 * @access  Admin only
 */
router.post(
  '/preview',
  auth,
  rbac(['ADMIN']),
  [
    body('formula')
      .notEmpty()
      .withMessage('Formula is required')
      .isString()
      .withMessage('Formula must be a string'),
    body('values')
      .notEmpty()
      .withMessage('Values are required')
      .isObject()
      .withMessage('Values must be an object'),
    body('decimalPlaces')
      .optional()
      .isInt({ min: 0, max: 4 })
      .withMessage('Decimal places must be between 0 and 4')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
  },
  formulaController.previewFormula
);

/**
 * @route   GET /api/formulas/operators
 * @desc    Get available operators and functions
 * @access  Admin only
 */
router.get(
  '/operators',
  auth,
  rbac(['ADMIN']),
  formulaController.getOperators
);

module.exports = router;
