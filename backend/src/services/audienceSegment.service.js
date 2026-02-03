/**
 * Audience Segmentation Service
 * Builds Sequelize queries based on audience criteria for campaign targeting
 */

const { Op } = require('sequelize');
const db = require('../../../models');
const { Patient, PatientTag, Visit, User, PatientCustomFieldValue, CustomFieldDefinition } = db;
const { fn, col, literal } = db.sequelize;

/**
 * Available operators for different field types
 */
const OPERATORS = {
  boolean: ['equals'],
  string: ['equals', 'not_equals', 'in', 'not_in', 'contains', 'not_contains'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'between'],
  date: ['equals', 'before', 'after', 'between'],
  array: ['contains', 'not_contains', 'contains_any', 'contains_all']
};

/**
 * Field definitions for audience segmentation
 */
const SEGMENT_FIELDS = {
  // Patient status fields
  is_active: {
    type: 'boolean',
    label: 'Patient actif',
    field: 'is_active'
  },
  appointment_reminders_enabled: {
    type: 'boolean',
    label: 'Accepte les emails',
    field: 'appointment_reminders_enabled'
  },
  // Language
  language_preference: {
    type: 'string',
    label: 'Langue préférée',
    field: 'language_preference',
    options: ['fr', 'en', 'es', 'nl', 'de']
  },
  // Linked dietitian (via M2M patient_dietitians)
  linked_dietitian_id: {
    type: 'string',
    label: 'Diététicien lié',
    field: 'linked_dietitian_id',
    isRelation: true
  },
  // Tags
  tags: {
    type: 'array',
    label: 'Tags',
    field: 'tags',
    isRelation: true
  },
  // Visit-related
  last_visit_date: {
    type: 'date',
    label: 'Dernière visite',
    field: 'last_visit_date',
    isComputed: true
  },
  visit_count: {
    type: 'number',
    label: 'Nombre de visites',
    field: 'visit_count',
    isComputed: true
  },
  // Patient creation
  created_at: {
    type: 'date',
    label: "Date d'inscription",
    field: 'created_at'
  },
  // Custom fields (dynamic)
  custom_field: {
    type: 'dynamic',
    label: 'Champ personnalisé',
    isDynamic: true
  }
};

/**
 * Build a WHERE clause from a single condition
 * @param {Object} condition - Condition object with field, operator, value
 * @returns {Object} Sequelize where clause part
 */
