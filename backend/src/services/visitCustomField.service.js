/**
 * Visit Custom Field Service
 *
 * Business logic for managing visit custom field values.
 * Handles CRUD operations with RBAC and audit logging.
 * Follows visit access control: ADMIN sees all, DIETITIAN sees visits for assigned patients only.
 */

const db = require('../../../models');
const VisitCustomFieldValue = db.VisitCustomFieldValue;
const PatientCustomFieldValue = db.PatientCustomFieldValue;
const CustomFieldDefinition = db.CustomFieldDefinition;
const CustomFieldCategory = db.CustomFieldCategory;
const Visit = db.Visit;
const Patient = db.Patient;
const auditService = require('./audit.service');
const translationService = require('./customFieldTranslation.service');
const formulaEngine = require('./formulaEngine.service');
const { Op } = db.Sequelize;
const { canAccessVisit } = require('../helpers/scopeHelper');

/**
 * Check if a category's data should be stored at patient level (shared)
 * Categories with entity_types including 'patient' store data at patient level
 * Categories with ONLY 'visit' store data at visit level
 */
function isPatientLevelCategory(category) {
  const entityTypes = category.entity_types || ['patient'];
  return entityTypes.includes('patient');
}

/**
 * Check if user has access to visit
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @returns {Promise<boolean>} True if user has access
 */
async function checkVisitAccess(user, visitId) {
  const visit = await Visit.findByPk(visitId, {
    include: [{
      model: Patient,
      as: 'patient'
    }]
  });
  if (!visit) return false;
  return canAccessVisit(user, visit);
}

/**
 * Get all custom field values for a visit
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Custom field values grouped by category
 */
async function getVisitCustomFields(user, visitId, language = 'fr', requestMetadata = {}) {
  try {
    // Check visit access
    const hasAccess = await checkVisitAccess(user, visitId);
    if (!hasAccess) {
      throw new Error('Access denied to this visit');
    }

    // Get the visit to access patient_id for shared fields
    const visit = await Visit.findByPk(visitId);
    if (!visit) {
      throw new Error('Visit not found');
    }
    const patientId = visit.patient_id;

    // Get all active categories and definitions where entity_types includes 'visit'
    const categories = await CustomFieldCategory.findAll({
      where: {
        is_active: true
      },
      order: [['display_order', 'ASC']],
      include: [
        {
          model: CustomFieldDefinition,
          as: 'field_definitions',
          where: { is_active: true },
          required: false,
          order: [['display_order', 'ASC']]
        }
      ]
    });

    // Filter categories to only those that apply to visits
    const visitCategories = categories.filter(category => {
      const entityTypes = category.entity_types || ['patient'];
      return entityTypes.includes('visit');
    });

    // Separate categories into patient-level (shared) and visit-level (specific)
    const patientLevelCategories = visitCategories.filter(c => isPatientLevelCategory(c));
    const visitLevelCategories = visitCategories.filter(c => !isPatientLevelCategory(c));

    // Get definition IDs for each level
    const patientLevelDefIds = patientLevelCategories.flatMap(c =>
      (c.field_definitions || []).map(d => d.id)
    );
    const visitLevelDefIds = visitLevelCategories.flatMap(c =>
      (c.field_definitions || []).map(d => d.id)
    );

    // Get patient-level values (shared data from patient_custom_field_values)
    const patientValues = patientLevelDefIds.length > 0 ? await PatientCustomFieldValue.findAll({
      where: {
        patient_id: patientId,
        field_definition_id: { [Op.in]: patientLevelDefIds }
      },
      include: [
        {
          model: CustomFieldDefinition,
          as: 'field_definition',
          where: { is_active: true },
          required: true
        }
      ]
    }) : [];

    // Get visit-level values (visit-specific data from visit_custom_field_values)
    const visitValues = visitLevelDefIds.length > 0 ? await VisitCustomFieldValue.findAll({
      where: {
        visit_id: visitId,
        field_definition_id: { [Op.in]: visitLevelDefIds }
      },
      include: [
        {
          model: CustomFieldDefinition,
          as: 'field_definition',
          where: { is_active: true },
          required: true
        }
      ]
    }) : [];

    // Map values to definitions (combining both sources)
    const valuesMap = {};
    patientValues.forEach(value => {
      valuesMap[value.field_definition_id] = value;
    });
    visitValues.forEach(value => {
      valuesMap[value.field_definition_id] = value;
    });

    // Build response with categories, definitions, and values
    const result = await Promise.all(visitCategories.map(async (category) => {
      // Apply translations to category if language is not French
      let translatedCategory = category.toJSON ? category.toJSON() : category;

      // Debug logging
      console.log(`[DEBUG] Category "${category.name}":`, {
        visit_types: translatedCategory.visit_types,
        display_layout: translatedCategory.display_layout,
        raw_visit_types: category.getDataValue('visit_types'),
        raw_display_layout: category.getDataValue('display_layout')
      });

      if (language && language !== 'fr') {
        translatedCategory = await translationService.applyTranslations(
          category,
          'category',
          language
        );
      }

      // Process field definitions
      const fields = await Promise.all((category.field_definitions || []).map(async (definition) => {
        const value = valuesMap[definition.id];

        // Apply translations to definition if language is not French
        let translatedDefinition = definition.toJSON ? definition.toJSON() : definition;
        if (language && language !== 'fr') {
          translatedDefinition = await translationService.applyTranslations(
            definition,
            'field_definition',
            language
          );
        }

        // Parse JSON fields
        let validationRules = null;
        let selectOptions = null;

        try {
          validationRules = translatedDefinition.validation_rules ? JSON.parse(translatedDefinition.validation_rules) : null;
        } catch (e) {
          validationRules = translatedDefinition.validation_rules;
        }

        try {
          selectOptions = translatedDefinition.select_options ? JSON.parse(translatedDefinition.select_options) : null;
        } catch (e) {
          selectOptions = translatedDefinition.select_options;
        }

        return {
          definition_id: translatedDefinition.id,
          field_name: translatedDefinition.field_name,
          field_label: translatedDefinition.field_label,
          field_type: translatedDefinition.field_type,
          is_required: translatedDefinition.is_required,
          allow_multiple: translatedDefinition.allow_multiple || false,
          validation_rules: validationRules,
          select_options: selectOptions,
          help_text: translatedDefinition.help_text,
          display_order: translatedDefinition.display_order,
          show_in_basic_info: translatedDefinition.show_in_basic_info || false,
          value: value ? value.getValue(translatedDefinition.field_type, translatedDefinition.allow_multiple) : null,
          value_id: value ? value.id : null,
          updated_at: value ? value.updated_at : null
        };
      }));

      return {
        id: translatedCategory.id,
        name: translatedCategory.name,
        description: translatedCategory.description,
        display_order: translatedCategory.display_order,
        color: translatedCategory.color || '#3498db',
        visit_types: translatedCategory.visit_types || null,
        display_layout: translatedCategory.display_layout || { type: 'columns', columns: 1 },
        fields
      };
    }));

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'visit_custom_fields',
      resource_id: visitId,
      ...requestMetadata
    });

    return result;
  } catch (error) {
    console.error('Error in getVisitCustomFields:', error);
    throw error;
  }
}

