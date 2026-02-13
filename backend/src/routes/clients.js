/**
 * Client Routes
 * All routes require authentication and appropriate permissions.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const clientController = require('../controllers/client.controller');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }
  next();
};

const clientIdValidation = [
  param('id').isUUID().withMessage('Invalid client ID format')
];

const createClientValidation = [
  body('client_type').isIn(['person', 'company']).withMessage('client_type must be person or company'),
  body('company_name').optional().trim().isLength({ max: 200 }),
  body('first_name').optional().trim().isLength({ max: 100 }),
  body('last_name').optional().trim().isLength({ max: 100 }),
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email format'),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('address_line1').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('address_line2').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('city').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('postal_code').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('country').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('siret').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('vat_number').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('contact_person').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('notes').optional({ nullable: true }).trim(),
  body('patient_id').optional({ nullable: true }).isUUID().withMessage('patient_id must be a valid UUID'),
  body('language_preference').optional().isIn(['fr', 'en']).withMessage('language must be fr or en')
];

const queryValidation = [
  query('client_type').optional().isIn(['person', 'company']).withMessage('Invalid client_type'),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
];

// GET /api/clients
router.get('/', authenticate, requirePermission('clients.read'), queryValidation, validate, clientController.getAllClients);

// GET /api/clients/search
router.get('/search', authenticate, requirePermission('clients.read'), [
  query('q').optional({ checkFalsy: true }).trim().isLength({ max: 100 })
], validate, clientController.searchClients);

// GET /api/clients/:id
router.get('/:id', authenticate, requirePermission('clients.read'), clientIdValidation, validate, clientController.getClientById);

// POST /api/clients
router.post('/', authenticate, requirePermission('clients.create'), createClientValidation, validate, clientController.createClient);

// POST /api/clients/from-patient
router.post('/from-patient', authenticate, requirePermission('clients.create'), [
  body('patient_id').isUUID().withMessage('patient_id must be a valid UUID')
], validate, clientController.createFromPatient);

// PUT /api/clients/:id
router.put('/:id', authenticate, requirePermission('clients.update'), clientIdValidation, createClientValidation, validate, clientController.updateClient);

// DELETE /api/clients/:id
router.delete('/:id', authenticate, requirePermission('clients.delete'), clientIdValidation, validate, clientController.deleteClient);

module.exports = router;
