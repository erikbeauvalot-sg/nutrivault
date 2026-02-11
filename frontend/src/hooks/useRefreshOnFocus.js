/**
 * useRefreshOnFocus
 * Calls onRefresh when the page becomes visible again (tab switch, app resume).
 * Throttled: won't re-fetch if less than `minInterval` ms since last refresh.
 * Works on both web (visibilitychange) and native iOS/Android (resume event from Capacitor).
 */

import { useEffect, useRef } from 'react';

const DEFAULT_MIN_INTERVAL = 30_000; // 30s

export default function useRefreshOnFocus(onRefresh, { minInterval = DEFAULT_MIN_INTERVAL } = {}) {
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    if (!onRefresh) return;

    const maybeRefresh = () => {
      const now = Date.now();
      if (now - lastRefresh.current < minInterval) return;
      lastRefresh.current = now;
      onRefresh();
    };

    // Web: tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') maybeRefresh();
    };

    // Capacitor: app resumes from background
    const handleResume = () => maybeRefresh();

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('resume', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('resume', handleResume);
    };
  }, [onRefresh, minInterval]);
}
