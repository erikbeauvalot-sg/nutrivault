/**
 * Patient Custom Field Service
 *
 * Business logic for managing patient custom field values.
 * Handles CRUD operations with RBAC and audit logging.
 * Follows patient access control: ADMIN sees all, DIETITIAN sees assigned patients only.
 */

const db = require('../../../models');
const PatientCustomFieldValue = db.PatientCustomFieldValue;
const CustomFieldDefinition = db.CustomFieldDefinition;
const CustomFieldCategory = db.CustomFieldCategory;
const Patient = db.Patient;
const auditService = require('./audit.service');
const translationService = require('./customFieldTranslation.service');
const formulaEngine = require('./formulaEngine.service');
const { Op } = db.Sequelize;

/**
 * Check if user has access to patient
 *
 * @param {Object} user - Authenticated user object
 * @param {string} patientId - Patient UUID
 * @returns {Promise<boolean>} True if user has access
 */
async function checkPatientAccess(user, patientId) {
  if (user.role.name === 'ADMIN') {
    return true;
  }

  if (user.role.name === 'DIETITIAN') {
    const patient = await Patient.findByPk(patientId);
    return patient && patient.assigned_dietitian_id === user.id;
  }

  return false;
}

/**
 * Get all custom field values for a patient
 *
 * @param {Object} user - Authenticated user object
 * @param {string} patientId - Patient UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Array>} Custom field values grouped by category
 */
async function getPatientCustomFields(user, patientId, language = 'fr', requestMetadata = {}) {
  try {
    // Check patient access
    const hasAccess = await checkPatientAccess(user, patientId);
    if (!hasAccess) {
      throw new Error('Access denied to this patient');
    }

    // Get all active categories and definitions where entity_types includes 'patient'
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

    // Filter categories to only those that apply to patients
    const patientCategories = categories.filter(category => {
      const entityTypes = category.entity_types || ['patient'];
      return entityTypes.includes('patient');
    });

    // Get patient's custom field values
    const patientValues = await PatientCustomFieldValue.findAll({
      where: { patient_id: patientId },
      include: [
        {
          model: CustomFieldDefinition,
          as: 'field_definition',
          where: { is_active: true },
          required: true
        }
      ]
    });

    // Map values to definitions
    const valuesMap = {};
    patientValues.forEach(value => {
      valuesMap[value.field_definition_id] = value;
    });

    // Build response with categories, definitions, and values
    const result = await Promise.all(patientCategories.map(async (category) => {
      // Apply translations to category if language is not French
      let translatedCategory = category.toJSON ? category.toJSON() : category;
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
          validation_rules: validationRules,
          select_options: selectOptions,
          help_text: translatedDefinition.help_text,
          display_order: translatedDefinition.display_order,
          show_in_basic_info: translatedDefinition.show_in_basic_info || false,
          value: value ? value.getValue(translatedDefinition.field_type) : null,
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
        fields
      };
    }));

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patient_custom_fields',
      resource_id: patientId,
      ...requestMetadata
    });

    return result;
  } catch (error) {
    console.error('Error in getPatientCustomFields:', error);
    throw error;
  }
}

/**
 * Recalculate dependent calculated fields
 * @param {string} patientId - Patient UUID
 * @param {string} changedFieldName - Name of field that was changed
 * @param {Object} user - User making the change
 * @returns {Promise<Array>} Array of updated field values
 */
