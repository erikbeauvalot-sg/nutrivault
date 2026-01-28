/**
 * Custom Field Definition Service
 *
 * Business logic for managing custom field definitions.
 * Handles CRUD operations with RBAC and audit logging.
 */

const db = require('../../../models');
const CustomFieldDefinition = db.CustomFieldDefinition;
const CustomFieldCategory = db.CustomFieldCategory;
const PatientCustomFieldValue = db.PatientCustomFieldValue;
const auditService = require('./audit.service');
const translationService = require('./customFieldTranslation.service');
const formulaEngine = require('./formulaEngine.service');
const patientCustomFieldService = require('./patientCustomField.service');
const { Op } = db.Sequelize;

/**
 * Parse JSON fields in a definition object
 * @param {Object} definition - Definition object from database
 * @returns {Object} Definition with parsed JSON fields
 */
function parseDefinitionJSON(definition) {
  const plainDef = definition.get ? definition.get({ plain: true }) : definition;

  // Parse validation_rules if it's a string
  if (typeof plainDef.validation_rules === 'string') {
    try {
      plainDef.validation_rules = JSON.parse(plainDef.validation_rules);
    } catch (e) {
      plainDef.validation_rules = null;
    }
  }

  // Parse select_options if it's a string
  if (typeof plainDef.select_options === 'string') {
    try {
      plainDef.select_options = JSON.parse(plainDef.select_options);
    } catch (e) {
      plainDef.select_options = null;
    }
  }

  // Parse dependencies if it's a string
  if (typeof plainDef.dependencies === 'string') {
    try {
      plainDef.dependencies = JSON.parse(plainDef.dependencies);
    } catch (e) {
      plainDef.dependencies = null;
    }
  }

  return plainDef;
}

/**
 * Get all active field definitions
 *
 * @param {Object} user - Authenticated user object
 * @param {string} language - Language code for translations (optional)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Field definitions
 */
async function getAllActiveDefinitions(user, language = null, requestMetadata = {}) {
  try {
    const definitions = await CustomFieldDefinition.findAll({
      where: { is_active: true },
      order: [['category_id', 'ASC'], ['display_order', 'ASC']],
      include: [
        {
          model: CustomFieldCategory,
          as: 'category',
          attributes: ['id', 'name', 'display_order']
        }
      ]
    });

    // Parse JSON fields
    let parsedDefinitions = definitions.map(parseDefinitionJSON);

    // Apply translations if language specified and not French (default)
    if (language && language !== 'fr') {
      parsedDefinitions = await Promise.all(
        parsedDefinitions.map(definition =>
          translationService.applyTranslations(definition, 'field_definition', language)
        )
      );
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'custom_field_definitions',
      resource_id: null,
      ...requestMetadata
    });

    return parsedDefinitions;
  } catch (error) {
    console.error('Error in getAllActiveDefinitions:', error);
    throw error;
  }
}

/**
 * Get definitions by category
 *
 * @param {Object} user - Authenticated user object
 * @param {string} categoryId - Category UUID
 * @param {string} language - Language code for translations (optional)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Field definitions
 */
async function getDefinitionsByCategory(user, categoryId, language = null, requestMetadata = {}) {
  try {
    const definitions = await CustomFieldDefinition.findAll({
      where: {
        category_id: categoryId,
        is_active: true
      },
      order: [['display_order', 'ASC']]
    });

    // Parse JSON fields
    let parsedDefinitions = definitions.map(parseDefinitionJSON);

    // Apply translations if language specified and not French (default)
    if (language && language !== 'fr') {
      parsedDefinitions = await Promise.all(
        parsedDefinitions.map(definition =>
          translationService.applyTranslations(definition, 'field_definition', language)
        )
      );
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'custom_field_definitions',
      resource_id: null,
      ...requestMetadata
    });

    return parsedDefinitions;
  } catch (error) {
    console.error('Error in getDefinitionsByCategory:', error);
    throw error;
  }
}

/**
 * Get definition by ID
 *
 * @param {Object} user - Authenticated user object
 * @param {string} definitionId - Definition UUID
 * @param {string} language - Language code for translations (optional)
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Field definition
 */
async function getDefinitionById(user, definitionId, language = null, requestMetadata = {}) {
  try {
    const definition = await CustomFieldDefinition.findByPk(definitionId, {
      include: [
        {
          model: CustomFieldCategory,
          as: 'category'
        }
      ]
    });

    if (!definition) {
      throw new Error('Field definition not found');
    }

    // Parse JSON fields
    let parsedDefinition = parseDefinitionJSON(definition);

    // Apply translations if language specified and not French (default)
    if (language && language !== 'fr') {
      parsedDefinition = await translationService.applyTranslations(
        parsedDefinition,
        'field_definition',
        language
      );
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'custom_field_definition',
      resource_id: definitionId,
      ...requestMetadata
    });

    return parsedDefinition;
  } catch (error) {
    console.error('Error in getDefinitionById:', error);
    throw error;
  }
}

/**
 * Create a new field definition (Admin only)
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {Object} definitionData - Definition data
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Created field definition
 */
