const db = require('../../../models');
const { Op } = require('sequelize');

/**
 * Patient Tag Service
 * Handles patient tagging functionality for segmentation
 */

class PatientTagService {
  /**
   * Add a tag to a patient
   * @param {string} patientId - Patient UUID
   * @param {string} tagName - Tag name
   * @param {Object} user - Current user for audit logging
   * @returns {Promise<Object>} Created tag
   */
  async addTag(patientId, tagName, user) {
    // Verify patient exists and user has access
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user can access this patient
    if (user.role.name !== 'ADMIN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied to patient');
      error.statusCode = 403;
      throw error;
    }

    // Check if tag already exists for this patient
    const existingTag = await db.PatientTag.findOne({
      where: {
        patient_id: patientId,
        tag_name: tagName.toLowerCase().trim()
      }
    });

    if (existingTag) {
      const error = new Error('Tag already exists for this patient');
      error.statusCode = 409;
      throw error;
    }

    // Create the tag
    const tag = await db.PatientTag.create({
      patient_id: patientId,
      tag_name: tagName.toLowerCase().trim()
    });

    // Audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'CREATE',
      resource_type: 'PATIENT_TAG',
      resource_id: tag.id,
      details: `Added tag "${tagName}" to patient ${patient.first_name} ${patient.last_name}`,
      ip_address: null,
      user_agent: null
    });

    return tag;
  }

  /**
   * Remove a tag from a patient
   * @param {string} patientId - Patient UUID
   * @param {string} tagName - Tag name to remove
   * @param {Object} user - Current user for audit logging
   * @returns {Promise<boolean>} Success status
   */
  async removeTag(patientId, tagName, user) {
    // Verify patient exists and user has access
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user can access this patient
    if (user.role.name !== 'ADMIN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied to patient');
      error.statusCode = 403;
      throw error;
    }

    // Find and delete the tag
    const tag = await db.PatientTag.findOne({
      where: {
        patient_id: patientId,
        tag_name: tagName.toLowerCase().trim()
      }
    });

    if (!tag) {
      const error = new Error('Tag not found for this patient');
      error.statusCode = 404;
      throw error;
    }

    await tag.destroy();

    // Audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'DELETE',
      resource_type: 'PATIENT_TAG',
      resource_id: tag.id,
      details: `Removed tag "${tagName}" from patient ${patient.first_name} ${patient.last_name}`,
      ip_address: null,
      user_agent: null
    });

    return true;
  }

  /**
   * Get all tags for a patient
   * @param {string} patientId - Patient UUID
   * @param {Object} user - Current user
   * @returns {Promise<Array>} Array of tag names
   */
  async getPatientTags(patientId, user) {
    // Verify patient exists and user has access
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user can access this patient
    if (user.role.name !== 'ADMIN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied to patient');
      error.statusCode = 403;
      throw error;
    }

    const tags = await db.PatientTag.findAll({
      where: { patient_id: patientId },
      attributes: ['tag_name'],
      order: [['tag_name', 'ASC']]
    });

    return tags.map(tag => tag.tag_name);
  }

  /**
   * Get all available tags (for filtering)
   * @param {Object} user - Current user
   * @returns {Promise<Array>} Array of unique tag names
   */
  async getAllTags(user) {
    // Only show tags for patients the user can access
    let whereCondition = {};

    if (user.role.name !== 'ADMIN') {
      // For non-admin users, only show tags from their assigned patients
      const patientIds = await db.Patient.findAll({
        where: {
          assigned_dietitian_id: user.id,
          is_active: true
        },
        attributes: ['id']
      });

      const ids = patientIds.map(p => p.id);
      whereCondition.patient_id = { [Op.in]: ids };
    }

    const tags = await db.PatientTag.findAll({
      where: whereCondition,
      attributes: [
        [db.sequelize.fn('DISTINCT', db.sequelize.col('tag_name')), 'tag_name']
      ],
      order: [['tag_name', 'ASC']]
    });

    return tags.map(tag => tag.tag_name);
  }

  /**
   * Update patient tags (replace all tags)
   * @param {string} patientId - Patient UUID
   * @param {Array<string>} tagNames - Array of tag names
   * @param {Object} user - Current user
   * @returns {Promise<Array>} Updated tags
   */
  async updatePatientTags(patientId, tagNames, user) {
    // Verify patient exists and user has access
    const patient = await db.Patient.findByPk(patientId);
    if (!patient) {
      const error = new Error('Patient not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user can access this patient
    if (user.role.name !== 'ADMIN' && patient.assigned_dietitian_id !== user.id) {
      const error = new Error('Access denied to patient');
      error.statusCode = 403;
      throw error;
    }

    // Normalize tag names
    const normalizedTags = [...new Set(tagNames.map(tag => tag.toLowerCase().trim()))]
      .filter(tag => tag.length > 0);

    // Remove existing tags
    await db.PatientTag.destroy({
      where: { patient_id: patientId }
    });

    // Add new tags
    const tagRecords = normalizedTags.map(tagName => ({
      patient_id: patientId,
      tag_name: tagName
    }));

    if (tagRecords.length > 0) {
      await db.PatientTag.bulkCreate(tagRecords);
    }

    // Audit log
    await db.AuditLog.create({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'PATIENT',
      resource_id: patientId,
      details: `Updated tags for patient ${patient.first_name} ${patient.last_name}: [${normalizedTags.join(', ')}]`,
      ip_address: null,
      user_agent: null
    });

    return normalizedTags;
  }
}

module.exports = new PatientTagService();