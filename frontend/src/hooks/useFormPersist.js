/**
 * useFormPersist Hook
 * Drop-in replacement for useState that persists form data to sessionStorage.
 * Data survives page refresh but is cleared when the tab/window closes.
 *
 * Usage:
 *   const [formData, setFormData, clearForm] = useFormPersist('create-visit', {
 *     patient_id: '', visit_date: '', ...
 *   });
 *   // Call clearForm() on successful submit or explicit close
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const PREFIX = 'nv-form:';

const useFormPersist = (key, initialState) => {
  const storageKey = PREFIX + key;
  const isInitialMount = useRef(true);

  const [state, setState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with initialState to ensure new fields are included
        return { ...initialState, ...parsed };
      }
    } catch {
      // Corrupted data — ignore
    }
    return initialState;
  });

  // Persist on every change (skip initial mount to avoid writing defaults)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — silent fail
    }
  }, [storageKey, state]);

  const clear = useCallback(() => {
    sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  return [state, setState, clear];
};

export default useFormPersist;
