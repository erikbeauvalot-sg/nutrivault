/**
 * Query Validator Factory
 *
 * Generates express-validator validation chains for query parameters
 * based on QueryBuilder configurations.
 *
 * @module queryValidator
 */

const { query } = require('express-validator');

/**
 * Operators that can be applied to filterable fields
 */
const OPERATORS = ['_gt', '_gte', '_lt', '_lte', '_eq', '_ne', '_in', '_between', '_null', '_not_null', '_like', '_ilike'];

/**
 * Create query parameter validators based on configuration
 * @param {Object} config - Query configuration from queryConfigs.js
 * @param {Function} handleValidationErrors - Error handling middleware
 * @returns {Array} - Array of express-validator validation chains
 */
function createQueryValidator(config, handleValidationErrors) {
  const validators = [];

  // Search validator
  if (config.searchFields && config.searchFields.length > 0) {
    validators.push(
      query('search')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Search term must not exceed 500 characters')
    );
  }

  // Filterable field validators
  Object.keys(config.filterableFields).forEach(fieldName => {
    const fieldConfig = config.filterableFields[fieldName];

    // Add validator for exact match (no suffix)
    validators.push(...createFieldValidator(fieldName, fieldConfig, null));

    // Add validators for each operator
    OPERATORS.forEach(operator => {
      // Skip operators that don't make sense for certain types
      if (shouldSkipOperator(fieldConfig.type, operator)) {
        return;
      }

      validators.push(...createFieldValidator(fieldName, fieldConfig, operator));
    });
  });

  // Pagination validators
  validators.push(
    query('limit')
      .optional()
      .isInt({ min: 1, max: config.maxLimit || 100 })
      .withMessage(`Limit must be between 1 and ${config.maxLimit || 100}`)
  );

  validators.push(
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be 0 or greater')
  );

  // Sort validators
  if (config.sortableFields && config.sortableFields.length > 0) {
    validators.push(
      query('sort_by')
        .optional()
        .isIn(config.sortableFields)
        .withMessage(`Invalid sort_by field. Must be one of: ${config.sortableFields.join(', ')}`)
    );
  }

  validators.push(
    query('sort_order')
      .optional()
      .isIn(['ASC', 'DESC', 'asc', 'desc'])
      .withMessage('Sort order must be ASC or DESC')
  );

  // Add error handler at the end
  if (handleValidationErrors) {
    validators.push(handleValidationErrors);
  }

  return validators;
}

/**
 * Create validator chain for a specific field and operator
 * @param {string} fieldName - Name of the field
 * @param {Object} fieldConfig - Field configuration { type, values }
 * @param {string|null} operator - Operator suffix (e.g., '_gt') or null for exact match
 * @returns {Array} - Array of validation chains for this field/operator combo
 */
function createFieldValidator(fieldName, fieldConfig, operator) {
  const paramName = operator ? `${fieldName}${operator}` : fieldName;
  const { type, values: enumValues } = fieldConfig;

  // Special handling for null operators
  if (operator === '_null' || operator === '_not_null') {
    return [
      query(paramName)
        .optional()
        .isString()
        .isIn(['true', 'false', '1', '0', 'TRUE', 'FALSE'])
        .withMessage(`${paramName} must be a boolean (true, false, 1, or 0)`)
    ];
  }

  // Build validator based on type
  switch (type) {
    case 'uuid':
      return createUUIDValidator(paramName, operator);

    case 'date':
      return createDateValidator(paramName, operator);

    case 'boolean':
      return createBooleanValidator(paramName, operator);

    case 'integer':
      return createIntegerValidator(paramName, operator);

    case 'float':
      return createFloatValidator(paramName, operator);

    case 'enum':
      return createEnumValidator(paramName, enumValues, operator);

    case 'string':
    default:
      return createStringValidator(paramName, operator);
  }
}

/**
 * Create UUID validator
 */