/**
 * Recalculate dependent calculated fields for a visit
 * @param {string} visitId - Visit UUID
 * @param {string} changedFieldName - Name of field that was changed
 * @param {Object} user - User making the change
 * @returns {Promise<Array>} Array of updated field values
 */
async function recalculateDependentFields(visitId, changedFieldName, user) {
  try {
    // Find all calculated fields, then filter in JS to avoid Op.like issues with JSON columns in SQLite
    const allCalculatedFields = await CustomFieldDefinition.findAll({
      where: {
        is_calculated: true,
        is_active: true
      }
    });

    const calculatedFields = allCalculatedFields.filter(f => {
      const deps = f.dependencies || [];
      return deps.includes(changedFieldName);
    });

    if (calculatedFields.length === 0) {
      return [];
    }

    // Get all visit field values to use for calculations
    const allValues = await VisitCustomFieldValue.findAll({
      where: { visit_id: visitId },
      include: [{
        model: CustomFieldDefinition,
        as: 'field_definition',
        attributes: ['field_name', 'field_type']
      }]
    });

    // Build value map by field name
    const valueMap = {};
    allValues.forEach(v => {
      if (v.field_definition) {
        valueMap[v.field_definition.field_name] = v.getValue(v.field_definition.field_type, v.field_definition.allow_multiple);
      }
    });

    const updatedFields = [];

    // Recalculate each dependent field
    for (const calcField of calculatedFields) {
      try {
        // Check if all dependencies have values
        const deps = calcField.dependencies || [];
        const hasAllDeps = deps.every(dep => valueMap[dep] !== null && valueMap[dep] !== undefined);

        if (!hasAllDeps) {
          continue;
        }

        // Evaluate formula
        const result = formulaEngine.evaluateFormula(
          calcField.formula,
          valueMap,
          calcField.decimal_places || 2
        );

        if (result.success) {
          // Find or create the calculated field value
          let fieldValue = await VisitCustomFieldValue.findOne({
            where: {
              visit_id: visitId,
              field_definition_id: calcField.id
            }
          });

          const isNew = !fieldValue;

          if (isNew) {
            fieldValue = await VisitCustomFieldValue.create({
              visit_id: visitId,
              field_definition_id: calcField.id,
              updated_by: user.id
            });
          }

          // Set the calculated value
          fieldValue.setValue(result.result, 'number');
          fieldValue.updated_by = user.id;
          await fieldValue.save();

          updatedFields.push({
            field_name: calcField.field_name,
            field_label: calcField.field_label,
            value: result.result
          });

          // Update value map for cascading calculations
          valueMap[calcField.field_name] = result.result;

          // Audit log
          await auditService.log({
            user_id: user.id,
            username: user.username,
            action: isNew ? 'AUTO_CREATE' : 'AUTO_UPDATE',
            resource_type: 'visit_custom_field_value',
            resource_id: fieldValue.id,
            details: `Auto-calculated field ${calcField.field_label} due to change in ${changedFieldName}`
          });
        }
      } catch (error) {
        console.error(`Error recalculating field ${calcField.field_name}:`, error);
      }
    }

    return updatedFields;
  } catch (error) {
    console.error('Error in recalculateDependentFields:', error);
    return [];
  }
}

