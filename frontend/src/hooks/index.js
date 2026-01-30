/**
 * Custom Hooks Index
 *
 * Centralized exports for all custom hooks
 */

// Data fetching
export { useFetch, useFetchPaginated } from './useFetch';

// State management
export { usePagination } from './usePagination';
export { useModal, useModals } from './useModal';

// UI helpers
export { useIsMobile, useBreakpoints } from './useIsMobile';
export { useDebounce, useDebouncedCallback, useThrottledCallback } from './useDebounce';

// Domain-specific
export { useEmailCheck } from './useEmailCheck';
export { usePrefetchRoutes } from './usePrefetchRoutes';
