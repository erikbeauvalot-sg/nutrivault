/**
 * Patient Measure Service
 *
 * Handles logging and querying patient measure values.
 * Sprint 3: US-5.3.2 - Log Measure Values
 */

const db = require('../../../models');
const PatientMeasure = db.PatientMeasure;
const MeasureDefinition = db.MeasureDefinition;
const Patient = db.Patient;
const auditService = require('./audit.service');
const { Op } = require('sequelize');

/**
 * Log a new measure value for a patient
 * @param {string} patientId - Patient UUID
 * @param {Object} data - Measure data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Created measure
 */
async function logMeasure(patientId, data, user, requestMetadata = {}) {
  try {
    // Validate required fields
    if (!data.measure_definition_id) {
      throw new Error('measure_definition_id is required');
    }
    if (data.value === undefined || data.value === null) {
      throw new Error('value is required');
    }

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Get measure definition
    const measureDef = await MeasureDefinition.findByPk(data.measure_definition_id);
    if (!measureDef) {
      throw new Error('Measure definition not found');
    }

    if (!measureDef.is_active) {
      throw new Error('Cannot log values for inactive measure');
    }

    // Validate value
    const validation = measureDef.validateValue(data.value);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create measure instance
    const measure = PatientMeasure.build({
      patient_id: patientId,
      measure_definition_id: data.measure_definition_id,
      visit_id: data.visit_id || null,
      measured_at: data.measured_at ? new Date(data.measured_at) : new Date(),
      notes: data.notes || null,
      recorded_by: user.id
    });

    // Set value based on type
    measure.setValue(measureDef.measure_type, data.value);

    // Save
    await measure.save();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      resource_type: 'patient_measure',
      resource_id: measure.id,
      details: {
        patient_id: patientId,
        measure_name: measureDef.name,
        value: data.value,
        visit_id: data.visit_id
      },
      ...requestMetadata
    });

    // Return with measure definition
    const result = measure.toJSON();
    result.measure_definition = measureDef.toJSON();

    return result;
  } catch (error) {
    console.error('Error in logMeasure:', error);
    throw error;
  }
}

/**
 * Get all measures for a patient
 * @param {string} patientId - Patient UUID
 * @param {Object} filters - Optional filters
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Array>} Array of measures
 */
async function getMeasures(patientId, filters = {}, user, requestMetadata = {}) {
  try {
    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const where = { patient_id: patientId };

    // Apply filters
    if (filters.measure_definition_id) {
      where.measure_definition_id = filters.measure_definition_id;
    }
    if (filters.visit_id) {
      where.visit_id = filters.visit_id;
    }
    if (filters.start_date || filters.end_date) {
      where.measured_at = {};
      if (filters.start_date) {
        where.measured_at[Op.gte] = new Date(filters.start_date);
      }
      if (filters.end_date) {
        where.measured_at[Op.lte] = new Date(filters.end_date);
      }
    }

    const measures = await PatientMeasure.findAll({
      where,
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        required: true
      }],
      order: [['measured_at', 'DESC']],
      limit: filters.limit || 100
    });

    // Format results
    const results = measures.map(measure => {
      const measureDef = measure.measureDefinition || measure.MeasureDefinition;
      return {
        id: measure.id,
        patient_id: measure.patient_id,
        measure_definition_id: measure.measure_definition_id,
        visit_id: measure.visit_id,
        measured_at: measure.measured_at,
        value: measure.getValue(measureDef.measure_type),
        formatted_value: measure.formatValue(measureDef),
        notes: measure.notes,
        recorded_by: measure.recorded_by,
        created_at: measure.created_at,
        updated_at: measure.updated_at,
        measure_definition: {
          id: measureDef.id,
          name: measureDef.name,
          display_name: measureDef.display_name,
          category: measureDef.category,
          measure_type: measureDef.measure_type,
          unit: measureDef.unit
        }
      };
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patient_measures',
      resource_id: patientId,
      details: { filters, count: results.length },
      ...requestMetadata
    });

    return results;
  } catch (error) {
    console.error('Error in getMeasures:', error);
    throw error;
  }
}

/**
 * Get measure history for a specific measure type
 * @param {string} patientId - Patient UUID
 * @param {string} measureDefId - Measure definition UUID
 * @param {Object} dateRange - { start_date, end_date }
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Array>} Time-series data
 */
