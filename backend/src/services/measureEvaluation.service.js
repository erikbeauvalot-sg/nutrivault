/**
 * Measure Evaluation Service
 *
 * Handles evaluation and recalculation of calculated measures.
 * Supports cross-measure formulas (BMI = weight / height²) and
 * time-series calculations (weight change = current - previous).
 *
 * Sprint 4: US-5.4.2 - Calculated Measures
 */

const { Op } = require('sequelize');
const MeasureDefinition = require('../models/MeasureDefinition');
const PatientMeasure = require('../models/PatientMeasure');
const formulaEngine = require('./formulaEngine.service');

// Cache for calculated measure definitions
let calculatedMeasuresCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all calculated measure definitions (with caching)
 * @returns {Promise<Array>} Array of MeasureDefinition instances
 */
async function getCalculatedMeasures() {
  const now = Date.now();

  if (calculatedMeasuresCache && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL)) {
    return calculatedMeasuresCache;
  }

  const measures = await MeasureDefinition.findAll({
    where: {
      measure_type: 'calculated',
      is_active: true,
      deleted_at: null
    }
  });

  calculatedMeasuresCache = measures;
  cacheTimestamp = now;

  return measures;
}

/**
 * Clear calculated measures cache
 */
function clearCache() {
  calculatedMeasuresCache = null;
  cacheTimestamp = null;
}

/**
 * Get calculated measures that depend on a given measure
 * @param {string} measureName - Name of the measure
 * @returns {Promise<Array>} Array of dependent MeasureDefinition instances
 */
async function getDependentMeasures(measureName) {
  const calculatedMeasures = await getCalculatedMeasures();

  return calculatedMeasures.filter(measure => {
    const deps = measure.getDependencies();
    return deps.includes(measureName);
  });
}

/**
 * Topological sort for cascading calculations
 * Ensures measures are calculated in dependency order
 * @param {Array} measures - Array of MeasureDefinition instances
 * @returns {Array} Sorted array (dependencies first)
 */
function topologicalSortMeasures(measures) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  const measureMap = new Map();
  measures.forEach(m => measureMap.set(m.name, m));

  function visit(measureName) {
    if (visited.has(measureName)) return;

    if (visiting.has(measureName)) {
      // Circular dependency detected
      console.warn(`Circular dependency detected involving: ${measureName}`);
      return;
    }

    visiting.add(measureName);

    const measure = measureMap.get(measureName);
    if (measure) {
      const deps = measure.getDependencies();
      deps.forEach(dep => visit(dep));
      sorted.push(measure);
    }

    visiting.delete(measureName);
    visited.add(measureName);
  }

  measures.forEach(measure => visit(measure.name));

  return sorted;
}

/**
 * Get time-series value for a measure
 * @param {string} measureName - Name of the measure
 * @param {string} patientId - Patient UUID
 * @param {Date} measuredAt - Reference timestamp
 * @param {string} modifier - 'current', 'previous', 'delta', 'avg30', etc.
 * @returns {Promise<number|null>} Value or null
 */
async function getTimeSeriesValue(measureName, patientId, measuredAt, modifier) {
  const measureDef = await MeasureDefinition.findOne({
    where: { name: measureName, deleted_at: null }
  });

  if (!measureDef) {
    console.warn(`Measure not found: ${measureName}`);
    return null;
  }

  switch (modifier) {
    case 'current':
      return await getCurrentValue(measureDef.id, patientId, measuredAt);

    case 'previous':
      return await getPreviousValue(measureDef.id, patientId, measuredAt);

    case 'delta': {
      const current = await getCurrentValue(measureDef.id, patientId, measuredAt);
      const previous = await getPreviousValue(measureDef.id, patientId, measuredAt);
      return (current !== null && previous !== null) ? current - previous : null;
    }

    default:
      // avgN (e.g., avg30, avg60, avg90)
      if (modifier.startsWith('avg')) {
        const days = parseInt(modifier.substring(3));
        if (!isNaN(days)) {
          return await getAverageValue(measureDef.id, patientId, measuredAt, days);
        }
      }
      console.warn(`Unknown time-series modifier: ${modifier}`);
      return null;
  }
}

/**
 * Get most recent value at or before timestamp
 * @param {string} measureDefId - MeasureDefinition UUID
 * @param {string} patientId - Patient UUID
 * @param {Date} measuredAt - Reference timestamp
 * @returns {Promise<number|null>}
 */
async function getCurrentValue(measureDefId, patientId, measuredAt) {
  const measure = await PatientMeasure.findOne({
    where: {
      patient_id: patientId,
      measure_definition_id: measureDefId,
      measured_at: { [Op.lte]: measuredAt },
      deleted_at: null
    },
    order: [['measured_at', 'DESC'], ['created_at', 'DESC']],
    limit: 1
  });

  return measure ? measure.numeric_value : null;
}

