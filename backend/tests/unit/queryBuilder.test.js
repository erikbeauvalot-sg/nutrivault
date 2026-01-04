/**
 * QueryBuilder Unit Tests
 */

const QueryBuilder = require('../../src/utils/queryBuilder');
const { AppError } = require('../../src/middleware/errorHandler');
const { Op } = require('sequelize');

describe('QueryBuilder', () => {
  let queryBuilder;
  let config;

  beforeEach(() => {
    // Sample configuration similar to PATIENTS_CONFIG
    config = {
      searchFields: ['first_name', 'last_name', 'email'],
      filterableFields: {
        id: { type: 'uuid' },
        assigned_dietitian_id: { type: 'uuid' },
        is_active: { type: 'boolean' },
        date_of_birth: { type: 'date' },
        age: { type: 'integer' },
        score: { type: 'float' },
        gender: {
          type: 'enum',
          values: ['MALE', 'FEMALE', 'OTHER']
        },
        city: { type: 'string' }
      },
      sortableFields: ['created_at', 'first_name', 'last_name', 'date_of_birth'],
      defaultSort: { field: 'created_at', order: 'DESC' },
      maxLimit: 100
    };

    queryBuilder = new QueryBuilder(config);
  });

  describe('Constructor', () => {
    it('should initialize with config values', () => {
      expect(queryBuilder.searchFields).toEqual(config.searchFields);
      expect(queryBuilder.filterableFields).toEqual(config.filterableFields);
      expect(queryBuilder.sortableFields).toEqual(config.sortableFields);
      expect(queryBuilder.defaultSort).toEqual(config.defaultSort);
      expect(queryBuilder.maxLimit).toBe(100);
    });

    it('should use defaults for missing config values', () => {
      const builder = new QueryBuilder({});
      expect(builder.searchFields).toEqual([]);
      expect(builder.filterableFields).toEqual({});
      expect(builder.sortableFields).toEqual([]);
      expect(builder.defaultSort).toEqual({ field: 'created_at', order: 'DESC' });
      expect(builder.maxLimit).toBe(100);
    });
  });

  describe('build()', () => {
    it('should return empty where clause for empty query params', () => {
      const result = queryBuilder.build({});
      expect(result.where).toEqual({});
      expect(result.pagination).toBeDefined();
      expect(result.sort).toBeDefined();
    });

    it('should build query with multiple filters', () => {
      const queryParams = {
        is_active: 'true',
        city: 'Toronto'
      };

      const result = queryBuilder.build(queryParams);
      expect(result.where.is_active).toBe(true);
      expect(result.where.city).toBe('Toronto');
    });

    it('should ignore non-filterable fields', () => {
      const queryParams = {
        random_field: 'value',
        is_active: 'true'
      };

      const result = queryBuilder.build(queryParams);
      expect(result.where.random_field).toBeUndefined();
      expect(result.where.is_active).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    it('should build multi-field search with OR conditions', () => {
      const queryParams = { search: 'john' };
      const result = queryBuilder.build(queryParams);

      expect(result.where[Op.or]).toBeDefined();
      expect(result.where[Op.or]).toHaveLength(3);
      expect(result.where[Op.or][0]).toEqual({ first_name: { [Op.like]: '%john%' } });
      expect(result.where[Op.or][1]).toEqual({ last_name: { [Op.like]: '%john%' } });
      expect(result.where[Op.or][2]).toEqual({ email: { [Op.like]: '%john%' } });
    });

    it('should trim search term', () => {
      const queryParams = { search: '  john  ' };
      const result = queryBuilder.build(queryParams);

      expect(result.where[Op.or][0]).toEqual({ first_name: { [Op.like]: '%john%' } });
    });

    it('should ignore empty search term', () => {
      const queryParams = { search: '   ' };
      const result = queryBuilder.build(queryParams);

      expect(result.where[Op.or]).toBeUndefined();
    });

    it('should not build search if no search fields configured', () => {
      const builder = new QueryBuilder({ ...config, searchFields: [] });
      const queryParams = { search: 'john' };
      const result = builder.build(queryParams);

      expect(result.where[Op.or]).toBeUndefined();
    });
  });

  describe('Operator Parsing', () => {
    describe('Equality operators', () => {
      it('should handle _eq operator', () => {
        const queryParams = { age_eq: '25' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toBe(25);
      });

      it('should handle exact match (no operator)', () => {
        const queryParams = { age: '25' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toBe(25);
      });

      it('should handle _ne operator', () => {
        const queryParams = { age_ne: '25' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toEqual({ [Op.ne]: 25 });
      });
    });

    describe('Comparison operators', () => {
      it('should handle _gt operator', () => {
        const queryParams = { age_gt: '18' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toEqual({ [Op.gt]: 18 });
      });

      it('should handle _gte operator', () => {
        const queryParams = { age_gte: '18' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toEqual({ [Op.gte]: 18 });
      });

      it('should handle _lt operator', () => {
        const queryParams = { age_lt: '65' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toEqual({ [Op.lt]: 65 });
      });

      it('should handle _lte operator', () => {
        const queryParams = { age_lte: '65' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toEqual({ [Op.lte]: 65 });
      });
    });

    describe('_in operator', () => {
      it('should handle _in for integers', () => {
        const queryParams = { age_in: '18,25,30' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toEqual({ [Op.in]: [18, 25, 30] });
      });

      it('should handle _in for UUIDs', () => {
        const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
        const uuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const queryParams = { id_in: `${uuid1},${uuid2}` };
        const result = queryBuilder.build(queryParams);
        expect(result.where.id).toEqual({ [Op.in]: [uuid1, uuid2] });
      });

      it('should handle _in for enums', () => {
        const queryParams = { gender_in: 'MALE,FEMALE' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.gender).toEqual({ [Op.in]: ['MALE', 'FEMALE'] });
      });

      it('should throw error if more than 100 values', () => {
        const values = Array.from({ length: 101 }, (_, i) => i).join(',');
        const queryParams = { age_in: values };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
        expect(() => queryBuilder.build(queryParams)).toThrow('Maximum 100 values allowed');
      });
    });

    describe('_between operator', () => {
      it('should handle _between for integers', () => {
        const queryParams = { age_between: '18,65' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toEqual({ [Op.between]: [18, 65] });
      });

      it('should handle _between for dates', () => {
        const queryParams = { date_of_birth_between: '1990-01-01,2000-12-31' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.date_of_birth[Op.between]).toHaveLength(2);
        expect(result.where.date_of_birth[Op.between][0]).toBeInstanceOf(Date);
        expect(result.where.date_of_birth[Op.between][1]).toBeInstanceOf(Date);
      });

      it('should throw error if not exactly 2 values', () => {
        const queryParams = { age_between: '18,25,65' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
        expect(() => queryBuilder.build(queryParams)).toThrow('exactly 2');
      });
    });

    describe('_null and _not_null operators', () => {
      it('should handle _null with true value', () => {
        const queryParams = { assigned_dietitian_id_null: 'true' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.assigned_dietitian_id).toEqual({ [Op.is]: null });
      });

      it('should handle _null with false value', () => {
        const queryParams = { assigned_dietitian_id_null: 'false' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.assigned_dietitian_id).toEqual({ [Op.not]: null });
      });

      it('should handle _not_null with true value', () => {
        const queryParams = { assigned_dietitian_id_not_null: 'true' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.assigned_dietitian_id).toEqual({ [Op.not]: null });
      });

      it('should handle _not_null with false value', () => {
        const queryParams = { assigned_dietitian_id_not_null: 'false' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.assigned_dietitian_id).toEqual({ [Op.is]: null });
      });

      it('should throw error for invalid boolean value', () => {
        const queryParams = { assigned_dietitian_id_null: 'invalid' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
      });
    });

    describe('_like and _ilike operators', () => {
      it('should handle _like operator', () => {
        const queryParams = { city_like: 'tor' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.city).toEqual({ [Op.like]: '%tor%' });
      });

      it('should handle _ilike operator', () => {
        const queryParams = { city_ilike: 'TOR' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.city).toEqual({ [Op.iLike]: '%TOR%' });
      });
    });
  });

  describe('Type Conversion', () => {
    describe('UUID type', () => {
      it('should accept valid UUID', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const queryParams = { id: uuid };
        const result = queryBuilder.build(queryParams);
        expect(result.where.id).toBe(uuid);
      });

      it('should throw error for invalid UUID', () => {
        const queryParams = { id: 'not-a-uuid' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
        expect(() => queryBuilder.build(queryParams)).toThrow('Invalid UUID');
      });
    });

    describe('Date type', () => {
      it('should convert valid date string to Date object', () => {
        const queryParams = { date_of_birth: '1990-01-01' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.date_of_birth).toBeInstanceOf(Date);
        expect(result.where.date_of_birth.getFullYear()).toBe(1990);
      });

      it('should handle ISO 8601 datetime', () => {
        const queryParams = { date_of_birth: '1990-01-01T00:00:00Z' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.date_of_birth).toBeInstanceOf(Date);
      });

      it('should throw error for invalid date', () => {
        const queryParams = { date_of_birth: 'invalid-date' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
        expect(() => queryBuilder.build(queryParams)).toThrow('Invalid date');
      });
    });

    describe('Boolean type', () => {
      it('should convert "true" string to boolean', () => {
        const queryParams = { is_active: 'true' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.is_active).toBe(true);
      });

      it('should convert "false" string to boolean', () => {
        const queryParams = { is_active: 'false' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.is_active).toBe(false);
      });

      it('should convert "1" to true', () => {
        const queryParams = { is_active: '1' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.is_active).toBe(true);
      });

      it('should convert "0" to false', () => {
        const queryParams = { is_active: '0' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.is_active).toBe(false);
      });

      it('should handle boolean value directly', () => {
        const queryParams = { is_active: true };
        const result = queryBuilder.build(queryParams);
        expect(result.where.is_active).toBe(true);
      });

      it('should throw error for invalid boolean', () => {
        const queryParams = { is_active: 'invalid' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
      });
    });

    describe('Integer type', () => {
      it('should convert string to integer', () => {
        const queryParams = { age: '25' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toBe(25);
        expect(typeof result.where.age).toBe('number');
      });

      it('should throw error for invalid integer', () => {
        const queryParams = { age: 'not-a-number' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
        expect(() => queryBuilder.build(queryParams)).toThrow('Invalid integer');
      });

      it('should handle negative integers', () => {
        const queryParams = { age: '-5' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.age).toBe(-5);
      });
    });

    describe('Float type', () => {
      it('should convert string to float', () => {
        const queryParams = { score: '98.5' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.score).toBe(98.5);
        expect(typeof result.where.score).toBe('number');
      });

      it('should handle integers as floats', () => {
        const queryParams = { score: '100' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.score).toBe(100);
      });

      it('should throw error for invalid float', () => {
        const queryParams = { score: 'not-a-number' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
        expect(() => queryBuilder.build(queryParams)).toThrow('Invalid number');
      });
    });

    describe('Enum type', () => {
      it('should accept valid enum value', () => {
        const queryParams = { gender: 'MALE' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.gender).toBe('MALE');
      });

      it('should convert to uppercase', () => {
        const queryParams = { gender: 'female' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.gender).toBe('FEMALE');
      });

      it('should throw error for invalid enum value', () => {
        const queryParams = { gender: 'INVALID' };
        expect(() => queryBuilder.build(queryParams)).toThrow(AppError);
        expect(() => queryBuilder.build(queryParams)).toThrow('Invalid enum value');
      });
    });

    describe('String type', () => {
      it('should accept string values', () => {
        const queryParams = { city: 'Toronto' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.city).toBe('Toronto');
      });

      it('should handle empty strings', () => {
        const queryParams = { city: '' };
        const result = queryBuilder.build(queryParams);
        expect(result.where.city).toBe('');
      });
    });
  });

  describe('Pagination', () => {
    it('should use default limit and offset', () => {
      const result = queryBuilder.build({});
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
    });

    it('should accept custom limit and offset', () => {
      const queryParams = { limit: '50', offset: '10' };
      const result = queryBuilder.build(queryParams);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.offset).toBe(10);
    });

    it('should enforce maximum limit', () => {
      const queryParams = { limit: '200' };
      const result = queryBuilder.build(queryParams);
      expect(result.pagination.limit).toBe(100); // maxLimit
    });

    it('should handle invalid limit gracefully', () => {
      const queryParams = { limit: 'invalid' };
      const result = queryBuilder.build(queryParams);
      expect(result.pagination.limit).toBe(10); // default
    });

    it('should handle negative limit', () => {
      const queryParams = { limit: '-5' };
      const result = queryBuilder.build(queryParams);
      expect(result.pagination.limit).toBe(10); // default
    });

    it('should handle invalid offset gracefully', () => {
      const queryParams = { offset: 'invalid' };
      const result = queryBuilder.build(queryParams);
      expect(result.pagination.offset).toBe(0); // default
    });

    it('should handle negative offset', () => {
      const queryParams = { offset: '-10' };
      const result = queryBuilder.build(queryParams);
      expect(result.pagination.offset).toBe(0); // default
    });
  });

  describe('Sorting', () => {
    it('should use default sort', () => {
      const result = queryBuilder.build({});
      expect(result.sort).toEqual([['created_at', 'DESC']]);
    });

    it('should accept custom sort_by', () => {
      const queryParams = { sort_by: 'first_name' };
      const result = queryBuilder.build(queryParams);
      expect(result.sort).toEqual([['first_name', 'DESC']]);
    });

    it('should accept custom sort_order', () => {
      const queryParams = { sort_by: 'first_name', sort_order: 'ASC' };
      const result = queryBuilder.build(queryParams);
      expect(result.sort).toEqual([['first_name', 'ASC']]);
    });

    it('should handle lowercase sort_order', () => {
      const queryParams = { sort_order: 'asc' };
      const result = queryBuilder.build(queryParams);
      expect(result.sort).toEqual([['created_at', 'ASC']]);
    });

    it('should reject invalid sort_by field', () => {
      const queryParams = { sort_by: 'invalid_field' };
      const result = queryBuilder.build(queryParams);
      expect(result.sort).toEqual([['created_at', 'DESC']]); // fallback to default
    });

    it('should reject invalid sort_order', () => {
      const queryParams = { sort_order: 'invalid' };
      const result = queryBuilder.build(queryParams);
      expect(result.sort).toEqual([['created_at', 'DESC']]); // fallback to default
    });
  });

  describe('Complex Queries', () => {
    it('should handle multiple filters with different operators', () => {
      const queryParams = {
        is_active: 'true',
        age_gte: '18',
        age_lte: '65',
        city: 'Toronto',
        gender_in: 'MALE,FEMALE'
      };

      const result = queryBuilder.build(queryParams);
      expect(result.where.is_active).toBe(true);
      expect(result.where.age).toEqual({ [Op.gte]: 18, [Op.lte]: 65 });
      expect(result.where.city).toBe('Toronto');
      expect(result.where.gender).toEqual({ [Op.in]: ['MALE', 'FEMALE'] });
    });

    it('should handle search with filters, pagination, and sorting', () => {
      const queryParams = {
        search: 'john',
        is_active: 'true',
        limit: '25',
        offset: '50',
        sort_by: 'last_name',
        sort_order: 'ASC'
      };

      const result = queryBuilder.build(queryParams);
      expect(result.where[Op.or]).toBeDefined();
      expect(result.where.is_active).toBe(true);
      expect(result.pagination).toEqual({ limit: 25, offset: 50 });
      expect(result.sort).toEqual([['last_name', 'ASC']]);
    });

    it('should apply multiple operators to the same field', () => {
      const queryParams = {
        age_gte: '18',
        age_lte: '65'
      };

      const result = queryBuilder.build(queryParams);
      expect(result.where.age).toEqual({ [Op.gte]: 18, [Op.lte]: 65 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined query params', () => {
      const result = queryBuilder.build(undefined);
      expect(result.where).toEqual({});
    });

    it('should handle null query params', () => {
      const result = queryBuilder.build(null);
      expect(result.where).toEqual({});
    });

    it('should skip special query parameters', () => {
      const queryParams = {
        search: 'test',
        limit: '10',
        offset: '0',
        sort_by: 'created_at',
        sort_order: 'DESC'
      };

      const result = queryBuilder.build(queryParams);
      // None of these should appear in where clause
      expect(result.where.search).toBeUndefined();
      expect(result.where.limit).toBeUndefined();
      expect(result.where.offset).toBeUndefined();
      expect(result.where.sort_by).toBeUndefined();
      expect(result.where.sort_order).toBeUndefined();
    });

    it('should handle whitespace in comma-separated values', () => {
      const queryParams = { age_in: '18, 25, 30' };
      const result = queryBuilder.build(queryParams);
      expect(result.where.age).toEqual({ [Op.in]: [18, 25, 30] });
    });
  });

  describe('Backward Compatibility', () => {
    it('should support exact field names without operators', () => {
      const queryParams = {
        is_active: 'true',
        city: 'Toronto',
        age: '25'
      };

      const result = queryBuilder.build(queryParams);
      expect(result.where.is_active).toBe(true);
      expect(result.where.city).toBe('Toronto');
      expect(result.where.age).toBe(25);
    });

    it('should work with existing pagination params', () => {
      const queryParams = { limit: '20', offset: '40' };
      const result = queryBuilder.build(queryParams);
      expect(result.pagination).toEqual({ limit: 20, offset: 40 });
    });

    it('should work with existing sort params', () => {
      const queryParams = { sort_by: 'first_name', sort_order: 'ASC' };
      const result = queryBuilder.build(queryParams);
      expect(result.sort).toEqual([['first_name', 'ASC']]);
    });
  });
});
