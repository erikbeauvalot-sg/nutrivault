/**
 * Patient Measure Controller
 *
 * Handles HTTP requests for patient measures.
 * Sprint 3: US-5.3.2 - Log Measure Values
 */

const patientMeasureService = require('../services/patientMeasure.service');

/**
 * POST /api/patients/:patientId/measures
 * Log a new measure for a patient
 */
async function logMeasure(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measure = await patientMeasureService.logMeasure(
      req.params.patientId,
      req.body,
      req.user,
      requestMetadata
    );

    res.status(201).json({
      success: true,
      data: measure,
      message: 'Measure logged successfully'
    });
  } catch (error) {
    console.error('Error in logMeasure:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('required') || error.message.includes('invalid') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to log measure'
    });
  }
}

/**
 * GET /api/patients/:patientId/measures
 * Get all measures for a patient
 */
async function getMeasures(req, res) {
  try {
    const filters = {
      measure_definition_id: req.query.measure_definition_id,
      visit_id: req.query.visit_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measures = await patientMeasureService.getMeasures(
      req.params.patientId,
      filters,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: measures,
      count: measures.length
    });
  } catch (error) {
    console.error('Error in getMeasures:', error);
    const statusCode = error.message === 'Patient not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch measures'
    });
  }
}

/**
 * GET /api/patients/:patientId/measures/:measureDefId/history
 * Get measure history for a specific measure type
 */
async function getMeasureHistory(req, res) {
  try {
    const dateRange = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const history = await patientMeasureService.getMeasureHistory(
      req.params.patientId,
      req.params.measureDefId,
      dateRange,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error in getMeasureHistory:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch measure history'
    });
  }
}

/**
 * PUT /api/patient-measures/:id
 * Update a measure
 */
async function updateMeasure(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measure = await patientMeasureService.updateMeasure(
      req.params.id,
      req.body,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: measure,
      message: 'Measure updated successfully'
    });
  } catch (error) {
    console.error('Error in updateMeasure:', error);
    const statusCode = error.message === 'Measure not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update measure'
    });
  }
}

/**
 * DELETE /api/patient-measures/:id
 * Delete a measure
 */
async function deleteMeasure(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    await patientMeasureService.deleteMeasure(
      req.params.id,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      message: 'Measure deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteMeasure:', error);
    const statusCode = error.message === 'Measure not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete measure'
    });
  }
}

/**
 * GET /api/visits/:visitId/measures
 * Get measures by visit
 */
async function getMeasuresByVisit(req, res) {
  try {
    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measures = await patientMeasureService.getMeasuresByVisit(
      req.params.visitId,
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: measures,
      count: measures.length
    });
  } catch (error) {
    console.error('Error in getMeasuresByVisit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch visit measures'
    });
  }
}

/**
 * GET /api/measures/patient-measures
 * Get all patient measures (optionally filtered by measure_definition_id)
 * DEV ONLY - for debugging and data inspection
 */
async function getAllPatientMeasures(req, res) {
  try {
    const { measure_definition_id, limit = 10000 } = req.query;

    const requestMetadata = {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    };

    const measures = await patientMeasureService.getAllMeasures(
      { measure_definition_id, limit: parseInt(limit) },
      req.user,
      requestMetadata
    );

    res.json({
      success: true,
      data: measures,
      count: measures.length
    });
  } catch (error) {
    console.error('Error in getAllPatientMeasures:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch all patient measures'
    });
  }
}

module.exports = {
  logMeasure,
  getMeasures,
  getMeasureHistory,
  updateMeasure,
  deleteMeasure,
  getMeasuresByVisit,
  getAllPatientMeasures
};
