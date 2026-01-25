/**
 * Invoice Customization Controller
 * Handles HTTP requests for invoice template customization
 */

const invoiceCustomizationService = require('../services/invoiceCustomization.service');

/**
 * GET /api/invoice-customizations/me
 * Get current user's customization settings
 */
const getMyCustomization = async (req, res) => {
  try {
    const userId = req.user.id;
    const customization = await invoiceCustomizationService.getUserCustomization(userId);

    res.json({
      success: true,
      data: customization
    });
  } catch (error) {
    console.error('Error in getMyCustomization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get customization'
    });
  }
};

/**
 * PUT /api/invoice-customizations/me
 * Update current user's customization settings
 */
const updateMyCustomization = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const customization = await invoiceCustomizationService.updateCustomization(userId, data);

    res.json({
      success: true,
      data: customization,
      message: 'Customization updated successfully'
    });
  } catch (error) {
    console.error('Error in updateMyCustomization:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update customization'
    });
  }
};

/**
 * POST /api/invoice-customizations/me/logo
 * Upload logo image
 */
const uploadLogo = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No logo file provided'
      });
    }

    // Validate file type
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only PNG and JPG are allowed.'
      });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      });
    }

    const customization = await invoiceCustomizationService.uploadLogo(userId, file);

    res.json({
      success: true,
      data: customization,
      message: 'Logo uploaded successfully'
    });
  } catch (error) {
    console.error('Error in uploadLogo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload logo'
    });
  }
};

/**
 * DELETE /api/invoice-customizations/me/logo
 * Delete logo image
 */
const deleteLogo = async (req, res) => {
  try {
    const userId = req.user.id;
    const customization = await invoiceCustomizationService.deleteLogo(userId);

    res.json({
      success: true,
      data: customization,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteLogo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete logo'
    });
  }
};

/**
 * POST /api/invoice-customizations/me/signature
 * Upload signature image
 */
const uploadSignature = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No signature file provided'
      });
    }

    // Validate file type
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only PNG and JPG are allowed.'
      });
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 2MB.'
      });
    }

    const customization = await invoiceCustomizationService.uploadSignature(userId, file);

    res.json({
      success: true,
      data: customization,
      message: 'Signature uploaded successfully'
    });
  } catch (error) {
    console.error('Error in uploadSignature:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload signature'
    });
  }
};

/**
 * DELETE /api/invoice-customizations/me/signature
 * Delete signature image
 */
const deleteSignature = async (req, res) => {
  try {
    const userId = req.user.id;
    const customization = await invoiceCustomizationService.deleteSignature(userId);

    res.json({
      success: true,
      data: customization,
      message: 'Signature deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteSignature:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete signature'
    });
  }
};

/**
 * POST /api/invoice-customizations/me/reset
 * Reset to default settings
 */
const resetToDefaults = async (req, res) => {
  try {
    const userId = req.user.id;
    const customization = await invoiceCustomizationService.resetToDefaults(userId);

    res.json({
      success: true,
      data: customization,
      message: 'Customization reset to defaults'
    });
  } catch (error) {
    console.error('Error in resetToDefaults:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset customization'
    });
  }
};

module.exports = {
  getMyCustomization,
  updateMyCustomization,
  uploadLogo,
  deleteLogo,
  uploadSignature,
  deleteSignature,
  resetToDefaults
};
