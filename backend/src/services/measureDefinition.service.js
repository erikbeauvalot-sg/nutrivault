/**
 * Measure Definition Service
 *
 * Handles CRUD operations for measure definitions.
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

const db = require('../../../models');
const MeasureDefinition = db.MeasureDefinition;
const auditService = require('./audit.service');
const { Op } = require('sequelize');

/**
 * Get all measure definitions
 * @param {Object} user - Authenticated user
 * @param {Object} filters - Optional filters (category, is_active)
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Array>} Array of measure definitions
 */
async function getAllDefinitions(user, filters = {}, requestMetadata = {}) {
  try {
    const where = {};

    // Apply filters
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    if (filters.measure_type) {
      where.measure_type = filters.measure_type;
    }

    const measures = await MeasureDefinition.findAll({
      where,
      order: [
        ['display_order', 'ASC'],
        ['display_name', 'ASC']
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'measure_definitions',
      resource_id: null,
      details: { filters },
      ...requestMetadata
    });

    return measures;
  } catch (error) {
    console.error('Error in getAllDefinitions:', error);
    throw error;
  }
}

/**
 * Get measure definition by ID
 * @param {string} id - Measure definition UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Measure definition
 */
async function getDefinitionById(id, user, requestMetadata = {}) {
  try {
    const measure = await MeasureDefinition.findByPk(id);

    if (!measure) {
      throw new Error('Measure definition not found');
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'measure_definition',
      resource_id: id,
      ...requestMetadata
    });

    return measure;
  } catch (error) {
    console.error('Error in getDefinitionById:', error);
    throw error;
  }
}

/**
 * Create new measure definition
 * @param {Object} data - Measure definition data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Created measure definition
 */
async function createDefinition(data, user, requestMetadata = {}) {
  try {
    // Validate required fields
    if (!data.name || !data.display_name || !data.measure_type) {
      throw new Error('Missing required fields: name, display_name, measure_type');
    }

    // Check for duplicate name
    const existing = await MeasureDefinition.findOne({
      where: { name: data.name }
    });

    if (existing) {
      throw new Error(`Measure with name '${data.name}' already exists`);
    }

    // Create measure definition
    const measure = await MeasureDefinition.create({
      name: data.name,
      display_name: data.display_name,
      description: data.description || null,
      category: data.category || 'other',
      measure_type: data.measure_type,
      unit: data.unit || null,
      min_value: data.min_value !== undefined ? data.min_value : null,
      max_value: data.max_value !== undefined ? data.max_value : null,
      decimal_places: data.decimal_places !== undefined ? data.decimal_places : 2,
      is_active: data.is_active !== undefined ? data.is_active : true,
      display_order: data.display_order !== undefined ? data.display_order : 0,
      is_system: false // User-created measures are never system measures
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'measure_definition',
      resource_id: measure.id,
      details: { measure_data: data },
      ...requestMetadata
    });

    return measure;
  } catch (error) {
    console.error('Error in createDefinition:', error);
    throw error;
  }
}

/**
 * Update measure definition
 * @param {string} id - Measure definition UUID
 * @param {Object} data - Updated data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Updated measure definition
 */
async function updateDefinition(id, data, user, requestMetadata = {}) {
  try {
    const measure = await MeasureDefinition.findByPk(id);

    if (!measure) {
      throw new Error('Measure definition not found');
    }

    // Check if trying to modify system measure critical fields
    if (measure.is_system) {
      // Allow only certain fields to be updated for system measures
      const allowedFields = ['display_name', 'description', 'is_active', 'display_order'];
      const attemptedFields = Object.keys(data);
      const disallowedFields = attemptedFields.filter(f => !allowedFields.includes(f));

      if (disallowedFields.length > 0) {
        throw new Error(`Cannot modify fields ${disallowedFields.join(', ')} for system measures`);
      }
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== measure.name) {
      const existing = await MeasureDefinition.findOne({
        where: {
          name: data.name,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        throw new Error(`Measure with name '${data.name}' already exists`);
      }
    }

    // Update measure
    const updateFields = {};
    const allowedUpdateFields = [
      'name', 'display_name', 'description', 'category', 'measure_type',
      'unit', 'min_value', 'max_value', 'decimal_places', 'is_active', 'display_order'
    ];

    allowedUpdateFields.forEach(field => {
      if (data[field] !== undefined) {
        updateFields[field] = data[field];
      }
    });

    await measure.update(updateFields);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'measure_definition',
      resource_id: id,
      details: { updated_fields: updateFields },
      ...requestMetadata
    });

    return measure;
  } catch (error) {
    console.error('Error in updateDefinition:', error);
    throw error;
  }
}

/**
 * Delete (soft delete) measure definition
 * @param {string} id - Measure definition UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<void>}
 */
async function deleteDefinition(id, user, requestMetadata = {}) {
  try {
    const measure = await MeasureDefinition.findByPk(id);

    if (!measure) {
      throw new Error('Measure definition not found');
    }

    // Prevent deletion of system measures (also enforced in model hook)
    if (measure.is_system) {
      throw new Error('Cannot delete system-defined measure');
    }

    // Soft delete
    await measure.destroy();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'measure_definition',
      resource_id: id,
      details: { measure_name: measure.name },
      ...requestMetadata
    });

    return { success: true, message: 'Measure definition deleted successfully' };
  } catch (error) {
    console.error('Error in deleteDefinition:', error);
    throw error;
  }
}

/**
 * Get measure definitions by category
 * @param {string} category - Category name
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Array>} Array of measure definitions
 */
async function getByCategory(category, user, requestMetadata = {}) {
  try {
    const measures = await MeasureDefinition.findAll({
      where: {
        category,
        is_active: true
      },
      order: [
        ['display_order', 'ASC'],
        ['display_name', 'ASC']
      ]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'measure_definitions',
      resource_id: null,
      details: { category },
      ...requestMetadata
    });

    return measures;
  } catch (error) {
    console.error('Error in getByCategory:', error);
    throw error;
  }
}

/**
 * Get all categories with measure counts
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Array>} Array of categories with counts
 */
async function getCategories(user, requestMetadata = {}) {
  try {
    const measures = await MeasureDefinition.findAll({
      where: { is_active: true },
      attributes: ['category']
    });

    // Count measures per category
    const categoryCounts = measures.reduce((acc, measure) => {
      acc[measure.category] = (acc[measure.category] || 0) + 1;
      return acc;
    }, {});

    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count
    }));

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'measure_categories',
      resource_id: null,
      ...requestMetadata
    });

    return categories;
  } catch (error) {
    console.error('Error in getCategories:', error);
    throw error;
  }
}

module.exports = {
  getAllDefinitions,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  getByCategory,
  getCategories
};