/**
 * Get previous value (second-to-last before timestamp)
 * @param {string} measureDefId - MeasureDefinition UUID
 * @param {string} patientId - Patient UUID
 * @param {Date} measuredAt - Reference timestamp
 * @returns {Promise<number|null>}
 */
async function getPreviousValue(measureDefId, patientId, measuredAt) {
  const measures = await PatientMeasure.findAll({
    where: {
      patient_id: patientId,
      measure_definition_id: measureDefId,
      measured_at: { [Op.lt]: measuredAt },
      deleted_at: null
    },
    order: [['measured_at', 'DESC'], ['created_at', 'DESC']],
    limit: 2
  });

  // Return second-to-last value
  return measures.length >= 2 ? measures[1].numeric_value : null;
}

/**
 * Get N-day rolling average
 * @param {string} measureDefId - MeasureDefinition UUID
 * @param {string} patientId - Patient UUID
 * @param {Date} measuredAt - Reference timestamp
 * @param {number} days - Number of days to average
 * @returns {Promise<number|null>}
 */
async function getAverageValue(measureDefId, patientId, measuredAt, days) {
  const startDate = new Date(measuredAt);
  startDate.setDate(startDate.getDate() - days);

  const measures = await PatientMeasure.findAll({
    where: {
      patient_id: patientId,
      measure_definition_id: measureDefId,
      measured_at: {
        [Op.gte]: startDate,
        [Op.lte]: measuredAt
      },
      deleted_at: null
    }
  });

  if (measures.length === 0) return null;

  const sum = measures.reduce((acc, m) => acc + parseFloat(m.numeric_value || 0), 0);
  return sum / measures.length;
}

/**
 * Get value map for formula evaluation
 * Handles both simple variables and time-series modifiers
 * @param {Array<string>} dependencies - Measure names
 * @param {string} patientId - Patient UUID
 * @param {Date} measuredAt - Reference timestamp
 * @returns {Promise<Object>} Map of {measure_name: value}
 */
async function getValueMapForMeasures(dependencies, patientId, measuredAt) {
  const valueMap = {};

  for (const dep of dependencies) {
    // Check if dependency includes time-series modifier (e.g., "current:weight")
    if (dep.includes(':')) {
      const [modifier, measureName] = dep.split(':');
      const value = await getTimeSeriesValue(measureName, patientId, measuredAt, modifier);
      valueMap[dep] = value;
    } else {
      // Simple dependency - get value at exact timestamp
      const measureDef = await MeasureDefinition.findOne({
        where: { name: dep, deleted_at: null }
      });

      if (!measureDef) {
        console.warn(`Dependency not found: ${dep}`);
        valueMap[dep] = null;
        continue;
      }

      const measure = await PatientMeasure.findOne({
        where: {
          patient_id: patientId,
          measure_definition_id: measureDef.id,
          measured_at: measuredAt,
          deleted_at: null
        },
        order: [['created_at', 'DESC']]
      });

      valueMap[dep] = measure ? measure.numeric_value : null;
    }
  }

  return valueMap;
}

/**
 * Evaluate a calculated measure for a patient at a specific time
 * @param {Object} measureDef - MeasureDefinition instance
 * @param {string} patientId - Patient UUID
 * @param {Date} measuredAt - Timestamp for calculation
 * @param {Object} user - User triggering calculation
 * @returns {Promise<number|null>} Calculated value or null
 */
async function evaluateCalculatedMeasure(measureDef, patientId, measuredAt, user) {
  if (measureDef.measure_type !== 'calculated' || !measureDef.formula) {
    throw new Error('Measure is not a calculated type or has no formula');
  }

  // Get dependencies
  const dependencies = measureDef.getDependencies();

  // Get values for all dependencies
  const valueMap = await getValueMapForMeasures(dependencies, patientId, measuredAt);

  // Check if all dependencies have values
  const hasAllDeps = dependencies.every(dep => {
    const value = valueMap[dep];
    return value !== null && value !== undefined;
  });

  if (!hasAllDeps) {
    console.log(`Missing dependencies for ${measureDef.name}, skipping calculation`);
    return null;
  }

  // Evaluate formula
  const result = formulaEngine.evaluateFormula(
    measureDef.formula,
    valueMap,
    measureDef.decimal_places || 2
  );

  if (!result.success) {
    console.error(`Formula evaluation failed for ${measureDef.name}: ${result.error}`);
    return null;
  }

  return result.result;
}

/**
 * Recalculate dependent measures when a measure changes
 * @param {string} patientId - Patient UUID
 * @param {string} changedMeasureName - Name of measure that changed
 * @param {Date} measuredAt - Timestamp of change
 * @param {Object} user - User who recorded the change
 * @returns {Promise<Object>} { count: number, calculated: Array }
 */