async function createDefinition(user, definitionData, requestMetadata = {}) {
  try {
    // Validate category exists
    const category = await CustomFieldCategory.findByPk(definitionData.category_id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Validate select options if field_type is select
    if (definitionData.field_type === 'select') {
      if (!definitionData.select_options || !Array.isArray(definitionData.select_options)) {
        throw new Error('select_options must be an array for select field type');
      }
      if (definitionData.select_options.length === 0) {
        throw new Error('select_options must have at least one option');
      }
    }

    // Validate and process calculated fields
    let dependencies = null;
    let isCalculated = false;
    if (definitionData.field_type === 'calculated') {
      if (!definitionData.formula) {
        throw new Error('Formula is required for calculated field type');
      }

      // Validate formula
      const validation = formulaEngine.validateFormula(definitionData.formula);
      if (!validation.valid) {
        throw new Error(`Invalid formula: ${validation.error}`);
      }

      dependencies = validation.dependencies;
      isCalculated = true;

      // Check for circular dependencies
      const allFields = await CustomFieldDefinition.findAll({
        where: {
          is_active: true,
          category_id: definitionData.category_id
        },
        attributes: ['field_name', 'dependencies']
      });

      const fieldMap = {};
      allFields.forEach(f => {
        const deps = typeof f.dependencies === 'string' ? JSON.parse(f.dependencies) : f.dependencies;
        fieldMap[f.field_name] = { dependencies: deps || [] };
      });

      const circularCheck = formulaEngine.detectCircularDependencies(
        definitionData.field_name,
        dependencies,
        fieldMap
      );

      if (circularCheck.hasCircular) {
        throw new Error(`Circular dependency detected: ${circularCheck.cycle.join(' -> ')}`);
      }
    }

    const definition = await CustomFieldDefinition.create({
      category_id: definitionData.category_id,
      field_name: definitionData.field_name,
      field_label: definitionData.field_label,
      field_type: definitionData.field_type,
      is_required: definitionData.is_required || false,
      validation_rules: definitionData.validation_rules || null,
      select_options: definitionData.select_options || null,
      allow_multiple: definitionData.allow_multiple || false,
      help_text: definitionData.help_text || null,
      display_order: definitionData.display_order || 0,
      is_active: definitionData.is_active !== undefined ? definitionData.is_active : true,
      show_in_basic_info: definitionData.show_in_basic_info || false,
      show_in_list: definitionData.show_in_list || false,
      formula: definitionData.formula || null,
      dependencies: dependencies,
      decimal_places: definitionData.decimal_places !== undefined ? definitionData.decimal_places : 2,
      is_calculated: isCalculated,
      created_by: user.id
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'custom_field_definition',
      resource_id: definition.id,
      changes: { after: definition.toJSON() },
      ...requestMetadata
    });

    // Clear calculated fields cache
    if (isCalculated) {
      patientCustomFieldService.clearCalculatedFieldsCache();
    }

    // Parse JSON fields before returning
    return parseDefinitionJSON(definition);
  } catch (error) {
    console.error('Error in createDefinition:', error);
    throw error;
  }
}

/**
 * Update a field definition (Admin only)
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {string} definitionId - Definition UUID
 * @param {Object} updateData - Data to update
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated field definition
 */
async function updateDefinition(user, definitionId, updateData, requestMetadata = {}) {
  try {
    const definition = await CustomFieldDefinition.findByPk(definitionId);

    if (!definition) {
      throw new Error('Field definition not found');
    }

    const beforeData = definition.toJSON();

    // Validate category if being updated
    if (updateData.category_id && updateData.category_id !== definition.category_id) {
      const category = await CustomFieldCategory.findByPk(updateData.category_id);
      if (!category) {
        throw new Error('Category not found');
      }
      definition.category_id = updateData.category_id;
    }

    // Update fields
    if (updateData.field_name !== undefined) definition.field_name = updateData.field_name;
    if (updateData.field_label !== undefined) definition.field_label = updateData.field_label;
    if (updateData.field_type !== undefined) definition.field_type = updateData.field_type;
    if (updateData.is_required !== undefined) definition.is_required = updateData.is_required;
    if (updateData.validation_rules !== undefined) definition.validation_rules = updateData.validation_rules;
    if (updateData.select_options !== undefined) definition.select_options = updateData.select_options;
    if (updateData.allow_multiple !== undefined) definition.allow_multiple = updateData.allow_multiple;
    if (updateData.help_text !== undefined) definition.help_text = updateData.help_text;
    if (updateData.display_order !== undefined) definition.display_order = updateData.display_order;
    if (updateData.is_active !== undefined) definition.is_active = updateData.is_active;
    if (updateData.show_in_basic_info !== undefined) definition.show_in_basic_info = updateData.show_in_basic_info;
    if (updateData.show_in_list !== undefined) definition.show_in_list = updateData.show_in_list;
    if (updateData.formula !== undefined) definition.formula = updateData.formula;
    if (updateData.decimal_places !== undefined) definition.decimal_places = updateData.decimal_places;

    // Validate select options if field_type is select
    if (definition.field_type === 'select') {
      if (!definition.select_options || !Array.isArray(definition.select_options)) {
        throw new Error('select_options must be an array for select field type');
      }
      if (definition.select_options.length === 0) {
        throw new Error('select_options must have at least one option');
      }
    }

    // Validate and process calculated fields
    if (definition.field_type === 'calculated') {
      if (!definition.formula) {
        throw new Error('Formula is required for calculated field type');
      }

      // Validate formula
      const validation = formulaEngine.validateFormula(definition.formula);
      if (!validation.valid) {
        throw new Error(`Invalid formula: ${validation.error}`);
      }

      definition.dependencies = validation.dependencies;
      definition.is_calculated = true;

      // Check for circular dependencies
      const allFields = await CustomFieldDefinition.findAll({
        where: {
          is_active: true,
          category_id: definition.category_id,
          id: { [Op.ne]: definitionId } // Exclude current field
        },
        attributes: ['field_name', 'dependencies']
      });

      const fieldMap = {};
      allFields.forEach(f => {
        const deps = typeof f.dependencies === 'string' ? JSON.parse(f.dependencies) : f.dependencies;
        fieldMap[f.field_name] = { dependencies: deps || [] };
      });

      const circularCheck = formulaEngine.detectCircularDependencies(
        definition.field_name,
        validation.dependencies,
        fieldMap
      );

      if (circularCheck.hasCircular) {
        throw new Error(`Circular dependency detected: ${circularCheck.cycle.join(' -> ')}`);
      }
    } else {
      // Clear calculated field properties if not calculated
      definition.formula = null;
      definition.dependencies = null;
      definition.is_calculated = false;
    }

    await definition.save();

    // If formula changed for a calculated field, recalculate all existing values
    const formulaChanged = definition.is_calculated &&
                          beforeData.formula !== definition.formula;

    if (formulaChanged) {
      console.log(`[UPDATE-DEF] Formula changed for ${definition.field_name}, triggering recalculation...`);
      try {
        const recalcResult = await patientCustomFieldService.recalculateAllValuesForField(definitionId, user);
        console.log(`[UPDATE-DEF] Recalculation completed:`, recalcResult);
      } catch (recalcError) {
        console.error(`[UPDATE-DEF] Error recalculating values:`, recalcError.message);
        // Don't fail the update if recalculation fails
      }
    }

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'custom_field_definition',
      resource_id: definitionId,
      changes: { before: beforeData, after: definition.toJSON() },
      ...requestMetadata
    });

    // Clear calculated fields cache when any calculated field is updated
    if (definition.is_calculated || beforeData.is_calculated) {
      patientCustomFieldService.clearCalculatedFieldsCache();
    }

    // Parse JSON fields before returning
    return parseDefinitionJSON(definition);
  } catch (error) {
    console.error('Error in updateDefinition:', error);
    throw error;
  }
}

