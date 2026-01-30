/**
 * useDebounce Hook
 * Debounces a value or callback
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that debounces a value
 *
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 *
 * @returns {*} The debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // This will only run 500ms after user stops typing
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns a debounced version of a callback
 *
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 *
 * @returns {Function} The debounced callback
 *
 * @example
 * const debouncedSave = useDebouncedCallback((data) => {
 *   saveToServer(data);
 * }, 500);
 *
 * <input onChange={(e) => debouncedSave(e.target.value)} />
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Add cancel method
  debouncedCallback.cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return debouncedCallback;
}

/**
 * Hook that returns a throttled version of a callback
 *
 * @param {Function} callback - The callback to throttle
 * @param {number} limit - Minimum time between calls in milliseconds (default: 300)
 *
 * @returns {Function} The throttled callback
 *
 * @example
 * const throttledScroll = useThrottledCallback((scrollY) => {
 *   updateUI(scrollY);
 * }, 100);
 */
export function useThrottledCallback(callback, limit = 300) {
  const lastRanRef = useRef(0);
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback((...args) => {
    const now = Date.now();

    if (now - lastRanRef.current >= limit) {
      lastRanRef.current = now;
      callbackRef.current(...args);
    } else {
      // Schedule for end of throttle period
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastRanRef.current = Date.now();
        callbackRef.current(...args);
      }, limit - (now - lastRanRef.current));
    }
  }, [limit]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

export default useDebounce;
