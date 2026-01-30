import { describe, it, expect } from 'vitest';
import {
  extractData,
  extractPagination,
  normalizeResponse,
  createErrorResponse,
  withNormalizedResponse
} from '../apiResponse';

describe('apiResponse utility', () => {
  describe('extractData', () => {
    it('should extract data from nested response { data: { data: [...] } }', () => {
      const response = { data: { data: [1, 2, 3] } };
      expect(extractData(response)).toEqual([1, 2, 3]);
    });

    it('should extract data from simple response { data: [...] }', () => {
      const response = { data: [1, 2, 3] };
      expect(extractData(response)).toEqual([1, 2, 3]);
    });

    it('should handle response with object data', () => {
      const response = { data: { data: { id: 1, name: 'Test' } } };
      expect(extractData(response)).toEqual({ id: 1, name: 'Test' });
    });

    it('should return defaultValue when response is null', () => {
      expect(extractData(null)).toBeNull();
      expect(extractData(null, [])).toEqual([]);
      expect(extractData(null, {})).toEqual({});
    });

    it('should return defaultValue when data is undefined', () => {
      expect(extractData({ data: undefined }, [])).toEqual([]);
    });

    it('should handle direct data without axios wrapper', () => {
      const data = { data: [1, 2, 3] };
      expect(extractData(data)).toEqual([1, 2, 3]);
    });

    it('should handle success wrapper pattern', () => {
      const response = { data: { success: true, data: { id: 1 } } };
      expect(extractData(response)).toEqual({ id: 1 });
    });
  });

  describe('extractPagination', () => {
    it('should extract pagination from response', () => {
      const response = {
        data: {
          data: [],
          pagination: { page: 1, limit: 20, total: 100, totalPages: 5 }
        }
      };
      expect(extractPagination(response)).toEqual({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5
      });
    });

    it('should extract pagination from root level', () => {
      const response = {
        data: {
          data: [],
          page: 2,
          limit: 10,
          total: 50
        }
      };
      const pagination = extractPagination(response);
      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(10);
      expect(pagination.total).toBe(50);
      expect(pagination.totalPages).toBe(5);
    });

    it('should return null when no pagination present', () => {
      const response = { data: [1, 2, 3] };
      expect(extractPagination(response)).toBeNull();
    });

    it('should return null for null response', () => {
      expect(extractPagination(null)).toBeNull();
    });

    it('should calculate totalPages from total and limit', () => {
      const response = {
        data: { data: [], page: 1, total: 55, limit: 20 }
      };
      const pagination = extractPagination(response);
      expect(pagination.totalPages).toBe(3);
    });
  });

  describe('normalizeResponse', () => {
    it('should normalize nested response with pagination', () => {
      const response = {
        data: {
          data: [{ id: 1 }, { id: 2 }],
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        }
      };
      const result = normalizeResponse(response);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle expectArray option', () => {
      const response = { data: { data: null } };
      const result = normalizeResponse(response, { expectArray: true });
      expect(result.data).toEqual([]);
    });

    it('should wrap single item in array when expectArray is true', () => {
      const response = { data: { data: { id: 1 } } };
      const result = normalizeResponse(response, { expectArray: true });
      expect(result.data).toEqual([{ id: 1 }]);
    });

    it('should use defaultData when data is null', () => {
      const response = { data: { data: null } };
      const result = normalizeResponse(response, { defaultData: { empty: true } });
      expect(result.data).toEqual({ empty: true });
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from Error object', () => {
      const error = new Error('Something went wrong');
      const result = createErrorResponse(error);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
      expect(result.data).toBeNull();
    });

    it('should extract error message from axios error response', () => {
      const error = {
        response: {
          data: {
            message: 'Validation failed'
          }
        }
      };
      const result = createErrorResponse(error);
      expect(result.error).toBe('Validation failed');
    });

    it('should extract error from error property', () => {
      const error = {
        response: {
          data: {
            error: 'Not found'
          }
        }
      };
      const result = createErrorResponse(error);
      expect(result.error).toBe('Not found');
    });

    it('should handle string error', () => {
      const result = createErrorResponse('Error message');
      expect(result.error).toBe('An unknown error occurred');
    });

    it('should handle null error', () => {
      const result = createErrorResponse(null);
      expect(result.error).toBe('An unknown error occurred');
    });
  });

  describe('withNormalizedResponse', () => {
    it('should wrap successful service function', async () => {
      const serviceFn = async () => ({
        data: { data: [1, 2, 3] }
      });
      const wrapped = withNormalizedResponse(serviceFn);
      const result = await wrapped();
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.success).toBe(true);
    });

    it('should handle service function error', async () => {
      const serviceFn = async () => {
        throw new Error('Network error');
      };
      const wrapped = withNormalizedResponse(serviceFn);
      const result = await wrapped();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should pass arguments to service function', async () => {
      const serviceFn = async (id, options) => ({
        data: { data: { id, options } }
      });
      const wrapped = withNormalizedResponse(serviceFn);
      const result = await wrapped(123, { foo: 'bar' });
      expect(result.data).toEqual({ id: 123, options: { foo: 'bar' } });
    });

    it('should apply options to normalization', async () => {
      const serviceFn = async () => ({
        data: { data: null }
      });
      const wrapped = withNormalizedResponse(serviceFn, { expectArray: true });
      const result = await wrapped();
      expect(result.data).toEqual([]);
    });
  });
});
