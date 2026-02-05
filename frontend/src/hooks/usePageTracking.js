import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pushPageView } from '../services/gtmService';

/**
 * Hook that pushes a page_view event to dataLayer on every route change
 */
const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    pushPageView(location.pathname, document.title);
  }, [location.pathname]);
};

export default usePageTracking;
