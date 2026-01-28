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
const PatientMeasure = db.PatientMeasure;
const MeasureDefinition = db.MeasureDefinition;
const auditService = require('./audit.service');
const translationService = require('./customFieldTranslation.service');
const formulaEngine = require('./formulaEngine.service');
const { Op } = db.Sequelize;

/**
 * Fetch latest measure values for a patient
 * Returns a map of measure internal_name -> latest numeric value
 *
 * @param {string} patientId - Patient UUID
 * @returns {Promise<Object>} Map of measure names to their latest values
 */
async function getLatestMeasureValues(patientId) {
  const measureValues = {};

  try {
    // Get all measure definitions to map IDs to names
    const definitions = await MeasureDefinition.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'measure_type']
    });

    const defMap = {};
    definitions.forEach(def => {
      defMap[def.id] = def;
    });

    // Get all measures for this patient, ordered by measured_at DESC
    const measures = await PatientMeasure.findAll({
      where: { patient_id: patientId },
      order: [['measured_at', 'DESC']],
      attributes: ['measure_definition_id', 'numeric_value', 'text_value', 'boolean_value', 'measured_at']
    });

    // For each measure definition, get only the latest value
    const seenDefinitions = new Set();
    for (const measure of measures) {
      if (seenDefinitions.has(measure.measure_definition_id)) {
        continue; // Already have the latest for this definition
      }
      seenDefinitions.add(measure.measure_definition_id);

      const def = defMap[measure.measure_definition_id];
      if (!def) continue;

      // Get the appropriate value based on measure type
      let value = null;
      if (measure.numeric_value !== null && measure.numeric_value !== undefined) {
        value = parseFloat(measure.numeric_value);
      } else if (measure.text_value !== null) {
        // Try to parse as number for calculated fields
        const parsed = parseFloat(measure.text_value);
        if (!isNaN(parsed)) value = parsed;
      } else if (measure.boolean_value !== null) {
        value = measure.boolean_value ? 1 : 0;
      }

      if (value !== null && !isNaN(value)) {
        measureValues[def.name] = value;
      }
    }

    console.log(`[MEASURE-VALUES] Fetched ${Object.keys(measureValues).length} measure values for patient ${patientId}:`, measureValues);
  } catch (error) {
    console.error('[MEASURE-VALUES] Error fetching measure values:', error);
  }

  return measureValues;
}

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

    // Auto-calculate missing calculated field values
    // This handles the case where a calculated field is created after its dependencies already have values
    console.log('[AUTO-CALC-INIT] Checking for calculated fields with missing values...');

    // Get all calculated field definitions
    const allCalculatedFields = [];
    patientCategories.forEach(category => {
      category.field_definitions?.forEach(def => {
        if (def.is_calculated && def.is_active) {
          allCalculatedFields.push(def);
        }
      });
    });

    console.log(`[AUTO-CALC-INIT] Found ${allCalculatedFields.length} calculated fields`);

    if (allCalculatedFields.length > 0) {
      // Build value map by field name for formula evaluation
      const valueMapByName = {};
      patientValues.forEach(v => {
        if (v.field_definition) {
          valueMapByName[v.field_definition.field_name] = v.getValue(v.field_definition.field_type, v.field_definition.allow_multiple);
        }
      });

      // Check if any calculated field uses measure references
      const hasMeasureRefs = allCalculatedFields.some(f =>
        f.formula && formulaEngine.hasMeasureReferences(f.formula)
      );

      // If any formula uses measures, fetch the latest measure values
      if (hasMeasureRefs) {
        console.log('[AUTO-CALC-INIT] Some formulas use measure references, fetching measure values...');
        const measureValues = await getLatestMeasureValues(patientId);

        // Add measure values to the value map with 'measure:' prefix
        for (const [measureName, value] of Object.entries(measureValues)) {
          valueMapByName[`measure:${measureName}`] = value;
        }
        console.log('[AUTO-CALC-INIT] Added measure values to formula context:', Object.keys(measureValues));
      }

      // Process each calculated field
      for (const calcField of allCalculatedFields) {
        // Check if this field already has a value
        const fieldValueRecord = valuesMap[calcField.id];
        const currentValue = fieldValueRecord ? fieldValueRecord.getValue(calcField.field_type) : null;

        // Check if formula uses volatile functions like today() that change over time
        const usesVolatileFunctions = calcField.formula && /today\(\)/.test(calcField.formula);

        // Always recalculate if: no value OR uses volatile functions (like today())
        const needsCalculation = currentValue === null || currentValue === undefined || usesVolatileFunctions;

        if (needsCalculation) {
          if (usesVolatileFunctions && currentValue !== null) {
            console.log(`[AUTO-CALC-INIT] Field ${calcField.field_name} uses volatile function (today()), recalculating...`);
          }
          console.log(`[AUTO-CALC-INIT] Field ${calcField.field_name} has no value (current: ${currentValue}), checking dependencies...`);

          // Check if all dependencies have values
          const deps = calcField.dependencies || [];
          const hasAllDeps = deps.every(dep => {
            const depValue = valueMapByName[dep];
            return depValue !== null && depValue !== undefined;
          });

          // Calculate if all deps are present OR if there are no dependencies (like today())
          if (hasAllDeps || deps.length === 0) {
            console.log(`[AUTO-CALC-INIT] ${deps.length === 0 ? 'No dependencies (zero-arg function)' : 'All dependencies present'} for ${calcField.field_name}, calculating...`);
            console.log(`[AUTO-CALC-INIT] Formula: ${calcField.formula}`);
            if (deps.length > 0) {
              console.log(`[AUTO-CALC-INIT] Dependencies:`, deps.map(d => `${d}=${valueMapByName[d]}`));
            }

            try {
              // Evaluate formula
              const result = formulaEngine.evaluateFormula(
                calcField.formula,
                valueMapByName,
                calcField.decimal_places || 2
              );

              console.log(`[AUTO-CALC-INIT] Formula result:`, result);

              if (result.success) {
                // Find or create the calculated field value record
                let fieldValue = fieldValueRecord;
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

                // Add to values map so it appears in the response
                valuesMap[calcField.id] = fieldValue;
                valueMapByName[calcField.field_name] = result.result;

                console.log(`[AUTO-CALC-INIT] Successfully calculated and saved ${calcField.field_name} = ${result.result}`);

                // Audit log
                await auditService.log({
                  user_id: user.id,
                  username: user.username,
                  action: isNew ? 'AUTO_CREATE' : 'AUTO_UPDATE',
                  resource_type: 'patient_custom_field_value',
                  resource_id: fieldValue.id,
                  details: `Auto-calculated field ${calcField.field_label} on page load`
                });
              } else {
                console.log(`[AUTO-CALC-INIT] Formula evaluation failed: ${result.error}`);
              }
            } catch (error) {
              console.error(`[AUTO-CALC-INIT] Error calculating field ${calcField.field_name}:`, error);
            }
          } else {
            console.log(`[AUTO-CALC-INIT] Missing dependencies for ${calcField.field_name}. Has: ${deps.filter(d => valueMapByName[d] !== null && valueMapByName[d] !== undefined).join(', ')}. Missing: ${deps.filter(d => valueMapByName[d] === null || valueMapByName[d] === undefined).join(', ')}`);
          }
        } else {
          console.log(`[AUTO-CALC-INIT] Field ${calcField.field_name} already has value: ${currentValue}`);
        }
      }
    }

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
          is_calculated: translatedDefinition.is_calculated || false,
          allow_multiple: translatedDefinition.allow_multiple || false,
          decimal_places: translatedDefinition.decimal_places,
          formula: translatedDefinition.formula,
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
// Cache for calculated field definitions (cleared when definitions are updated)
let calculatedFieldsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all calculated fields with caching
 */