function createUUIDValidator(paramName, operator) {
  if (operator === '_in') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const values = value.split(',').map(v => v.trim());
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (values.length > 100) {
            throw new Error('Maximum 100 UUIDs allowed');
          }
          values.forEach(v => {
            if (!uuidRegex.test(v)) {
              throw new Error(`Invalid UUID: ${v}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} must be comma-separated valid UUIDs`)
    ];
  }

  return [
    query(paramName)
      .optional()
      .isUUID()
      .withMessage(`${paramName} must be a valid UUID`)
  ];
}

/**
 * Create date validator
 */
function createDateValidator(paramName, operator) {
  if (operator === '_in') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const values = value.split(',').map(v => v.trim());
          if (values.length > 100) {
            throw new Error('Maximum 100 dates allowed');
          }
          values.forEach(v => {
            const date = new Date(v);
            if (isNaN(date.getTime())) {
              throw new Error(`Invalid date: ${v}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} must be comma-separated valid dates`)
    ];
  }

  if (operator === '_between') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const parts = value.split(',');
          if (parts.length !== 2) {
            throw new Error('Must provide exactly 2 comma-separated dates');
          }
          parts.forEach(v => {
            const date = new Date(v.trim());
            if (isNaN(date.getTime())) {
              throw new Error(`Invalid date: ${v}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} must be 2 comma-separated valid dates`)
    ];
  }

  return [
    query(paramName)
      .optional()
      .isISO8601()
      .withMessage(`${paramName} must be a valid date`)
  ];
}

/**
 * Create boolean validator
 */
function createBooleanValidator(paramName, operator) {
  return [
    query(paramName)
      .optional()
      .isString()
      .isIn(['true', 'false', '1', '0', 'TRUE', 'FALSE'])
      .withMessage(`${paramName} must be a boolean (true, false, 1, or 0)`)
  ];
}

/**
 * Create integer validator
 */
function createIntegerValidator(paramName, operator) {
  if (operator === '_in') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const values = value.split(',').map(v => v.trim());
          if (values.length > 100) {
            throw new Error('Maximum 100 values allowed');
          }
          values.forEach(v => {
            const num = parseInt(v, 10);
            if (isNaN(num)) {
              throw new Error(`Invalid integer: ${v}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} must be comma-separated integers`)
    ];
  }

  if (operator === '_between') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const parts = value.split(',');
          if (parts.length !== 2) {
            throw new Error('Must provide exactly 2 comma-separated integers');
          }
          parts.forEach(v => {
            const num = parseInt(v.trim(), 10);
            if (isNaN(num)) {
              throw new Error(`Invalid integer: ${v}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} must be 2 comma-separated integers`)
    ];
  }

  return [
    query(paramName)
      .optional()
      .isInt()
      .withMessage(`${paramName} must be an integer`)
  ];
}

/**
 * Create float validator
 */
function createFloatValidator(paramName, operator) {
  if (operator === '_in') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const values = value.split(',').map(v => v.trim());
          if (values.length > 100) {
            throw new Error('Maximum 100 values allowed');
          }
          values.forEach(v => {
            const num = parseFloat(v);
            if (isNaN(num)) {
              throw new Error(`Invalid number: ${v}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} must be comma-separated numbers`)
    ];
  }

  if (operator === '_between') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const parts = value.split(',');
          if (parts.length !== 2) {
            throw new Error('Must provide exactly 2 comma-separated numbers');
          }
          parts.forEach(v => {
            const num = parseFloat(v.trim());
            if (isNaN(num)) {
              throw new Error(`Invalid number: ${v}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} must be 2 comma-separated numbers`)
    ];
  }

  return [
    query(paramName)
      .optional()
      .isFloat()
      .withMessage(`${paramName} must be a number`)
  ];
}

/**
 * Create enum validator
 */
function createEnumValidator(paramName, enumValues, operator) {
  if (!enumValues || enumValues.length === 0) {
    // Fallback to string validator if enum values not provided
    return createStringValidator(paramName, operator);
  }

  if (operator === '_in') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const values = value.split(',').map(v => v.trim().toUpperCase());
          if (values.length > 100) {
            throw new Error('Maximum 100 values allowed');
          }
          values.forEach(v => {
            if (!enumValues.includes(v)) {
              throw new Error(`Invalid value: ${v}. Must be one of: ${enumValues.join(', ')}`);
            }
          });
          return true;
        })
        .withMessage(`${paramName} values must be from: ${enumValues.join(', ')}`)
    ];
  }

  return [
    query(paramName)
      .optional()
      .isString()
      .toUpperCase()
      .isIn(enumValues)
      .withMessage(`${paramName} must be one of: ${enumValues.join(', ')}`)
  ];
}

/**
 * Create string validator
 */
function createStringValidator(paramName, operator) {
  if (operator === '_in') {
    return [
      query(paramName)
        .optional()
        .isString()
        .custom(value => {
          const values = value.split(',');
          if (values.length > 100) {
            throw new Error('Maximum 100 values allowed');
          }
          return true;
        })
        .withMessage(`${paramName} must be comma-separated strings (max 100)`)
    ];
  }

  return [
    query(paramName)
      .optional()
      .isString()
      .trim()
      .isLength({ max: 255 })
      .withMessage(`${paramName} must be a string (max 255 characters)`)
  ];
}

/**
 * Determine if an operator should be skipped for a given type
 * @param {string} type - Field type
 * @param {string} operator - Operator suffix
 * @returns {boolean} - True if operator should be skipped
 */
function shouldSkipOperator(type, operator) {
  // Boolean fields don't support comparison operators
  if (type === 'boolean') {
    return ['_gt', '_gte', '_lt', '_lte', '_between', '_like', '_ilike'].includes(operator);
  }

  // String/enum fields don't support numeric comparison operators (but do support _like, _ilike)
  if (type === 'string' || type === 'enum') {
    return ['_gt', '_gte', '_lt', '_lte', '_between'].includes(operator);
  }

  // UUID fields don't support comparison or string operators
  if (type === 'uuid') {
    return ['_gt', '_gte', '_lt', '_lte', '_between', '_like', '_ilike'].includes(operator);
  }

  // Numeric and date fields don't support string operators
  if (type === 'integer' || type === 'float' || type === 'date') {
    return ['_like', '_ilike'].includes(operator);
  }

  return false;
}

module.exports = {
  createQueryValidator,
  OPERATORS
};
