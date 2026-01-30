/**
 * usePagination Hook
 * Manages pagination state for lists and tables
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Hook for managing pagination state
 *
 * @param {Object} options - Configuration options
 * @param {number} options.initialPage - Initial page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {number} options.total - Total number of items (default: 0)
 *
 * @returns {Object} Pagination state and controls
 *
 * @example
 * const {
 *   page, limit, total, totalPages,
 *   setPage, nextPage, prevPage, setTotal
 * } = usePagination({ limit: 10 });
 */
export function usePagination(options = {}) {
  const {
    initialPage = 1,
    limit: initialLimit = 20,
    total: initialTotal = 0
  } = options;

  const [page, setPageState] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(initialTotal);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  const hasNextPage = useMemo(() => page < totalPages, [page, totalPages]);
  const hasPrevPage = useMemo(() => page > 1, [page]);

  const setPage = useCallback((newPage) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages || newPage));
    setPageState(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPageState(prev => prev + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setPageState(prev => prev - 1);
    }
  }, [hasPrevPage]);

  const goToFirst = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLast = useCallback(() => {
    setPageState(totalPages);
  }, [totalPages]);

  const reset = useCallback(() => {
    setPageState(initialPage);
  }, [initialPage]);

  // Calculate offset for API calls
  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  // Range of items being displayed (1-indexed)
  const range = useMemo(() => {
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + limit, total);
    return { start, end };
  }, [offset, limit, total]);

  return {
    // Current state
    page,
    limit,
    total,
    totalPages,
    offset,
    range,

    // Boolean flags
    hasNextPage,
    hasPrevPage,
    isFirstPage: page === 1,
    isLastPage: page === totalPages,

    // Actions
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    reset,

    // For spreading into API calls
    paginationParams: { page, limit }
  };
}

export default usePagination;
