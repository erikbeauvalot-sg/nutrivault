/**
 * useEmailCheck Hook
 * Debounced email availability checking for forms
 */

import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

/**
 * Hook to check email availability with debouncing
 * @param {string} email - Email to check
 * @param {string} entityType - 'patient' or 'user'
 * @param {string} excludeId - ID to exclude from check (for updates)
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 500)
 * @returns {Object} { checking, available, error }
 */
export const useEmailCheck = (email, entityType = 'patient', excludeId = null, debounceMs = 500) => {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Reset state if email is empty or invalid
    if (!email || !email.trim() || !isValidEmail(email)) {
      setChecking(false);
      setAvailable(null);
      setError(null);
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set checking state immediately
    setChecking(true);
    setError(null);

    // Debounce the API call
    timeoutRef.current = setTimeout(async () => {
      try {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        const normalizedEmail = email.trim().toLowerCase();
        const endpoint = entityType === 'patient'
          ? `/api/patients/check-email/${encodeURIComponent(normalizedEmail)}`
          : `/api/users/check-email/${encodeURIComponent(normalizedEmail)}`;

        const params = excludeId ? { excludeId } : {};

        const response = await api.get(endpoint, {
          params,
          signal: abortControllerRef.current.signal
        });

        setAvailable(response.data.available);
        setChecking(false);
      } catch (err) {
        // Ignore aborted requests
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return;
        }

        console.error('Error checking email availability:', err);
        setError(err.response?.data?.error || 'Failed to check email availability');
        setAvailable(null);
        setChecking(false);
      }
    }, debounceMs);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [email, entityType, excludeId, debounceMs]);

  return { checking, available, error };
};

/**
 * Basic email validation
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default useEmailCheck;
