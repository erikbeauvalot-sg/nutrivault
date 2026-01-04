/**
 * QueryBuilder Utility
 *
 * Centralized query building utility for advanced filtering, searching,
 * pagination, and sorting across all API endpoints.
 *
 * Supports:
 * - Advanced operators: _gt, _gte, _lt, _lte, _eq, _ne, _in, _between, _null, _not_null, _like, _ilike
 * - Type conversion: UUID, date, boolean, integer, float, enum, string
 * - Multi-field search with OR logic
 * - Pagination (limit/offset) and sorting (sort_by/sort_order)
 * - Backward compatibility with existing query parameters
 *
 * @module queryBuilder
 */

const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');

/**
 * QueryBuilder class for building complex database queries
 */
class QueryBuilder {
  /**
   * Create a QueryBuilder instance
   * @param {Object} config - Configuration object
   * @param {string[]} config.searchFields - Fields to search across (for multi-field search)
   * @param {Object} config.filterableFields - Filterable fields with type definitions
   * @param {string[]} config.sortableFields - Fields that can be sorted
   * @param {Object} config.defaultSort - Default sort configuration { field, order }
   * @param {number} config.maxLimit - Maximum records per page (default: 100)
   */
  constructor(config) {
    this.searchFields = config.searchFields || [];
    this.filterableFields = config.filterableFields || {};
    this.sortableFields = config.sortableFields || [];
    this.defaultSort = config.defaultSort || { field: 'created_at', order: 'DESC' };
    this.maxLimit = config.maxLimit || 100;
  }

  /**
   * Build query object from query parameters
   * @param {Object} queryParams - Raw query parameters from request
   * @returns {Object} - { where, pagination, sort }
   */
  build(queryParams) {
    // Handle null/undefined queryParams
    if (!queryParams) {
      queryParams = {};
    }

    const where = {};

    // Build search filter
    if (queryParams.search && this.searchFields.length > 0) {
      const searchFilter = this._buildSearch(queryParams.search);
      Object.assign(where, searchFilter);
    }

    // Build field filters
    Object.keys(queryParams).forEach(key => {
      // Skip special parameters
      if (['search', 'limit', 'offset', 'sort_by', 'sort_order'].includes(key)) {
        return;
      }

      const parsed = this._parseFieldOperator(key, queryParams[key]);
      if (parsed) {
        this._applyFilter(where, parsed);
      }
    });

    // Build pagination
    const pagination = this._buildPagination(queryParams);

    // Build sort
    const sort = this._buildSort(queryParams);

    return { where, pagination, sort };
  }

  /**
   * Parse field name and operator from parameter key
   * @param {string} key - Parameter key (e.g., 'amount_gt', 'status_in')
   * @param {*} value - Parameter value
   * @returns {Object|null} - { field, operator, value, fieldConfig } or null if not filterable
   */
  _parseFieldOperator(key, value) {
    // Check for operator suffix (order matters - check longer operators first!)
    const operators = ['_not_null', '_between', '_ilike', '_null', '_like', '_gte', '_lte', '_gt', '_lt', '_eq', '_ne', '_in'];

    let field = key;
    let operator = 'eq'; // Default to equality (no underscore)

    for (const op of operators) {
      if (key.endsWith(op)) {
        field = key.slice(0, -op.length);
        operator = op.slice(1); // Remove leading underscore
        break;
      }
    }

    // Check if field is filterable
    const fieldConfig = this.filterableFields[field];
    if (!fieldConfig) {
      // Not a configured filterable field - ignore silently for backward compatibility
      return null;
    }

    return { field, operator, value, fieldConfig };
  }

