/**
 * Patient Measure Controller
 *
 * Handles HTTP requests for patient measures.
 * Sprint 3: US-5.3.2 - Log Measure Values
 */

const patientMeasureService = require('../services/patientMeasure.service');
const trendAnalysisService = require('../services/trendAnalysis.service');
const db = require('../../../models');
const { Op } = require('sequelize');
const PatientMeasure = db.PatientMeasure;
const MeasureDefinition = db.MeasureDefinition;
const Patient = db.Patient;

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

/**
 * POST /api/patients/:patientId/measures/compare
 * Compare multiple measures for a patient
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 2)
 */
async function compareMeasures(req, res) {
  try {
    const { patientId } = req.params;
    const { measureDefinitionIds, start_date, end_date, normalize = false } = req.body;

    // Validate input
    if (!measureDefinitionIds || !Array.isArray(measureDefinitionIds) || measureDefinitionIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 measure definition IDs are required'
      });
    }

    if (measureDefinitionIds.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 5 measures can be compared at once'
      });
    }

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Default date range (365 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 365);

    const dateRange = {
      [Op.gte]: start_date ? new Date(start_date) : defaultStartDate,
      [Op.lte]: end_date ? new Date(end_date) : defaultEndDate
    };

    // Fetch all measures for comparison
    const measuresData = [];

    for (const measureDefId of measureDefinitionIds) {
      // Get measure definition
      const measureDef = await MeasureDefinition.findByPk(measureDefId);
      if (!measureDef) {
        continue; // Skip invalid measure definitions
      }

      // Only numeric measures can be compared
      if (measureDef.measure_type !== 'numeric' && measureDef.measure_type !== 'calculated') {
        continue;
      }

      // Fetch measure values
      const measures = await PatientMeasure.findAll({
        where: {
          patient_id: patientId,
          measure_definition_id: measureDefId,
          measured_at: dateRange
        },
        order: [['measured_at', 'ASC']],
        attributes: ['id', 'measured_at', 'numeric_value'],
        limit: 1000
      });

      if (measures.length > 0) {
        const data = measures.map(m => ({
          date: m.measured_at,
          value: m.numeric_value
        }));

        measuresData.push({
          measureDefinitionId: measureDefId,
          name: measureDef.name,
          displayName: measureDef.display_name,
          unit: measureDef.unit,
          data,
          count: data.length
        });
      }
    }

    if (measuresData.length < 2) {
      return res.json({
        success: true,
        data: {
          measures: [],
          normalized: null,
          correlations: [],
          message: 'Insufficient data for comparison (need at least 2 measures with data)'
        }
      });
    }

    // Normalize if requested
    let normalized = null;
    if (normalize) {
      normalized = trendAnalysisService.normalizeMultipleMeasures(measuresData);
    }

    // Calculate correlations between measures
    const correlations = [];
    for (let i = 0; i < measuresData.length; i++) {
      for (let j = i + 1; j < measuresData.length; j++) {
        const measure1 = measuresData[i];
        const measure2 = measuresData[j];

        // Find common dates for correlation
        const commonDates = new Set();
        measure1.data.forEach(d => commonDates.add(d.date.toISOString()));

        const values1 = [];
        const values2 = [];

        measure1.data.forEach(d1 => {
          const dateStr = d1.date.toISOString();
          const d2 = measure2.data.find(d => d.date.toISOString() === dateStr);
          if (d2) {
            values1.push(d1.value);
            values2.push(d2.value);
          }
        });

        if (values1.length >= 3) {
          const correlation = trendAnalysisService.calculateCorrelation(values1, values2);
          correlations.push({
            measure1: measure1.displayName,
            measure2: measure2.displayName,
            correlation: correlation,
            dataPoints: values1.length,
            strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
            direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none'
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        measures: measuresData,
        normalized,
        correlations,
        dateRange: {
          start: start_date || defaultStartDate.toISOString(),
          end: end_date || defaultEndDate.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error in compareMeasures:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare measures'
    });
  }
}

/**
 * GET /api/patients/:patientId/measures/:measureDefId/trend
 * Get trend analysis for a specific measure
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts
 */
async function getTrend(req, res) {
  try {
    const { patientId, measureDefId } = req.params;
    const {
      start_date,
      end_date,
      includeMA = 'true',
      includeTrendLine = 'true'
    } = req.query;

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Verify measure definition exists
    const measureDef = await MeasureDefinition.findByPk(measureDefId);
    if (!measureDef) {
      return res.status(404).json({
        success: false,
        error: 'Measure definition not found'
      });
    }

    // Only numeric measures can have trend analysis
    if (measureDef.measure_type !== 'numeric' && measureDef.measure_type !== 'calculated') {
      return res.status(400).json({
        success: false,
        error: 'Trend analysis is only available for numeric measures'
      });
    }

    // Build query
    const where = {
      patient_id: patientId,
      measure_definition_id: measureDefId
    };

    // Apply date range (default to last 365 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 365);

    where.measured_at = {
      [Op.gte]: start_date ? new Date(start_date) : defaultStartDate,
      [Op.lte]: end_date ? new Date(end_date) : defaultEndDate
    };

    // Fetch measures
    const measures = await PatientMeasure.findAll({
      where,
      order: [['measured_at', 'ASC']],
      attributes: ['id', 'measured_at', 'numeric_value', 'notes'],
      limit: 1000 // Performance limit
    });

    if (measures.length === 0) {
      return res.json({
        success: true,
        data: {
          data: [],
          trend: null,
          movingAverages: {},
          trendLine: null,
          statistics: null,
          message: 'No data available for the selected period'
        }
      });
    }

    // Extract values and dates
    const values = measures.map(m => m.numeric_value);
    const dates = measures.map(m => m.measured_at);

    // Calculate trend metrics
    const trend = trendAnalysisService.calculateTrendMetrics(values, dates);

    // Calculate moving averages (if requested)
    let movingAverages = {};
    if (includeMA === 'true') {
      movingAverages = trendAnalysisService.calculateMovingAverages(values, dates);
    }

    // Calculate trend line (if requested)
    let trendLine = null;
    if (includeTrendLine === 'true') {
      trendLine = trendAnalysisService.calculateTrendLine(values, dates);
    }

    // Calculate statistics
    const statistics = trendAnalysisService.calculateStatistics(values);

    // Format data with outlier flags
    const data = measures.map((measure, index) => {
      const isOutlier = statistics.outliers.some(o => o.index === index);
      return {
        id: measure.id,
        measured_at: measure.measured_at,
        value: measure.numeric_value,
        notes: measure.notes,
        isOutlier
      };
    });

    // Build response
    const response = {
      success: true,
      data: {
        data,
        trend,
        movingAverages,
        trendLine,
        statistics,
        measureDefinition: {
          id: measureDef.id,
          name: measureDef.name,
          display_name: measureDef.display_name,
          unit: measureDef.unit,
          measure_type: measureDef.measure_type
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in getTrend:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to calculate trend analysis'
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
  getAllPatientMeasures,
  getTrend,
  compareMeasures
};
