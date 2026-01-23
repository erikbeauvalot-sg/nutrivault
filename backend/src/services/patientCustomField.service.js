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
async function getPatientCustomFields(user, patientId, requestMetadata = {}) {
  try {
    // Check patient access
    const hasAccess = await checkPatientAccess(user, patientId);
    if (!hasAccess) {
      throw new Error('Access denied to this patient');
    }

    // Get all active categories and definitions
    const categories = await CustomFieldCategory.findAll({
      where: { is_active: true },
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
    const result = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      display_order: category.display_order,
      color: category.color || '#3498db',
      fields: (category.field_definitions || []).map(definition => {
        const value = valuesMap[definition.id];

        // Parse JSON fields
        let validationRules = null;
        let selectOptions = null;

        try {
          validationRules = definition.validation_rules ? JSON.parse(definition.validation_rules) : null;
        } catch (e) {
          validationRules = definition.validation_rules;
        }

        try {
          selectOptions = definition.select_options ? JSON.parse(definition.select_options) : null;
        } catch (e) {
          selectOptions = definition.select_options;
        }

        return {
          definition_id: definition.id,
          field_name: definition.field_name,
          field_label: definition.field_label,
          field_type: definition.field_type,
          is_required: definition.is_required,
          validation_rules: validationRules,
          select_options: selectOptions,
          help_text: definition.help_text,
          display_order: definition.display_order,
          show_in_basic_info: definition.show_in_basic_info || false,
          value: value ? value.getValue(definition.field_type) : null,
          value_id: value ? value.id : null,
          updated_at: value ? value.updated_at : null
        };
      })
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
