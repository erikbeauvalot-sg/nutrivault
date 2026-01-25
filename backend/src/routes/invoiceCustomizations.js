/**
 * Invoice Customization Routes
 * API routes for managing user invoice template customizations
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const invoiceCustomizationController = require('../controllers/invoiceCustomizationController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/rbac');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG and JPG are allowed.'));
    }
  }
});

// All routes require authentication and billing.update permission
router.use(authenticate);
router.use(requirePermission('billing.update'));

/**
 * GET /api/invoice-customizations/me
 * Get current user's customization settings
 */
router.get('/me', invoiceCustomizationController.getMyCustomization);

/**
 * PUT /api/invoice-customizations/me
 * Update current user's customization settings
 */
router.put('/me', invoiceCustomizationController.updateMyCustomization);

/**
 * POST /api/invoice-customizations/me/logo
 * Upload logo image
 */
router.post(
  '/me/logo',
  upload.single('logo'),
  invoiceCustomizationController.uploadLogo
);

/**
 * DELETE /api/invoice-customizations/me/logo
 * Delete logo image
 */
router.delete('/me/logo', invoiceCustomizationController.deleteLogo);

/**
 * POST /api/invoice-customizations/me/signature
 * Upload signature image
 */
router.post(
  '/me/signature',
  upload.single('signature'),
  invoiceCustomizationController.uploadSignature
);

/**
 * DELETE /api/invoice-customizations/me/signature
 * Delete signature image
 */
router.delete('/me/signature', invoiceCustomizationController.deleteSignature);

/**
 * POST /api/invoice-customizations/me/reset
 * Reset to default settings
 */
router.post('/me/reset', invoiceCustomizationController.resetToDefaults);

module.exports = router;