async function getMeasureHistory(patientId, measureDefId, dateRange = {}, user, requestMetadata = {}) {
  try {
    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Verify measure definition exists
    const measureDef = await MeasureDefinition.findByPk(measureDefId);
    if (!measureDef) {
      throw new Error('Measure definition not found');
    }

    const where = {
      patient_id: patientId,
      measure_definition_id: measureDefId
    };

    // Apply date range
    if (dateRange.start_date || dateRange.end_date) {
      where.measured_at = {};
      if (dateRange.start_date) {
        where.measured_at[Op.gte] = new Date(dateRange.start_date);
      }
      if (dateRange.end_date) {
        where.measured_at[Op.lte] = new Date(dateRange.end_date);
      }
    }

    const measures = await PatientMeasure.findAll({
      where,
      order: [['measured_at', 'ASC']],
      attributes: ['id', 'measured_at', 'numeric_value', 'text_value', 'boolean_value', 'notes']
    });

    // Format for time-series
    const history = measures.map(measure => ({
      date: measure.measured_at,
      value: measure.getValue(measureDef.measure_type),
      formatted_value: measure.formatValue(measureDef),
      notes: measure.notes,
      id: measure.id
    }));

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'patient_measure_history',
      resource_id: patientId,
      details: {
        measure_name: measureDef.name,
        date_range: dateRange,
        count: history.length
      },
      ...requestMetadata
    });

    return {
      patient_id: patientId,
      measure_definition: {
        id: measureDef.id,
        name: measureDef.name,
        display_name: measureDef.display_name,
        unit: measureDef.unit,
        measure_type: measureDef.measure_type
      },
      history
    };
  } catch (error) {
    console.error('Error in getMeasureHistory:', error);
    throw error;
  }
}

/**
 * Update a measure value
 * @param {string} id - Measure UUID
 * @param {Object} data - Updated data
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Object>} Updated measure
 */
async function updateMeasure(id, data, user, requestMetadata = {}) {
  try {
    const measure = await PatientMeasure.findByPk(id, {
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        required: true
      }]
    });

    if (!measure) {
      throw new Error('Measure not found');
    }

    const measureDef = measure.measureDefinition || measure.MeasureDefinition;

    // Validate new value if provided
    if (data.value !== undefined) {
      const validation = measureDef.validateValue(data.value);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      measure.setValue(measureDef.measure_type, data.value);
    }

    // Update other fields
    if (data.measured_at) {
      measure.measured_at = new Date(data.measured_at);
    }
    if (data.notes !== undefined) {
      measure.notes = data.notes;
    }
    if (data.visit_id !== undefined) {
      measure.visit_id = data.visit_id;
    }

    await measure.save();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      resource_type: 'patient_measure',
      resource_id: id,
      details: {
        measure_name: measureDef.name,
        updated_fields: data
      },
      ...requestMetadata
    });

    const result = measure.toJSON();
    result.measure_definition = measureDef.toJSON();

    return result;
  } catch (error) {
    console.error('Error in updateMeasure:', error);
    throw error;
  }
}

/**
 * Delete (soft delete) a measure
 * @param {string} id - Measure UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<void>}
 */
async function deleteMeasure(id, user, requestMetadata = {}) {
  try {
    const measure = await PatientMeasure.findByPk(id, {
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition'
      }]
    });

    if (!measure) {
      throw new Error('Measure not found');
    }

    const measureDef = measure.measureDefinition || measure.MeasureDefinition;

    // Soft delete
    await measure.destroy();

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      resource_type: 'patient_measure',
      resource_id: id,
      details: {
        patient_id: measure.patient_id,
        measure_name: measureDef?.name
      },
      ...requestMetadata
    });

    return { success: true, message: 'Measure deleted successfully' };
  } catch (error) {
    console.error('Error in deleteMeasure:', error);
    throw error;
  }
}

/**
 * Get measures by visit
 * @param {string} visitId - Visit UUID
 * @param {Object} user - Authenticated user
 * @param {Object} requestMetadata - Request metadata for audit
 * @returns {Promise<Array>} Array of measures
 */
async function getMeasuresByVisit(visitId, user, requestMetadata = {}) {
  try {
    const measures = await PatientMeasure.findAll({
      where: { visit_id: visitId },
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        required: true
      }],
      order: [['measured_at', 'ASC']]
    });

    // Format results
    const results = measures.map(measure => {
      const measureDef = measure.measureDefinition || measure.MeasureDefinition;
      return {
        id: measure.id,
        patient_id: measure.patient_id,
        visit_id: measure.visit_id,
        measured_at: measure.measured_at,
        value: measure.getValue(measureDef.measure_type),
        formatted_value: measure.formatValue(measureDef),
        notes: measure.notes,
        measure_definition: {
          id: measureDef.id,
          name: measureDef.name,
          display_name: measureDef.display_name,
          unit: measureDef.unit
        }
      };
    });

    // Audit log
    await auditService.log({
      user_id: user.id,
      username: user.username,
      action: 'READ',
      resource_type: 'visit_measures',
      resource_id: visitId,
      details: { count: results.length },
      ...requestMetadata
    });

    return results;
  } catch (error) {
    console.error('Error in getMeasuresByVisit:', error);
    throw error;
  }
}

module.exports = {
  logMeasure,
  getMeasures,
  getMeasureHistory,
  updateMeasure,
  deleteMeasure,
  getMeasuresByVisit
};