/**
 * Set a custom field value for a visit
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {string} definitionId - Field definition UUID
 * @param {any} value - Field value
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated/created field value
 */
async function setVisitCustomField(user, visitId, definitionId, value, requestMetadata = {}) {
  try {
    // Check visit access
    const hasAccess = await checkVisitAccess(user, visitId);
    if (!hasAccess) {
      throw new Error('Access denied to this visit');
    }

    // Get field definition with its category
    const definition = await CustomFieldDefinition.findByPk(definitionId, {
      include: [{
        model: CustomFieldCategory,
        as: 'category'
      }]
    });
    if (!definition || !definition.is_active) {
      throw new Error('Field definition not found or inactive');
    }

    // Get visit to access patient_id
    const visit = await Visit.findByPk(visitId, {
      include: [{ model: Patient, as: 'patient' }]
    });
    if (!visit) {
      throw new Error('Visit not found');
    }

    // Validate value
    const validation = definition.validateValue(value);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Determine if this is a patient-level (shared) or visit-level field
    const isPatientLevel = definition.category && isPatientLevelCategory(definition.category);

    let fieldValue;
    let isNew;
    let beforeData;

    if (isPatientLevel) {
      // Store at patient level (shared between patient view and visit view)
      fieldValue = await PatientCustomFieldValue.findOne({
        where: {
          patient_id: visit.patient_id,
          field_definition_id: definitionId
        }
      });

      isNew = !fieldValue;
      beforeData = fieldValue ? fieldValue.toJSON() : null;

      if (isNew) {
        fieldValue = await PatientCustomFieldValue.create({
          patient_id: visit.patient_id,
          field_definition_id: definitionId,
          updated_by: user.id
        });
      }
    } else {
      // Store at visit level (visit-specific)
      fieldValue = await VisitCustomFieldValue.findOne({
        where: {
          visit_id: visitId,
          field_definition_id: definitionId
        }
      });

      isNew = !fieldValue;
      beforeData = fieldValue ? fieldValue.toJSON() : null;

      if (isNew) {
        fieldValue = await VisitCustomFieldValue.create({
          visit_id: visitId,
          field_definition_id: definitionId,
          updated_by: user.id
        });
      }
    }

    // Set the value based on field type
    fieldValue.setValue(value, definition.field_type, definition.allow_multiple);
    fieldValue.updated_by = user.id;
    await fieldValue.save();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: isNew ? 'CREATE' : 'UPDATE',
      resource_type: isPatientLevel ? 'patient_custom_field_value' : 'visit_custom_field_value',
      resource_id: fieldValue.id,
      changes: {
        before: beforeData,
        after: fieldValue.toJSON()
      },
      details: visit ? `Visit for patient: ${visit.patient?.first_name} ${visit.patient?.last_name}, Field: ${definition.field_label}${isPatientLevel ? ' (shared)' : ''}` : undefined,
      ...requestMetadata
    });

    // Auto-recalculate dependent calculated fields (only if this is not a calculated field)
    if (!definition.is_calculated) {
      if (isPatientLevel) {
        // Recalculate at patient level
        const patientCustomFieldService = require('./patientCustomField.service');
        // Just log - the patient service will handle recalculation
        console.log(`[VISIT-CF] Updated shared field ${definition.field_name} for patient ${visit.patient_id}`);
      } else {
        await recalculateDependentFields(visitId, definition.field_name, user);
      }
    }

    return fieldValue;
  } catch (error) {
    console.error('Error in setVisitCustomField:', error);
    throw error;
  }
}

