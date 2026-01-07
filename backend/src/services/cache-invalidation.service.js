/**
 * Cache Invalidation Service
 * 
 * Provides intelligent cache invalidation when resources are modified.
 * Called after successful CUD (Create, Update, Delete) operations.
 * 
 * Phase 5.4 - TASK-030: Implement API Response Caching
 */

const { invalidateCache } = require('../middleware/cache');

/**
 * Invalidate cache after patient operations
 */
function invalidatePatientCache(patientId = null) {
  let count = 0;
  
  // Invalidate patient list caches
  count += invalidateCache('patients');
  
  // Invalidate specific patient cache if ID provided
  if (patientId) {
    count += invalidateCache(`patients/${patientId}`);
    
    // Also invalidate related visits and billing
    count += invalidateCache('visits');
    count += invalidateCache('billing');
  }
  
  // Invalidate reports that include patient data
  count += invalidateCache('reports');
  
  return count;
}

/**
 * Invalidate cache after visit operations
 */
function invalidateVisitCache(visitId = null, patientId = null) {
  let count = 0;
  
  // Invalidate visit list caches
  count += invalidateCache('visits');
  
  // Invalidate specific visit cache if ID provided
  if (visitId) {
    count += invalidateCache(`visits/${visitId}`);
  }
  
  // Invalidate patient cache if patient ID provided
  if (patientId) {
    count += invalidateCache(`patients/${patientId}`);
  }
  
  // Invalidate reports
  count += invalidateCache('reports');
  
  return count;
}

/**
 * Invalidate cache after billing operations
 */
function invalidateBillingCache(billingId = null, patientId = null) {
  let count = 0;
  
  // Invalidate billing list caches
  count += invalidateCache('billing');
  
  // Invalidate specific billing cache if ID provided
  if (billingId) {
    count += invalidateCache(`billing/${billingId}`);
  }
  
  // Invalidate patient cache if patient ID provided
  if (patientId) {
    count += invalidateCache(`patients/${patientId}`);
  }
  
  // Invalidate reports
  count += invalidateCache('reports');
  
  return count;
}

/**
 * Invalidate cache after user operations
 */
function invalidateUserCache(userId = null) {
  let count = 0;
  
  // Invalidate user list caches
  count += invalidateCache('users');
  
  // Invalidate specific user cache if ID provided
  if (userId) {
    count += invalidateCache(`users/${userId}`);
  }
  
  // Invalidate reports that include user data
  count += invalidateCache('reports');
  
  return count;
}

/**
 * Invalidate all report caches
 */
function invalidateReportCache() {
  return invalidateCache('reports');
}

module.exports = {
  invalidatePatientCache,
  invalidateVisitCache,
  invalidateBillingCache,
  invalidateUserCache,
  invalidateReportCache
};
