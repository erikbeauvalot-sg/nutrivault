/**
 * Invoice Customization Service
 * Handles CRUD operations for user invoice template customizations
 */

const db = require('../../../models');
const { InvoiceCustomization, User } = db;
const fs = require('fs').promises;
const path = require('path');

/**
 * Get customization for a user (create default if doesn't exist)
 */
const getUserCustomization = async (userId) => {
  try {
    let customization = await InvoiceCustomization.findOne({
      where: { user_id: userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }]
    });

    // Create default if doesn't exist
    if (!customization) {
      customization = await InvoiceCustomization.create({
        user_id: userId,
        // Use defaults from model
      });

      // Fetch with associations
      customization = await InvoiceCustomization.findByPk(customization.id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }]
      });
    }

    return customization;
  } catch (error) {
    console.error('Error getting user customization:', error);
    throw new Error(`Failed to get customization: ${error.message}`);
  }
};

/**
 * Update customization settings
 */
const updateCustomization = async (userId, data) => {
  try {
    const customization = await getUserCustomization(userId);

    // Update fields
    const allowedFields = [
      'logo_width', 'logo_height',
      'primary_color', 'secondary_color', 'accent_color',
      'business_name', 'address_line1', 'address_line2',
      'city', 'postal_code', 'country', 'phone', 'email', 'website', 'misc_info',
      'footer_text', 'signature_name', 'signature_title',
      'show_logo', 'show_contact_info', 'show_footer',
      'invoice_notes', 'is_active'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        customization[field] = data[field];
      }
    });

    await customization.save();

    // Reload with associations
    await customization.reload({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }]
    });

    return customization;
  } catch (error) {
    console.error('Error updating customization:', error);
    throw new Error(`Failed to update customization: ${error.message}`);
  }
};

/**
 * Upload logo file
 */
const uploadLogo = async (userId, file) => {
  try {
    const customization = await getUserCustomization(userId);

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../../../uploads/invoice-customizations', userId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Delete old logo if exists
    if (customization.logo_file_path) {
      const oldPath = path.join(__dirname, '../../..', customization.logo_file_path);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        // File doesn't exist, ignore
      }
    }

    // Determine extension
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `logo${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Move file to upload directory
    await fs.writeFile(filepath, file.buffer);

    // Update database
    customization.logo_file_path = `/uploads/invoice-customizations/${userId}/${filename}`;
    await customization.save();

    return customization;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw new Error(`Failed to upload logo: ${error.message}`);
  }
};

/**
 * Delete logo file
 */
const deleteLogo = async (userId) => {
  try {
    const customization = await getUserCustomization(userId);

    if (customization.logo_file_path) {
      // Delete file
      const filepath = path.join(__dirname, '../../..', customization.logo_file_path);
      try {
        await fs.unlink(filepath);
      } catch (err) {
        // File doesn't exist, ignore
      }

      // Update database
      customization.logo_file_path = null;
      customization.show_logo = false;
      await customization.save();
    }

    return customization;
  } catch (error) {
    console.error('Error deleting logo:', error);
    throw new Error(`Failed to delete logo: ${error.message}`);
  }
};

/**
 * Upload signature file
 */
const uploadSignature = async (userId, file) => {
  try {
    const customization = await getUserCustomization(userId);

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../../../uploads/invoice-customizations', userId);
    await fs.mkdir(uploadDir, { recursive: true });

    // Delete old signature if exists
    if (customization.signature_file_path) {
      const oldPath = path.join(__dirname, '../../..', customization.signature_file_path);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        // File doesn't exist, ignore
      }
    }

    // Determine extension
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `signature${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Move file to upload directory
    await fs.writeFile(filepath, file.buffer);

    // Update database
    customization.signature_file_path = `/uploads/invoice-customizations/${userId}/${filename}`;
    await customization.save();

    return customization;
  } catch (error) {
    console.error('Error uploading signature:', error);
    throw new Error(`Failed to upload signature: ${error.message}`);
  }
};

/**
 * Delete signature file
 */
const deleteSignature = async (userId) => {
  try {
    const customization = await getUserCustomization(userId);

    if (customization.signature_file_path) {
      // Delete file
      const filepath = path.join(__dirname, '../../..', customization.signature_file_path);
      try {
        await fs.unlink(filepath);
      } catch (err) {
        // File doesn't exist, ignore
      }

      // Update database
      customization.signature_file_path = null;
      await customization.save();
    }

    return customization;
  } catch (error) {
    console.error('Error deleting signature:', error);
    throw new Error(`Failed to delete signature: ${error.message}`);
  }
};

/**
 * Reset customization to defaults
 */
const resetToDefaults = async (userId) => {
  try {
    const customization = await getUserCustomization(userId);

    // Delete logo and signature files
    await deleteLogo(userId);
    await deleteSignature(userId);

    // Reset to defaults
    customization.logo_width = 150;
    customization.logo_height = 80;
    customization.primary_color = '#3498db';
    customization.secondary_color = '#2c3e50';
    customization.accent_color = '#e74c3c';
    customization.business_name = null;
    customization.address_line1 = null;
    customization.address_line2 = null;
    customization.city = null;
    customization.postal_code = null;
    customization.country = 'France';
    customization.phone = null;
    customization.email = null;
    customization.website = null;
    customization.misc_info = null;
    customization.footer_text = null;
    customization.signature_name = null;
    customization.signature_title = null;
    customization.show_logo = true;
    customization.show_contact_info = true;
    customization.show_footer = true;
    customization.invoice_notes = null;

    await customization.save();

    return customization;
  } catch (error) {
    console.error('Error resetting customization:', error);
    throw new Error(`Failed to reset customization: ${error.message}`);
  }
};

/**
 * Get customization for invoice PDF generation
 */
const getCustomizationForInvoice = async (userId) => {
  try {
    const customization = await getUserCustomization(userId);
    return customization.toJSON();
  } catch (error) {
    console.error('Error getting customization for invoice:', error);
    throw new Error(`Failed to get customization: ${error.message}`);
  }
};

module.exports = {
  getUserCustomization,
  updateCustomization,
  uploadLogo,
  deleteLogo,
  uploadSignature,
  deleteSignature,
  resetToDefaults,
  getCustomizationForInvoice
};
