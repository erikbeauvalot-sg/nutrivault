/**
 * usePrefetchRoutes Hook
 * Prefetches critical routes to improve perceived performance (US-9.2)
 */

import { useEffect } from 'react';

/**
 * Prefetches critical routes that are likely to be visited
 * Called after login or when user is idle on login page
 */
export const usePrefetchRoutes = (shouldPrefetch = false) => {
  useEffect(() => {
    if (!shouldPrefetch) return;

    // Prefetch critical routes after a short delay (requestIdleCallback or setTimeout)
    const prefetchTimeout = setTimeout(() => {
      // Prefetch Dashboard (most visited after login)
      import('../pages/DashboardPage').catch(err => {
        console.warn('Failed to prefetch DashboardPage:', err);
      });

      // Prefetch Patients page (second most common)
      setTimeout(() => {
        import('../pages/PatientsPage').catch(err => {
          console.warn('Failed to prefetch PatientsPage:', err);
        });
      }, 1000);

      // Prefetch Agenda page
      setTimeout(() => {
        import('../pages/AgendaPage').catch(err => {
          console.warn('Failed to prefetch AgendaPage:', err);
        });
      }, 2000);
    }, 500); // Start prefetching 500ms after component mount

    return () => clearTimeout(prefetchTimeout);
  }, [shouldPrefetch]);
};

/**
 * Prefetch a specific route on demand
 * Useful for link hover or predictive prefetching
 */
export const prefetchRoute = (routeName) => {
  const routeMap = {
    dashboard: () => import('../pages/DashboardPage'),
    patients: () => import('../pages/PatientsPage'),
    'patient-detail': () => import('../pages/PatientDetailPage'),
    agenda: () => import('../pages/AgendaPage'),
    visits: () => import('../pages/VisitsPage'),
    billing: () => import('../pages/BillingPage'),
    documents: () => import('../pages/DocumentsPage'),
    reports: () => import('../pages/ReportsPage'),
    users: () => import('../pages/UsersPage'),
  };

  if (routeMap[routeName]) {
    routeMap[routeName]().catch(err => {
      console.warn(`Failed to prefetch ${routeName}:`, err);
    });
  }
};

export default usePrefetchRoutes;
