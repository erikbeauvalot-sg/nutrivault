/**
 * API Response Normalization Utility
 *
 * Handles various backend response formats and normalizes them into a consistent structure.
 *
 * Backend response patterns handled:
 * 1. { data: [...] } or { data: {...} } - nested data
 * 2. [...] or {...} - direct data
 * 3. { data: { data: [...], pagination: {...} } } - paginated response
 * 4. { success: true, data: {...} } - success wrapper
 */

/**
 * Extracts the actual data from an API response, handling various nesting patterns.
 *
 * @param {Object} response - Axios response object
 * @param {*} defaultValue - Default value if no data found (default: null)
 * @returns {*} The extracted data
 *
 * @example
 * // Simple usage
 * const data = extractData(response);
 *
 * // With default array
 * const items = extractData(response, []);
 */
export function extractData(response, defaultValue = null) {
  if (!response) {
    return defaultValue;
  }

  // Handle axios response wrapper
  const responseData = response.data ?? response;

  // If responseData has a nested data property, extract it
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data ?? defaultValue;
  }

  // Return the data directly
  return responseData ?? defaultValue;
}

/**
 * Extracts pagination information from an API response.
 *
 * @param {Object} response - Axios response object
 * @returns {Object|null} Pagination object or null if not present
 *
 * @example
 * const pagination = extractPagination(response);
 * // { page: 1, limit: 20, total: 100, totalPages: 5 }
 */
export function extractPagination(response) {
  if (!response) {
    return null;
  }

  const responseData = response.data ?? response;

  // Check for pagination in response
  if (responseData && typeof responseData === 'object') {
    // Standard pagination location
    if (responseData.pagination) {
      return responseData.pagination;
    }
    // Alternative: pagination info at root level
    if (responseData.page !== undefined && responseData.total !== undefined) {
      return {
        page: responseData.page,
        limit: responseData.limit || responseData.perPage || 20,
        total: responseData.total,
        totalPages: responseData.totalPages || Math.ceil(responseData.total / (responseData.limit || 20))
      };
    }
  }

  return null;
}

/**
 * Normalizes an API response into a consistent structure.
 *
 * @param {Object} response - Axios response object
 * @param {Object} options - Options
 * @param {*} options.defaultData - Default value for data if not found
 * @param {boolean} options.expectArray - If true, ensures data is an array
 * @returns {Object} Normalized response { data, pagination, success, error }
 *
 * @example
 * const { data, pagination } = normalizeResponse(response, { expectArray: true });
 */
export function normalizeResponse(response, options = {}) {
  const { defaultData = null, expectArray = false } = options;

  const data = extractData(response, expectArray ? [] : defaultData);
  const pagination = extractPagination(response);

  // Ensure array if expected
  const normalizedData = expectArray && !Array.isArray(data)
    ? (data ? [data] : [])
    : data;

  return {
    data: normalizedData,
    pagination,
    success: true,
    error: null
  };
}

/**
 * Creates an error response object.
 *
 * @param {Error|string} error - The error object or message
 * @returns {Object} Error response { data: null, pagination: null, success: false, error }
 */
export function createErrorResponse(error) {
  const errorMessage = error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || 'An unknown error occurred';

  return {
    data: null,
    pagination: null,
    success: false,
    error: errorMessage
  };
}

/**
 * Wraps a service function to automatically normalize responses.
 *
 * @param {Function} serviceFn - The service function to wrap
 * @param {Object} options - Normalization options
 * @returns {Function} Wrapped function that returns normalized responses
 *
 * @example
 * const getPatients = withNormalizedResponse(
 *   () => api.get('/patients'),
 *   { expectArray: true }
 * );
 * const { data: patients, pagination } = await getPatients();
 */
export function withNormalizedResponse(serviceFn, options = {}) {
  return async (...args) => {
    try {
      const response = await serviceFn(...args);
      return normalizeResponse(response, options);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

// Default export for convenience
export default {
  extractData,
  extractPagination,
  normalizeResponse,
  createErrorResponse,
  withNormalizedResponse
};