async function getCachedCalculatedFields() {
  const now = Date.now();

  // Return cached data if valid
  if (calculatedFieldsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return calculatedFieldsCache;
  }

  // Fetch fresh data
  const fields = await CustomFieldDefinition.findAll({
    where: {
      is_calculated: true,
      is_active: true
    }
  });

  calculatedFieldsCache = fields;
  cacheTimestamp = now;

  return fields;
}

/**
 * Clear calculated fields cache (call when definitions are updated)
 */
function clearCalculatedFieldsCache() {
  calculatedFieldsCache = null;
  cacheTimestamp = null;
}

/**
 * Topological sort for dependency resolution
 * Ensures calculated fields are processed in correct order
 */
function topologicalSort(fields, allFieldsMap) {
  const sorted = [];
  const visited = new Set();
  const temp = new Set();

  function visit(field) {
    if (temp.has(field.field_name)) {
      // Circular dependency - skip this field
      console.warn(`[TOPO-SORT] Circular dependency detected for ${field.field_name}`);
      return;
    }

    if (visited.has(field.field_name)) {
      return;
    }

    temp.add(field.field_name);

    // Visit dependencies first (that are also calculated fields)
    const deps = field.dependencies || [];
    for (const depName of deps) {
      const depField = allFieldsMap[depName];
      if (depField && depField.is_calculated) {
        visit(depField);
      }
    }

    temp.delete(field.field_name);
    visited.add(field.field_name);
    sorted.push(field);
  }

  for (const field of fields) {
    if (!visited.has(field.field_name)) {
      visit(field);
    }
  }

  return sorted;
}