  /**
   * Apply filter to where clause
   * @param {Object} where - Sequelize where clause object
   * @param {Object} parsed - Parsed field/operator/value
   */
  _applyFilter(where, parsed) {
    const { field, operator, value, fieldConfig } = parsed;

    // Handle null operators
    if (operator === 'null' || operator === 'not_null') {
      const isNull = this._parseBoolean(value);
      if (isNull === null) {
        throw new AppError(`Invalid boolean value for ${field}_${operator}`, 400, 'INVALID_FILTER');
      }

      if (operator === 'null') {
        where[field] = isNull ? { [Op.is]: null } : { [Op.not]: null };
      } else {
        where[field] = isNull ? { [Op.not]: null } : { [Op.is]: null };
      }
      return;
    }

    // Convert and validate value based on type
    let convertedValue;
    try {
      convertedValue = this._convertType(value, fieldConfig, operator);
    } catch (error) {
      throw new AppError(error.message, 400, 'INVALID_FILTER');
    }

    // Apply operator
    let filterValue;
    switch (operator) {
      case 'eq':
        filterValue = convertedValue;
        break;
      case 'ne':
        filterValue = { [Op.ne]: convertedValue };
        break;
      case 'gt':
        filterValue = { [Op.gt]: convertedValue };
        break;
      case 'gte':
        filterValue = { [Op.gte]: convertedValue };
        break;
      case 'lt':
        filterValue = { [Op.lt]: convertedValue };
        break;
      case 'lte':
        filterValue = { [Op.lte]: convertedValue };
        break;
      case 'in':
        filterValue = { [Op.in]: convertedValue };
        break;
      case 'between':
        filterValue = { [Op.between]: convertedValue };
        break;
      case 'like':
        filterValue = { [Op.like]: `%${convertedValue}%` };
        break;
      case 'ilike':
        filterValue = { [Op.iLike]: `%${convertedValue}%` };
        break;
      default:
        throw new AppError(`Unsupported operator: ${operator}`, 400, 'INVALID_OPERATOR');
    }

    // Merge with existing field conditions to support multiple operators on same field
    if (where[field] !== undefined && typeof where[field] === 'object' && where[field] !== null &&
        typeof filterValue === 'object' && filterValue !== null && !Array.isArray(filterValue)) {
      // Both are operator objects - merge them
      Object.assign(where[field], filterValue);
    } else {
      // Simple assignment
      where[field] = filterValue;
    }
  }

  /**
   * Convert value to appropriate type
   * @param {*} value - Raw value from query parameter
   * @param {Object} fieldConfig - Field configuration { type, values }
   * @param {string} operator - Operator being used
   * @returns {*} - Converted value
   */
  _convertType(value, fieldConfig, operator) {
    const { type, values: enumValues } = fieldConfig;

    switch (type) {
      case 'uuid':
        return this._convertUUID(value, operator);

      case 'date':
        return this._convertDate(value, operator);

      case 'boolean':
        const bool = this._parseBoolean(value);
        if (bool === null) {
          throw new Error(`Invalid boolean value: ${value}`);
        }
        return bool;

      case 'integer':
        return this._convertInteger(value, operator);

      case 'float':
        return this._convertFloat(value, operator);

      case 'enum':
        return this._convertEnum(value, enumValues, operator);

      case 'string':
      default:
        return this._convertString(value, operator);
    }
  }

  /**
   * Convert UUID value(s)
   */
  _convertUUID(value, operator) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (operator === 'in') {
      const values = value.split(',').map(v => v.trim());
      if (values.length > 100) {
        throw new Error('Maximum 100 values allowed for _in operator');
      }
      values.forEach(v => {
        if (!uuidRegex.test(v)) {
          throw new Error(`Invalid UUID: ${v}`);
        }
      });
      return values;
    }