async function recalculateDependentFields(patientId, changedFieldName, user) {
  try {
    // Find all calculated fields that depend on the changed field
    const calculatedFields = await CustomFieldDefinition.findAll({
      where: {
        is_calculated: true,
        is_active: true,
        dependencies: {
          [Op.like]: `%"${changedFieldName}"%`
        }
      }
    });

    if (calculatedFields.length === 0) {
      return [];
    }

    // Get all patient field values to use for calculations
    const allValues = await PatientCustomFieldValue.findAll({
      where: { patient_id: patientId },
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
        valueMap[v.field_definition.field_name] = v.getValue(v.field_definition.field_type);
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
          let fieldValue = await PatientCustomFieldValue.findOne({
            where: {
              patient_id: patientId,
              field_definition_id: calcField.id
            }
          });

          const isNew = !fieldValue;

          if (isNew) {
            fieldValue = await PatientCustomFieldValue.create({
              patient_id: patientId,
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
            resource_type: 'patient_custom_field_value',
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
 * Set a custom field value for a patient
 *
 * @param {Object} user - Authenticated user object
 * @param {string} patientId - Patient UUID
 * @param {string} definitionId - Field definition UUID
 * @param {any} value - Field value
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Updated/created field value
 */
async function setPatientCustomField(user, patientId, definitionId, value, requestMetadata = {}) {
  try {
    // Check patient access
    const hasAccess = await checkPatientAccess(user, patientId);
    if (!hasAccess) {
      throw new Error('Access denied to this patient');
    }

    // Get field definition
    const definition = await CustomFieldDefinition.findByPk(definitionId);
    if (!definition || !definition.is_active) {
      throw new Error('Field definition not found or inactive');
    }

    // Validate value
    const validation = definition.validateValue(value);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Find or create patient custom field value
    let fieldValue = await PatientCustomFieldValue.findOne({
      where: {
        patient_id: patientId,
        field_definition_id: definitionId
      }
    });

    const isNew = !fieldValue;
    const beforeData = fieldValue ? fieldValue.toJSON() : null;

    if (isNew) {
      fieldValue = await PatientCustomFieldValue.create({
        patient_id: patientId,
        field_definition_id: definitionId,
        updated_by: user.id
      });
    }

    // Set the value based on field type
    fieldValue.setValue(value, definition.field_type);
    fieldValue.updated_by = user.id;
    await fieldValue.save();

    // Get patient info for audit log
    const patient = await Patient.findByPk(patientId);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: isNew ? 'CREATE' : 'UPDATE',
      resource_type: 'patient_custom_field_value',
      resource_id: fieldValue.id,
      changes: {
        before: beforeData,
        after: fieldValue.toJSON()
      },
      details: patient ? `Patient: ${patient.first_name} ${patient.last_name}, Field: ${definition.field_label}` : undefined,
      ...requestMetadata
    });

    // Auto-recalculate dependent calculated fields (only if this is not a calculated field)
    if (!definition.is_calculated) {
      await recalculateDependentFields(patientId, definition.field_name, user);
    }

    return fieldValue;
  } catch (error) {
    console.error('Error in setPatientCustomField:', error);
    throw error;
  }
}

/**
 * Bulk update custom field values for a patient
 *
 * @param {Object} user - Authenticated user object
 * @param {string} patientId - Patient UUID
 * @param {Array} fields - Array of {definition_id, value} objects
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function bulkUpdatePatientFields(user, patientId, fields, requestMetadata = {}) {
  try {
    // Check patient access
    const hasAccess = await checkPatientAccess(user, patientId);
    if (!hasAccess) {
      throw new Error('Access denied to this patient');
    }

    const transaction = await db.sequelize.transaction();

    try {
      const results = [];

      for (const field of fields) {
        // Get field definition
        const definition = await CustomFieldDefinition.findByPk(field.definition_id, { transaction });
        if (!definition || !definition.is_active) {
          throw new Error(`Field definition ${field.definition_id} not found or inactive`);
        }

        // Validate value
        const validation = definition.validateValue(field.value);
        if (!validation.isValid) {
          throw new Error(`${definition.field_label}: ${validation.error}`);
        }

        // Find or create patient custom field value
        let fieldValue = await PatientCustomFieldValue.findOne({
          where: {
            patient_id: patientId,
            field_definition_id: field.definition_id
          },
          transaction
        });

        const isNew = !fieldValue;

        if (isNew) {
          fieldValue = await PatientCustomFieldValue.create({
            patient_id: patientId,
            field_definition_id: field.definition_id,
            updated_by: user.id
          }, { transaction });
        }

        // Set the value based on field type
        fieldValue.setValue(field.value, definition.field_type);
        fieldValue.updated_by = user.id;
        await fieldValue.save({ transaction });

        results.push({
          definition_id: field.definition_id,
          value_id: fieldValue.id,
          status: isNew ? 'created' : 'updated'
        });
      }

      await transaction.commit();

      // Get patient info for audit log
      const patient = await Patient.findByPk(patientId);

      // Audit log
      await auditService.log({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        resource_type: 'patient_custom_fields',
        resource_id: patientId,
        changes: { after: { fields: results } },
        details: patient ? `Patient: ${patient.first_name} ${patient.last_name}, Updated ${results.length} fields` : undefined,
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
    console.error('Error in bulkUpdatePatientFields:', error);
    throw error;
  }
}

/**
 * Delete a custom field value for a patient
 *
 * @param {Object} user - Authenticated user object
 * @param {string} patientId - Patient UUID
 * @param {string} fieldValueId - Field value UUID
 * @param {Object} requestMetadata - Request metadata for audit logging
 * @returns {Promise<Object>} Result
 */
async function deletePatientCustomField(user, patientId, fieldValueId, requestMetadata = {}) {
  try {
    // Check patient access
    const hasAccess = await checkPatientAccess(user, patientId);
    if (!hasAccess) {
      throw new Error('Access denied to this patient');
    }

    const fieldValue = await PatientCustomFieldValue.findOne({
      where: {
        id: fieldValueId,
        patient_id: patientId
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

    // Get patient info for audit log
    const patient = await Patient.findByPk(patientId);

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'patient_custom_field_value',
      resource_id: fieldValueId,
      changes: { before: beforeData },
      details: patient ? `Patient: ${patient.first_name} ${patient.last_name}` : undefined,
      ...requestMetadata
    });

    return { message: 'Custom field value deleted successfully' };
  } catch (error) {
    console.error('Error in deletePatientCustomField:', error);
    throw error;
  }
}

module.exports = {
  getPatientCustomFields,
  setPatientCustomField,
  bulkUpdatePatientFields,
  deletePatientCustomField
};
