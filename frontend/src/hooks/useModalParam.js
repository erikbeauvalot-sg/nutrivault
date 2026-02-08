/**
 * useModalParam Hook
 * Syncs modal open/close state with a URL search parameter.
 * On refresh, the modal reopens. Browser back button closes it.
 *
 * Usage:
 *   const [show, open, close] = useModalParam('create-visit');
 *   // URL becomes ?modal=create-visit when open
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const PARAM_KEY = 'modal';

const useModalParam = (modalName) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const isOpen = useMemo(
    () => searchParams.get(PARAM_KEY) === modalName,
    [searchParams, modalName]
  );

  const open = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set(PARAM_KEY, modalName);
      return next;
    }, { replace: false });
  }, [modalName, setSearchParams]);

  const close = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(PARAM_KEY);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return [isOpen, open, close];
};

export default useModalParam;