/**
 * Bulk update custom field values for a visit
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {Array} fields - Array of {definition_id, value} objects
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function bulkUpdateVisitFields(user, visitId, fields, requestMetadata = {}) {
  try {
    // Check visit access
    const hasAccess = await checkVisitAccess(user, visitId);
    if (!hasAccess) {
      throw new Error('Access denied to this visit');
    }

    // Get visit to access patient_id
    const visit = await Visit.findByPk(visitId, {
      include: [{ model: Patient, as: 'patient' }]
    });
    if (!visit) {
      throw new Error('Visit not found');
    }

    const transaction = await db.sequelize.transaction();

    try {
      const results = [];

      for (const field of fields) {
        // Get field definition with its category
        const definition = await CustomFieldDefinition.findByPk(field.definition_id, {
          include: [{
            model: CustomFieldCategory,
            as: 'category'
          }],
          transaction
        });
        if (!definition || !definition.is_active) {
          throw new Error(`Field definition ${field.definition_id} not found or inactive`);
        }

        // Validate value
        const validation = definition.validateValue(field.value);
        if (!validation.isValid) {
          throw new Error(`${definition.field_label}: ${validation.error}`);
        }

        // Determine if this is a patient-level (shared) or visit-level field
        const isPatientLevel = definition.category && isPatientLevelCategory(definition.category);

        let fieldValue;
        let isNew;

        if (isPatientLevel) {
          // Store at patient level (shared)
          fieldValue = await PatientCustomFieldValue.findOne({
            where: {
              patient_id: visit.patient_id,
              field_definition_id: field.definition_id
            },
            transaction
          });

          isNew = !fieldValue;

          if (isNew) {
            fieldValue = await PatientCustomFieldValue.create({
              patient_id: visit.patient_id,
              field_definition_id: field.definition_id,
              updated_by: user.id
            }, { transaction });
          }
        } else {
          // Store at visit level (visit-specific)
          fieldValue = await VisitCustomFieldValue.findOne({
            where: {
              visit_id: visitId,
              field_definition_id: field.definition_id
            },
            transaction
          });

          isNew = !fieldValue;

          if (isNew) {
            fieldValue = await VisitCustomFieldValue.create({
              visit_id: visitId,
              field_definition_id: field.definition_id,
              updated_by: user.id
            }, { transaction });
          }
        }

        // Set the value based on field type
        fieldValue.setValue(field.value, definition.field_type, definition.allow_multiple);
        fieldValue.updated_by = user.id;
        await fieldValue.save({ transaction });

        results.push({
          definition_id: field.definition_id,
          value_id: fieldValue.id,
          status: isNew ? 'created' : 'updated',
          level: isPatientLevel ? 'patient' : 'visit'
        });
      }

      await transaction.commit();

      // Audit log
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        resource_type: 'visit_custom_fields',
        resource_id: visitId,
        changes: { after: { fields: results } },
        details: visit ? `Visit for patient: ${visit.patient?.first_name} ${visit.patient?.last_name}, Updated ${results.length} fields` : undefined,
        ...requestMetadata
      });

      return {
        message: `Successfully updated ${results.length} custom fields`,
        results
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error in bulkUpdateVisitFields:', error);
    throw error;
  }
}

/**
 * Delete a custom field value for a visit
 *
 * @param {Object} user - Authenticated user object
 * @param {string} visitId - Visit UUID
 * @param {string} fieldValueId - Field value UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function deleteVisitCustomField(user, visitId, fieldValueId, requestMetadata = {}) {
  try {
    // Check visit access
    const hasAccess = await checkVisitAccess(user, visitId);
    if (!hasAccess) {
      throw new Error('Access denied to this visit');
    }

    const fieldValue = await VisitCustomFieldValue.findOne({
      where: {
        id: fieldValueId,
        visit_id: visitId
      },
      include: [
        {
          model: CustomFieldDefinition,
          as: 'field_definition'
        }
      ]
    });

    if (!fieldValue) {
      throw new Error('Custom field value not found');
    }

    const beforeData = fieldValue.toJSON();

    await fieldValue.destroy();

    // Get visit info for audit log
    const visit = await Visit.findByPk(visitId, {
      include: [{ model: Patient, as: 'patient' }]
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'visit_custom_field_value',
      resource_id: fieldValueId,
      changes: { before: beforeData },
      details: visit ? `Visit for patient: ${visit.patient?.first_name} ${visit.patient?.last_name}` : undefined,
      ...requestMetadata
    });

    return { message: 'Custom field value deleted successfully' };
  } catch (error) {
    console.error('Error in deleteVisitCustomField:', error);
    throw error;
  }
}

module.exports = {
  getVisitCustomFields,
  setVisitCustomField,
  bulkUpdateVisitFields,
  deleteVisitCustomField
};