async function recalculateDependentFields(patientId, changedFieldName, user) {
  const startTime = Date.now();

  try {
    console.log(`[RECALC] Looking for calculated fields that depend on: ${changedFieldName}`);

    // Get all calculated fields (with caching)
    const allCalculatedFields = await getCachedCalculatedFields();

    // Filter to only those that directly depend on the changed field
    let calculatedFields = allCalculatedFields.filter(field => {
      const deps = field.dependencies || [];
      return deps.includes(changedFieldName);
    });

    console.log(`[RECALC] Found ${calculatedFields.length} calculated fields that depend on ${changedFieldName}`);

    if (calculatedFields.length === 0) {
      return [];
    }

    // Build a map of all calculated fields for topological sorting
    const allFieldsMap = {};
    allCalculatedFields.forEach(f => {
      allFieldsMap[f.field_name] = f;
    });

    // Topologically sort fields to handle cascading dependencies
    // This ensures that if field A depends on field B, and both changed,
    // we calculate B before A
    calculatedFields = topologicalSort(calculatedFields, allFieldsMap);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[RECALC] Processing order:`, calculatedFields.map(f => f.field_name));
    }

    // Get all patient field values in one query
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
    const valueRecordsById = {};
    allValues.forEach(v => {
      if (v.field_definition) {
        valueMap[v.field_definition.field_name] = v.getValue(v.field_definition.field_type);
        valueRecordsById[v.field_definition_id] = v;
      }
    });

    // Check if any calculated field uses measure references
    const hasMeasureRefs = calculatedFields.some(f =>
      f.formula && formulaEngine.hasMeasureReferences(f.formula)
    );

    // If any formula uses measures, fetch the latest measure values
    if (hasMeasureRefs) {
      console.log('[RECALC] Some formulas use measure references, fetching measure values...');
      const measureValues = await getLatestMeasureValues(patientId);

      // Add measure values to the value map with 'measure:' prefix
      for (const [measureName, value] of Object.entries(measureValues)) {
        valueMap[`measure:${measureName}`] = value;
      }
    }

    const updatedFields = [];
    const auditLogs = [];

    // Recalculate each dependent field in topological order
    for (const calcField of calculatedFields) {
      try {
        // Check if all dependencies have values
        const deps = calcField.dependencies || [];
        const hasAllDeps = deps.every(dep => valueMap[dep] !== null && valueMap[dep] !== undefined);

        if (!hasAllDeps) {
          if (process.env.NODE_ENV !== 'production') {
            const missing = deps.filter(dep => valueMap[dep] === null || valueMap[dep] === undefined);
            console.log(`[RECALC] Skipping ${calcField.field_name}, missing dependencies: ${missing.join(', ')}`);
          }
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
          let fieldValue = valueRecordsById[calcField.id];
          const isNew = !fieldValue;

          if (isNew) {
            fieldValue = await PatientCustomFieldValue.create({
              patient_id: patientId,
              field_definition_id: calcField.id,
              updated_by: user.id
            });
            valueRecordsById[calcField.id] = fieldValue;
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

          // Queue audit log (batch insert later if needed)
          auditLogs.push({
            user_id: user.id,
            username: user.username,
            action: isNew ? 'AUTO_CREATE' : 'AUTO_UPDATE',
            resource_type: 'patient_custom_field_value',
            resource_id: fieldValue.id,
            details: `Auto-calculated field ${calcField.field_label} due to change in ${changedFieldName}`
          });
        } else {
          console.error(`[RECALC] Formula evaluation failed for ${calcField.field_name}:`, result.error);
        }
      } catch (error) {
        console.error(`[RECALC] Error calculating ${calcField.field_name}:`, error.message);
      }
    }

    // Batch insert audit logs
    for (const log of auditLogs) {
      await auditService.log(log);
    }

    const duration = Date.now() - startTime;
    console.log(`[RECALC] Completed in ${duration}ms. Updated ${updatedFields.length} fields.`);

    return updatedFields;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[RECALC] Error after ${duration}ms:`, error);
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
    console.log(`[SET-FIELD] Called with definitionId: ${definitionId}, value: ${value}`);

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

    console.log(`[SET-FIELD] Field name: ${definition.field_name}, is_calculated: ${definition.is_calculated}`);

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
    fieldValue.setValue(value, definition.field_type, definition.allow_multiple);
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
      console.log(`[AUTO-CALC] Triggering recalculation for field: ${definition.field_name}`);
      const updated = await recalculateDependentFields(patientId, definition.field_name, user);
      console.log(`[AUTO-CALC] Updated ${updated.length} calculated fields:`, updated.map(f => f.field_name));
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
        fieldValue.setValue(field.value, definition.field_type, definition.allow_multiple);
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

      // Auto-recalculate dependent calculated fields
      // Get all field definitions that were updated
      const updatedDefinitionIds = fields.map(f => f.definition_id);
      const updatedDefinitions = await CustomFieldDefinition.findAll({
        where: {
          id: updatedDefinitionIds,
          is_calculated: false // Only trigger recalc for non-calculated fields
        }
      });

      console.log(`[BULK-UPDATE] ${updatedDefinitions.length} non-calculated fields updated, checking for dependent calculated fields...`);

      // Track all updated calculated fields to avoid duplicates
      const allUpdatedCalcFields = new Set();

      // For each updated non-calculated field, recalculate dependent fields
      for (const definition of updatedDefinitions) {
        console.log(`[BULK-UPDATE] Checking dependents of: ${definition.field_name}`);
        const updated = await recalculateDependentFields(patientId, definition.field_name, user);
        updated.forEach(f => allUpdatedCalcFields.add(f.field_name));
      }

      if (allUpdatedCalcFields.size > 0) {
        console.log(`[BULK-UPDATE] Auto-recalculated ${allUpdatedCalcFields.size} calculated fields:`, Array.from(allUpdatedCalcFields));
      }

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

/**
 * Recalculate all values for a specific calculated field across all patients
 * Used when an admin changes the formula
 *
 * @param {string} fieldDefinitionId - Field definition UUID
 * @param {Object} user - User making the change
 * @returns {Promise<Object>} Result summary
 */
async function recalculateAllValuesForField(fieldDefinitionId, user) {
  try {
    console.log(`[RECALC-ALL] Recalculating all values for field: ${fieldDefinitionId}`);

    // Get the field definition
    const fieldDefinition = await CustomFieldDefinition.findByPk(fieldDefinitionId);
    if (!fieldDefinition || !fieldDefinition.is_calculated) {
      throw new Error('Field not found or is not a calculated field');
    }

    console.log(`[RECALC-ALL] Field: ${fieldDefinition.field_name}, Formula: ${fieldDefinition.formula}`);

    // Get all patients that have values for this field
    const existingValues = await PatientCustomFieldValue.findAll({
      where: {
        field_definition_id: fieldDefinitionId
      },
      include: [{
        model: CustomFieldDefinition,
        as: 'field_definition'
      }]
    });

    console.log(`[RECALC-ALL] Found ${existingValues.length} existing values to recalculate`);

    // Get all unique patient IDs
    const patientIds = [...new Set(existingValues.map(v => v.patient_id))];

    let recalculatedCount = 0;
    let errorCount = 0;

    // Recalculate for each patient
    for (const patientId of patientIds) {
      try {
        // Get all field values for this patient
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

        // If formula uses measure references, fetch measure values for this patient
        if (formulaEngine.hasMeasureReferences(fieldDefinition.formula)) {
          const measureValues = await getLatestMeasureValues(patientId);
          for (const [measureName, value] of Object.entries(measureValues)) {
            valueMap[`measure:${measureName}`] = value;
          }
        }

        // Evaluate formula
        const result = formulaEngine.evaluateFormula(
          fieldDefinition.formula,
          valueMap,
          fieldDefinition.decimal_places || 2
        );

        if (result.success) {
          // Update the value
          const valueRecord = existingValues.find(v => v.patient_id === patientId);
          if (valueRecord) {
            valueRecord.setValue(result.result, 'number');
            valueRecord.updated_by = user.id;
            await valueRecord.save();
            recalculatedCount++;
          }
        } else {
          console.log(`[RECALC-ALL] Skipping patient ${patientId}: ${result.error}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`[RECALC-ALL] Error recalculating for patient ${patientId}:`, error.message);
        errorCount++;
      }
    }

    console.log(`[RECALC-ALL] Completed: ${recalculatedCount} updated, ${errorCount} errors`);

    return {
      success: true,
      recalculated: recalculatedCount,
      errors: errorCount,
      total: existingValues.length
    };
  } catch (error) {
    console.error('Error in recalculateAllValuesForField:', error);
    throw error;
  }
}

module.exports = {
  getPatientCustomFields,
  setPatientCustomField,
  bulkUpdatePatientFields,
  deletePatientCustomField,
  recalculateAllValuesForField,
  clearCalculatedFieldsCache
};
