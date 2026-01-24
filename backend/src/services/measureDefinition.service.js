/**
 * Measure Definition Service
 *
 * Handles CRUD operations for measure definitions.
 * Sprint 3: US-5.3.1 - Define Custom Measures
 */

const db = require('../../../models');
const MeasureDefinition = db.MeasureDefinition;
const auditService = require('./audit.service');
const formulaEngine = require('./formulaEngine.service');
const measureEvaluation = require('./measureEvaluation.service');
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

    // Validate calculated measure formula
    if (data.measure_type === 'calculated') {
      if (!data.formula) {
        throw new Error('Formula is required for calculated measures');
      }

      // Validate formula syntax
      const validation = formulaEngine.validateFormula(data.formula);
      if (!validation.valid) {
        throw new Error(`Invalid formula: ${validation.error}`);
      }

      // Extract dependencies
      data.dependencies = formulaEngine.extractDependencies(data.formula);

      // Validate dependencies exist
      for (const depName of data.dependencies) {
        const dep = await MeasureDefinition.findOne({
          where: { name: depName, deleted_at: null }
        });
        if (!dep) {
          throw new Error(`Dependency not found: ${depName}`);
        }
      }

      // Check for circular dependencies
      const allMeasures = await MeasureDefinition.findAll({
        where: { measure_type: 'calculated', deleted_at: null }
      });
      const measureMap = {};
      allMeasures.forEach(m => {
        measureMap[m.name] = { dependencies: m.getDependencies() };
      });
      measureMap[data.name] = { dependencies: data.dependencies };

      const circular = formulaEngine.detectCircularDependencies(
        data.name,
        data.dependencies,
        measureMap
      );

      if (circular.hasCircular) {
        throw new Error(`Circular dependency detected: ${circular.cycle.join(' → ')}`);
      }

      // Set timestamp
      data.last_formula_change = new Date();
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
      is_system: false, // User-created measures are never system measures
      formula: data.formula || null,
      dependencies: data.dependencies || [],
      last_formula_change: data.last_formula_change || null
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

    // Validate calculated measure formula if being updated
    if (data.measure_type === 'calculated' || measure.measure_type === 'calculated') {
      if (data.formula !== undefined) {
        if (!data.formula) {
          throw new Error('Formula is required for calculated measures');
        }

        // Validate formula syntax
        const validation = formulaEngine.validateFormula(data.formula);
        if (!validation.valid) {
          throw new Error(`Invalid formula: ${validation.error}`);
        }

        // Extract dependencies
        data.dependencies = formulaEngine.extractDependencies(data.formula);

        // Validate dependencies exist
        for (const depName of data.dependencies) {
          const dep = await MeasureDefinition.findOne({
            where: { name: depName, deleted_at: null }
          });
          if (!dep) {
            throw new Error(`Dependency not found: ${depName}`);
          }
        }

        // Check for circular dependencies
        const allMeasures = await MeasureDefinition.findAll({
          where: {
            measure_type: 'calculated',
            deleted_at: null,
            id: { [Op.ne]: id } // Exclude current measure
          }
        });
        const measureMap = {};
        allMeasures.forEach(m => {
          measureMap[m.name] = { dependencies: m.getDependencies() };
        });
        measureMap[measure.name] = { dependencies: data.dependencies };

        const circular = formulaEngine.detectCircularDependencies(
          measure.name,
          data.dependencies,
          measureMap
        );

        if (circular.hasCircular) {
          throw new Error(`Circular dependency detected: ${circular.cycle.join(' → ')}`);
        }

        data.last_formula_change = new Date();
      }
    }

    // Update measure
    const updateFields = {};
    const allowedUpdateFields = [
      'name', 'display_name', 'description', 'category', 'measure_type',
      'unit', 'min_value', 'max_value', 'decimal_places', 'is_active', 'display_order',
      'formula', 'dependencies', 'last_formula_change'
    ];

    allowedUpdateFields.forEach(field => {
      if (data[field] !== undefined) {
        updateFields[field] = data[field];
      }
    });

    // Track if formula changed for recalculation
    const formulaChanged = data.formula !== undefined && data.formula !== measure.formula;

    await measure.update(updateFields);

    // Trigger bulk recalculation if formula changed
    if (formulaChanged && measure.measure_type === 'calculated') {
      try {
        console.log(`Formula changed for ${measure.name}, triggering bulk recalculation...`);
        // Run in background - don't wait for it
        measureEvaluation.recalculateAllValuesForMeasure(id, user)
          .catch(err => console.error('Error in background recalculation:', err));
      } catch (error) {
        console.error('Error triggering recalculation:', error);
        // Don't fail the update if recalculation fails
      }
    }

    // Clear cache since measure definitions changed
    measureEvaluation.clearCache();

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