    if (!uuidRegex.test(value)) {
      throw new Error(`Invalid UUID: ${value}`);
    }
    return value;
  }

  /**
   * Convert date value(s)
   */
  _convertDate(value, operator) {
    if (operator === 'in') {
      const values = value.split(',').map(v => {
        const date = new Date(v.trim());
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${v}`);
        }
        return date;
      });
      if (values.length > 100) {
        throw new Error('Maximum 100 values allowed for _in operator');
      }
      return values;
    }

    if (operator === 'between') {
      const parts = value.split(',');
      if (parts.length !== 2) {
        throw new Error('_between requires exactly 2 comma-separated dates');
      }
      const dates = parts.map(v => {
        const date = new Date(v.trim());
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${v}`);
        }
        return date;
      });
      return dates;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${value}`);
    }
    return date;
  }

  /**
   * Convert integer value(s)
   */
  _convertInteger(value, operator) {
    if (operator === 'in') {
      const values = value.split(',').map(v => {
        const num = parseInt(v.trim(), 10);
        if (isNaN(num)) {
          throw new Error(`Invalid integer: ${v}`);
        }
        return num;
      });
      if (values.length > 100) {
        throw new Error('Maximum 100 values allowed for _in operator');
      }
      return values;
    }

    if (operator === 'between') {
      const parts = value.split(',');
      if (parts.length !== 2) {
        throw new Error('_between requires exactly 2 comma-separated values');
      }
      const numbers = parts.map(v => {
        const num = parseInt(v.trim(), 10);
        if (isNaN(num)) {
          throw new Error(`Invalid integer: ${v}`);
        }
        return num;
      });
      return numbers;
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Invalid integer: ${value}`);
    }
    return num;
  }

  /**
   * Convert float value(s)
   */
  _convertFloat(value, operator) {
    if (operator === 'in') {
      const values = value.split(',').map(v => {
        const num = parseFloat(v.trim());
        if (isNaN(num)) {
          throw new Error(`Invalid number: ${v}`);
        }
        return num;
      });
      if (values.length > 100) {
        throw new Error('Maximum 100 values allowed for _in operator');
      }
      return values;
    }

    if (operator === 'between') {
      const parts = value.split(',');
      if (parts.length !== 2) {
        throw new Error('_between requires exactly 2 comma-separated values');
      }
      const numbers = parts.map(v => {
        const num = parseFloat(v.trim());
        if (isNaN(num)) {
          throw new Error(`Invalid number: ${v}`);
        }
        return num;
      });
      return numbers;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${value}`);
    }
    return num;
  }

  /**
   * Convert enum value(s)
   */
  _convertEnum(value, enumValues, operator) {
    if (!enumValues || enumValues.length === 0) {
      throw new Error('Enum values not configured');
    }

    if (operator === 'in') {
      const values = value.split(',').map(v => v.trim().toUpperCase());
      if (values.length > 100) {
        throw new Error('Maximum 100 values allowed for _in operator');
      }
      values.forEach(v => {
        if (!enumValues.includes(v)) {
          throw new Error(`Invalid enum value: ${v}. Must be one of: ${enumValues.join(', ')}`);
        }
      });
      return values;
    }

    const upperValue = value.toUpperCase();
    if (!enumValues.includes(upperValue)) {
      throw new Error(`Invalid enum value: ${value}. Must be one of: ${enumValues.join(', ')}`);
    }
    return upperValue;
  }

  /**
   * Convert string value(s)
   */
  _convertString(value, operator) {
    if (operator === 'in') {
      const values = value.split(',').map(v => v.trim());
      if (values.length > 100) {
        throw new Error('Maximum 100 values allowed for _in operator');
      }
      return values;
    }

    return value;
  }

  /**
   * Parse boolean value
   * @param {*} value - Value to parse
   * @returns {boolean|null} - Parsed boolean or null if invalid
   */
  _parseBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }

    return null;
  }

  /**
   * Build search filter for multi-field search
   * @param {string} searchTerm - Search term
   * @returns {Object} - Sequelize where clause with OR conditions
   */
  _buildSearch(searchTerm) {
    if (!searchTerm || this.searchFields.length === 0) {
      return {};
    }

    const trimmed = searchTerm.trim();
    if (trimmed.length === 0) {
      return {};
    }

    const searchConditions = this.searchFields.map(field => ({
      [field]: { [Op.like]: `%${trimmed}%` }
    }));

    return { [Op.or]: searchConditions };
  }

  /**
   * Build pagination object
   * @param {Object} queryParams - Query parameters
   * @returns {Object} - { limit, offset }
   */
  _buildPagination(queryParams) {
    let limit = parseInt(queryParams.limit, 10);
    let offset = parseInt(queryParams.offset, 10);

    // Validate and apply defaults
    if (isNaN(limit) || limit <= 0) {
      limit = 10; // Default limit
    }

    if (limit > this.maxLimit) {
      limit = this.maxLimit;
    }

    if (isNaN(offset) || offset < 0) {
      offset = 0;
    }

    return { limit, offset };
  }

  /**
   * Build sort array for Sequelize
   * @param {Object} queryParams - Query parameters
   * @returns {Array} - Sequelize order array
   */
  _buildSort(queryParams) {
    let sortBy = queryParams.sort_by || this.defaultSort.field;
    let sortOrder = queryParams.sort_order || this.defaultSort.order;

    // Validate sort field
    if (!this.sortableFields.includes(sortBy)) {
      sortBy = this.defaultSort.field;
    }

    // Validate sort order
    sortOrder = sortOrder.toUpperCase();
    if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
      sortOrder = this.defaultSort.order;
    }

    return [[sortBy, sortOrder]];
  }
}

module.exports = QueryBuilder;