async function recalculateDependentMeasures(patientId, changedMeasureName, measuredAt, user) {
  // Get all calculated measures that depend on this measure
  const dependentMeasures = await getDependentMeasures(changedMeasureName);

  if (dependentMeasures.length === 0) {
    return { count: 0, calculated: [] };
  }

  // Sort by dependencies (topological sort)
  const sortedMeasures = topologicalSortMeasures(dependentMeasures);

  const calculated = [];

  for (const measureDef of sortedMeasures) {
    try {
      const value = await evaluateCalculatedMeasure(measureDef, patientId, measuredAt, user);

      if (value !== null) {
        // Check if calculated value already exists at this timestamp
        const existing = await PatientMeasure.findOne({
          where: {
            patient_id: patientId,
            measure_definition_id: measureDef.id,
            measured_at: measuredAt,
            deleted_at: null
          }
        });

        if (existing) {
          // Update existing calculated value
          existing.numeric_value = value;
          await existing.save();
        } else {
          // Create new calculated measure
          await PatientMeasure.create({
            patient_id: patientId,
            measure_definition_id: measureDef.id,
            measured_at: measuredAt,
            numeric_value: value,
            recorded_by: user.id
          });
        }

        calculated.push({
          measure_name: measureDef.name,
          value,
          measured_at: measuredAt
        });

        console.log(`✓ Calculated ${measureDef.name} = ${value} for patient ${patientId}`);
      }
    } catch (error) {
      console.error(`Error calculating ${measureDef.name}:`, error);
    }
  }

  return { count: calculated.length, calculated };
}

/**
 * Bulk recalculate all values for a measure (when formula changes)
 * @param {string} measureDefinitionId - UUID of measure definition
 * @param {Object} user - Admin who changed formula
 * @returns {Promise<Object>} { patientsAffected: number, valuesCalculated: number }
 */
async function recalculateAllValuesForMeasure(measureDefinitionId, user) {
  const measureDef = await MeasureDefinition.findByPk(measureDefinitionId);

  if (!measureDef || measureDef.measure_type !== 'calculated') {
    throw new Error('Measure not found or not a calculated type');
  }

  console.log(`Starting bulk recalculation for ${measureDef.name}...`);

  const dependencies = measureDef.getDependencies();

  // Get all patients who have values for at least one dependency
  const patientIds = await PatientMeasure.findAll({
    attributes: ['patient_id'],
    where: {
      deleted_at: null
    },
    include: [{
      model: MeasureDefinition,
      as: 'measureDefinition',
      where: {
        name: { [Op.in]: dependencies }
      }
    }],
    group: ['patient_id'],
    raw: true
  });

  let patientsAffected = 0;
  let valuesCalculated = 0;

  for (const record of patientIds) {
    const patientId = record.patient_id;

    // Get all timestamps where dependencies have values
    const timestamps = await PatientMeasure.findAll({
      attributes: ['measured_at'],
      where: {
        patient_id: patientId,
        deleted_at: null
      },
      include: [{
        model: MeasureDefinition,
        as: 'measureDefinition',
        where: {
          name: { [Op.in]: dependencies }
        }
      }],
      group: ['measured_at'],
      order: [['measured_at', 'ASC']],
      raw: true
    });

    let calculatedForPatient = 0;

    for (const record of timestamps) {
      const measuredAt = new Date(record.measured_at);

      try {
        const value = await evaluateCalculatedMeasure(measureDef, patientId, measuredAt, user);

        if (value !== null) {
          // Delete old calculated value at this timestamp
          await PatientMeasure.destroy({
            where: {
              patient_id: patientId,
              measure_definition_id: measureDef.id,
              measured_at: measuredAt
            }
          });

          // Create new calculated value
          await PatientMeasure.create({
            patient_id: patientId,
            measure_definition_id: measureDef.id,
            measured_at: measuredAt,
            numeric_value: value,
            recorded_by: user.id
          });

          calculatedForPatient++;
          valuesCalculated++;
        }
      } catch (error) {
        console.error(`Error recalculating for patient ${patientId} at ${measuredAt}:`, error);
      }
    }

    if (calculatedForPatient > 0) {
      patientsAffected++;
    }
  }

  console.log(`✓ Bulk recalculation complete: ${patientsAffected} patients, ${valuesCalculated} values`);

  return { patientsAffected, valuesCalculated };
}

module.exports = {
  getCalculatedMeasures,
  clearCache,
  getDependentMeasures,
  topologicalSortMeasures,
  getTimeSeriesValue,
  getCurrentValue,
  getPreviousValue,
  getAverageValue,
  getValueMapForMeasures,
  evaluateCalculatedMeasure,
  recalculateDependentMeasures,
  recalculateAllValuesForMeasure
};
