/**
 * useIsMobile Hook
 * Detects mobile viewport with throttled resize handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for detecting mobile viewport
 *
 * @param {number} breakpoint - Mobile breakpoint in pixels (default: 768)
 * @param {number} throttleMs - Throttle delay for resize events (default: 100)
 *
 * @returns {boolean} Whether viewport is mobile-sized
 *
 * @example
 * const isMobile = useIsMobile();
 *
 * return isMobile ? <MobileLayout /> : <DesktopLayout />;
 */
export function useIsMobile(breakpoint = 768, throttleMs = 100) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  const timeoutRef = useRef(null);
  const lastRunRef = useRef(Date.now());

  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth < breakpoint;
    setIsMobile(mobile);
  }, [breakpoint]);

  const handleResize = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= throttleMs) {
      // Run immediately if enough time has passed
      lastRunRef.current = now;
      checkMobile();
    } else {
      // Schedule a run for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        checkMobile();
      }, throttleMs - timeSinceLastRun);
    }
  }, [checkMobile, throttleMs]);

  useEffect(() => {
    // Check on mount
    checkMobile();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkMobile, handleResize]);

  return isMobile;
}

/**
 * Hook for detecting various breakpoints
 *
 * @returns {Object} Breakpoint flags
 *
 * @example
 * const { isMobile, isTablet, isDesktop } = useBreakpoints();
 */
export function useBreakpoints() {
  const [breakpoints, setBreakpoints] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true };
    }
    const width = window.innerWidth;
    return {
      isMobile: width < 576,
      isTablet: width >= 576 && width < 992,
      isDesktop: width >= 992
    };
  });

  useEffect(() => {
    let timeoutId = null;

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        setBreakpoints({
          isMobile: width < 576,
          isTablet: width >= 576 && width < 992,
          isDesktop: width >= 992
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return breakpoints;
}

export default useIsMobile;