function buildConditionClause(condition) {
  const { field, operator, value, customFieldId } = condition;

  // Handle custom fields separately
  if (field === 'custom_field') {
    return buildCustomFieldCondition(customFieldId, operator, value);
  }

  const fieldDef = SEGMENT_FIELDS[field];
  if (!fieldDef) {
    throw new Error(`Unknown segment field: ${field}`);
  }

  // Build operator clause based on type
  switch (operator) {
    case 'equals':
      return { [fieldDef.field]: value };

    case 'not_equals':
      return { [fieldDef.field]: { [Op.ne]: value } };

    case 'in':
      return { [fieldDef.field]: { [Op.in]: Array.isArray(value) ? value : [value] } };

    case 'not_in':
      return { [fieldDef.field]: { [Op.notIn]: Array.isArray(value) ? value : [value] } };

    case 'contains':
      return { [fieldDef.field]: { [Op.like]: `%${value}%` } };

    case 'not_contains':
      return { [fieldDef.field]: { [Op.notLike]: `%${value}%` } };

    case 'greater_than':
      return { [fieldDef.field]: { [Op.gt]: value } };

    case 'less_than':
      return { [fieldDef.field]: { [Op.lt]: value } };

    case 'before':
      return { [fieldDef.field]: { [Op.lt]: new Date(value) } };

    case 'after':
      return { [fieldDef.field]: { [Op.gt]: new Date(value) } };

    case 'between':
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('Between operator requires array with 2 values');
      }
      return {
        [fieldDef.field]: {
          [Op.between]: fieldDef.type === 'date'
            ? [new Date(value[0]), new Date(value[1])]
            : value
        }
      };

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Build condition for custom field values
 */
function buildCustomFieldCondition(customFieldId, operator, value) {
  // This will be handled via include/subquery
  return {
    customFieldCondition: {
      customFieldId,
      operator,
      value
    }
  };
}

/**
 * Build Sequelize query options from audience criteria
 * @param {Object} criteria - Audience criteria object
 * @returns {Object} Sequelize query options
 */
async function buildAudienceQuery(criteria) {
  const { conditions = [], logic = 'AND' } = criteria;

  if (!conditions || conditions.length === 0) {
    // No conditions = all active patients with email who accept emails
    return {
      where: {
        is_active: true,
        appointment_reminders_enabled: true,
        email: { [Op.ne]: null }
      },
      include: []
    };
  }

  const whereConditions = [];
  const includeOptions = [];
  const customFieldConditions = [];
  let hasTagCondition = false;
  let tagConditionValue = null;
  let tagConditionOperator = null;

  // Process each condition
  for (const condition of conditions) {
    const { field, operator, value } = condition;

    // Handle tag conditions specially (requires join)
    if (field === 'tags') {
      hasTagCondition = true;
      tagConditionValue = value;
      tagConditionOperator = operator;
      continue;
    }

    // Handle computed fields (last_visit_date, visit_count)
    if (field === 'last_visit_date' || field === 'visit_count') {
      // These require subqueries - handled separately
      continue;
    }

    // Handle custom field conditions
    if (field === 'custom_field') {
      customFieldConditions.push({
        customFieldId: condition.customFieldId,
        operator,
        value
      });
      continue;
    }

    // Handle linked_dietitian_id via M2M patient_dietitians
    if (field === 'linked_dietitian_id' || field === 'assigned_dietitian_id') {
      const dietitianValues = Array.isArray(value) ? value : [value];
      const linkedPatients = await db.PatientDietitian.findAll({
        where: { dietitian_id: { [Op.in]: dietitianValues } },
        attributes: ['patient_id']
      });
      const linkedIds = [...new Set(linkedPatients.map(l => l.patient_id))];
      if (operator === 'equals' || operator === 'in') {
        whereConditions.push({ id: { [Op.in]: linkedIds } });
      } else if (operator === 'not_equals') {
        whereConditions.push({ id: { [Op.notIn]: linkedIds } });
      }
      continue;
    }

    // Build standard condition clause
    const clause = buildConditionClause(condition);
    if (!clause.customFieldCondition) {
      whereConditions.push(clause);
    }
  }

  // Always require email and acceptance of emails for campaigns
  whereConditions.push({
    email: { [Op.ne]: null },
    appointment_reminders_enabled: true
  });

  // Build final where clause based on logic
  const where = logic === 'OR'
    ? { [Op.or]: whereConditions }
    : { [Op.and]: whereConditions };

  // Build include for tags if needed
  if (hasTagCondition) {
    const tagInclude = {
      model: PatientTag,
      as: 'tags',
      required: tagConditionOperator === 'contains' || tagConditionOperator === 'contains_any',
      where: {}
    };

    if (tagConditionOperator === 'contains' || tagConditionOperator === 'contains_any') {
      tagInclude.where.tag_name = Array.isArray(tagConditionValue)
        ? { [Op.in]: tagConditionValue }
        : tagConditionValue;
    }

    includeOptions.push(tagInclude);
  }

  return {
    where,
    include: includeOptions,
    distinct: true
  };
}

/**
 * Get patients matching segment criteria
 * @param {Object} criteria - Audience criteria
 * @param {Object} options - Query options (limit, offset)
 * @returns {Promise<Array>} Matching patients
 */
async function getPatientsBySegment(criteria, options = {}) {
  const { limit = 100, offset = 0 } = options;
  const queryOptions = await buildAudienceQuery(criteria);

  // Handle computed field conditions (last_visit_date, visit_count)
  const { conditions = [] } = criteria;
  let patientIds = null;

  for (const condition of conditions) {
    if (condition.field === 'last_visit_date') {
      patientIds = await getPatientIdsByLastVisit(condition.operator, condition.value, patientIds);
    } else if (condition.field === 'visit_count') {
      patientIds = await getPatientIdsByVisitCount(condition.operator, condition.value, patientIds);
    } else if (condition.field === 'custom_field') {
      patientIds = await getPatientIdsByCustomField(
        condition.customFieldId,
        condition.operator,
        condition.value,
        patientIds
      );
    }
  }

  // If we have computed conditions, add patient ID filter
  if (patientIds !== null) {
    queryOptions.where = {
      [Op.and]: [
        queryOptions.where,
        { id: { [Op.in]: patientIds } }
      ]
    };
  }

  const patients = await Patient.findAll({
    ...queryOptions,
    limit,
    offset,
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
    attributes: ['id', 'first_name', 'last_name', 'email', 'language_preference', 'unsubscribe_token']
  });

  return patients;
}

/**
 * Count patients matching segment criteria
 * @param {Object} criteria - Audience criteria
 * @returns {Promise<number>} Count of matching patients
 */
async function countPatientsBySegment(criteria) {
  const queryOptions = await buildAudienceQuery(criteria);

  // Handle computed field conditions
  const { conditions = [] } = criteria;
  let patientIds = null;

  for (const condition of conditions) {
    if (condition.field === 'last_visit_date') {
      patientIds = await getPatientIdsByLastVisit(condition.operator, condition.value, patientIds);
    } else if (condition.field === 'visit_count') {
      patientIds = await getPatientIdsByVisitCount(condition.operator, condition.value, patientIds);
    } else if (condition.field === 'custom_field') {
      patientIds = await getPatientIdsByCustomField(
        condition.customFieldId,
        condition.operator,
        condition.value,
        patientIds
      );
    }
  }

  // If we have computed conditions, add patient ID filter
  if (patientIds !== null) {
    if (patientIds.length === 0) {
      return 0;
    }
    queryOptions.where = {
      [Op.and]: [
        queryOptions.where,
        { id: { [Op.in]: patientIds } }
      ]
    };
  }

  const count = await Patient.count({
    ...queryOptions,
    distinct: true,
    col: 'id'
  });

  return count;
}

/**
 * Get patient IDs filtered by last visit date
 */
async function getPatientIdsByLastVisit(operator, value, existingIds = null) {
  let dateCondition;

  switch (operator) {
    case 'before':
      dateCondition = { [Op.lt]: new Date(value) };
      break;
    case 'after':
      dateCondition = { [Op.gt]: new Date(value) };
      break;
    case 'between':
      dateCondition = { [Op.between]: [new Date(value[0]), new Date(value[1])] };
      break;
    default:
      throw new Error(`Invalid operator for last_visit_date: ${operator}`);
  }

  // Subquery to get max visit date per patient
  const results = await Visit.findAll({
    attributes: [
      'patient_id',
      [fn('MAX', col('visit_date')), 'last_visit']
    ],
    where: {
      status: { [Op.in]: ['COMPLETED', 'SCHEDULED'] },
      ...(existingIds ? { patient_id: { [Op.in]: existingIds } } : {})
    },
    group: ['patient_id'],
    having: literal(`MAX(visit_date) ${operatorToSQL(operator, value)}`),
    raw: true
  });

  return results.map(r => r.patient_id);
}

/**
 * Get patient IDs filtered by visit count
 */
async function getPatientIdsByVisitCount(operator, value, existingIds = null) {
  const results = await Visit.findAll({
    attributes: [
      'patient_id',
      [fn('COUNT', col('id')), 'visit_count']
    ],
    where: {
      status: { [Op.in]: ['COMPLETED'] },
      ...(existingIds ? { patient_id: { [Op.in]: existingIds } } : {})
    },
    group: ['patient_id'],
    having: literal(`COUNT(id) ${operatorToSQLNumeric(operator, value)}`),
    raw: true
  });

  return results.map(r => r.patient_id);
}

/**
 * Get patient IDs filtered by custom field value
 */
async function getPatientIdsByCustomField(customFieldId, operator, value, existingIds = null) {
  let valueCondition;

  switch (operator) {
    case 'equals':
      valueCondition = { value: value };
      break;
    case 'not_equals':
      valueCondition = { value: { [Op.ne]: value } };
      break;
    case 'contains':
      valueCondition = { value: { [Op.like]: `%${value}%` } };
      break;
    case 'not_contains':
      valueCondition = { value: { [Op.notLike]: `%${value}%` } };
      break;
    default:
      valueCondition = { value: value };
  }

  const results = await PatientCustomFieldValue.findAll({
    attributes: ['patient_id'],
    where: {
      field_definition_id: customFieldId,
      ...valueCondition,
      ...(existingIds ? { patient_id: { [Op.in]: existingIds } } : {})
    }
  });

  return results.map(r => r.patient_id);
}

/**
 * Convert operator to SQL for date HAVING clause
 */
function operatorToSQL(operator, value) {
  switch (operator) {
    case 'before':
      return `< '${new Date(value).toISOString()}'`;
    case 'after':
      return `> '${new Date(value).toISOString()}'`;
    case 'between':
      return `BETWEEN '${new Date(value[0]).toISOString()}' AND '${new Date(value[1]).toISOString()}'`;
    default:
      throw new Error(`Invalid operator: ${operator}`);
  }
}

/**
 * Convert operator to SQL for numeric HAVING clause
 */
function operatorToSQLNumeric(operator, value) {
  switch (operator) {
    case 'equals':
      return `= ${parseInt(value)}`;
    case 'not_equals':
      return `!= ${parseInt(value)}`;
    case 'greater_than':
      return `> ${parseInt(value)}`;
    case 'less_than':
      return `< ${parseInt(value)}`;
    case 'between':
      return `BETWEEN ${parseInt(value[0])} AND ${parseInt(value[1])}`;
    default:
      throw new Error(`Invalid operator: ${operator}`);
  }
}

/**
 * Get available segment fields with their options
 * @returns {Promise<Object>} Field definitions with dynamic options
 */
async function getAvailableSegmentFields() {
  // Get unique tags
  const tags = await PatientTag.findAll({
    attributes: ['tag_name'],
    group: ['tag_name'],
    order: [['tag_name', 'ASC']],
    raw: true
  });

  // Get dietitians
  const dietitians = await User.findAll({
    attributes: ['id', 'first_name', 'last_name'],
    where: { is_active: true },
    order: [['last_name', 'ASC']],
    raw: true
  });

  // Get custom fields (all active ones - they're all patient-related)
  const customFields = await CustomFieldDefinition.findAll({
    where: {
      is_active: true
    },
    order: [['display_order', 'ASC']],
    raw: true
  });

  return {
    fields: Object.entries(SEGMENT_FIELDS).map(([key, def]) => ({
      key,
      label: def.label,
      type: def.type,
      operators: OPERATORS[def.type] || [],
      options: def.options || null
    })),
    tags: tags.map(t => t.tag_name),
    dietitians: dietitians.map(d => ({
      id: d.id,
      name: `${d.first_name} ${d.last_name}`
    })),
    customFields: customFields.map(cf => ({
      id: cf.id,
      name: cf.field_label || cf.field_name,
      type: cf.field_type,
      options: cf.select_options
    }))
  };
}

/**
 * Preview audience for given criteria
 * Returns count and sample of matching patients
 * @param {Object} criteria - Audience criteria
 * @param {number} sampleSize - Number of sample patients to return
 * @returns {Promise<Object>} Count and sample patients
 */
async function previewAudience(criteria, sampleSize = 5) {
  const count = await countPatientsBySegment(criteria);
  const sample = await getPatientsBySegment(criteria, { limit: sampleSize });

  return {
    count,
    sample: sample.map(p => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      email: p.email,
      language: p.language_preference
    }))
  };
}

module.exports = {
  buildAudienceQuery,
  getPatientsBySegment,
  countPatientsBySegment,
  getAvailableSegmentFields,
  previewAudience,
  SEGMENT_FIELDS,
  OPERATORS
};
