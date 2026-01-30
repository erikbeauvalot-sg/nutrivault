/**
 * useFetch Hook
 * Generic data fetching hook with loading, error, and refetch capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { extractData } from '../utils/apiResponse';

/**
 * Hook for fetching data with automatic state management
 *
 * @param {Function} fetchFn - Async function that returns the data
 * @param {Object} options - Configuration options
 * @param {Array} options.deps - Dependencies that trigger refetch (default: [])
 * @param {*} options.defaultData - Default data value (default: null)
 * @param {boolean} options.immediate - Whether to fetch immediately (default: true)
 * @param {Function} options.onSuccess - Callback on successful fetch
 * @param {Function} options.onError - Callback on error
 * @param {boolean} options.extractNested - Whether to extract nested data (default: true)
 *
 * @returns {Object} { data, loading, error, refetch, setData }
 *
 * @example
 * const { data: patients, loading, error, refetch } = useFetch(
 *   () => patientService.getPatients(),
 *   { defaultData: [] }
 * );
 */
export function useFetch(fetchFn, options = {}) {
  const {
    deps = [],
    defaultData = null,
    immediate = true,
    onSuccess,
    onError,
    extractNested = true
  } = options;

  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  // Track the latest fetch to avoid race conditions
  const fetchIdRef = useRef(0);

  const fetch = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchFn();

      // Only update if this is the latest fetch and component is mounted
      if (fetchId === fetchIdRef.current && mountedRef.current) {
        const result = extractNested ? extractData(response, defaultData) : response;
        setData(result);
        setLoading(false);
        onSuccess?.(result);
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current && mountedRef.current) {
        const errorMessage = err?.response?.data?.message
          || err?.response?.data?.error
          || err?.message
          || 'An error occurred';

        setError(errorMessage);
        setLoading(false);
        onError?.(err);
      }
    }
  }, [fetchFn, defaultData, extractNested, onSuccess, onError]);

  // Initial fetch and refetch on deps change
  useEffect(() => {
    if (immediate) {
      fetch();
    }
  }, [immediate, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetch,
    setData
  };
}

/**
 * Hook for fetching data with pagination support
 *
 * @param {Function} fetchFn - Async function that accepts { page, limit } and returns paginated data
 * @param {Object} options - Configuration options
 *
 * @returns {Object} { data, loading, error, pagination, setPage, refetch }
 */
export function useFetchPaginated(fetchFn, options = {}) {
  const {
    initialPage = 1,
    limit = 20,
    deps = [],
    defaultData = [],
    onSuccess,
    onError
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pagination, setPagination] = useState(null);

  const { data, loading, error, refetch, setData } = useFetch(
    () => fetchFn({ page, limit }),
    {
      deps: [page, ...deps],
      defaultData,
      onSuccess: (response) => {
        // Extract pagination if present
        if (response?.pagination) {
          setPagination(response.pagination);
        }
        onSuccess?.(response);
      },
      onError,
      extractNested: false
    }
  );

  // Extract data from paginated response
  const items = data?.data || data || defaultData;
  const paginationInfo = pagination || data?.pagination || null;

  return {
    data: items,
    loading,
    error,
    pagination: paginationInfo,
    page,
    setPage,
    refetch,
    setData
  };
}

export default useFetch;