/**
 * Delete a field definition (Admin only)
 * Soft delete using paranoid mode
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {string} definitionId - Definition UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function deleteDefinition(user, definitionId, requestMetadata = {}) {
  try {
    const definition = await CustomFieldDefinition.findByPk(definitionId);

    if (!definition) {
      throw new Error('Field definition not found');
    }

    const beforeData = definition.toJSON();

    // Soft delete using paranoid mode
    await definition.destroy();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'custom_field_definition',
      resource_id: definitionId,
      changes: { before: beforeData },
      ...requestMetadata
    });

    // Clear calculated fields cache if this was a calculated field
    if (beforeData.is_calculated) {
      patientCustomFieldService.clearCalculatedFieldsCache();
    }

    return { message: 'Field definition deleted successfully' };
  } catch (error) {
    console.error('Error in deleteDefinition:', error);
    throw error;
  }
}

/**
 * Validate a field value against its definition
 *
 * @param {string} definitionId - Definition UUID
 * @param {any} value - Value to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateFieldValue(definitionId, value) {
  try {
    const definition = await CustomFieldDefinition.findByPk(definitionId);

    if (!definition) {
      throw new Error('Field definition not found');
    }

    return definition.validateValue(value);
  } catch (error) {
    console.error('Error in validateFieldValue:', error);
    throw error;
  }
}

/**
 * Reorder field definitions (Admin only)
 *
 * @param {Object} user - Authenticated user object (must be ADMIN)
 * @param {Array} orderData - Array of {id, display_order} objects
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function reorderFields(user, orderData, requestMetadata = {}) {
  try {
    const transaction = await db.sequelize.transaction();

    try {
      for (const item of orderData) {
        await CustomFieldDefinition.update(
          { display_order: item.display_order },
          { where: { id: item.id }, transaction }
        );
      }

      await transaction.commit();

      // Audit log
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        resource_type: 'custom_field_definitions',
        resource_id: null,
        changes: { after: { reorder: orderData } },
        ...requestMetadata
      });

      return { message: 'Field definitions reordered successfully' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error in reorderFields:', error);
    throw error;
  }
}

module.exports = {
  getAllActiveDefinitions,
  getDefinitionsByCategory,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  validateFieldValue,
  reorderFields
};
