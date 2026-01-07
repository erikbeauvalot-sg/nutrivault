/**
 * Cache Middleware for NutriVault API
 * 
 * Provides in-memory caching for read-heavy endpoints to reduce database load
 * and improve response times.
 * 
 * Phase 5.4 - TASK-030: Implement API Response Caching
 */

const NodeCache = require('node-cache');

// Initialize cache instances with different TTLs
const caches = {
  // Short-lived cache for frequently changing data (30 seconds)
  short: new NodeCache({
    stdTTL: 30,
    checkperiod: 10,
    useClones: false, // Better performance, but be careful with mutable objects
    deleteOnExpire: true
  }),
  
  // Medium-lived cache for semi-static data (1 minute)
  medium: new NodeCache({
    stdTTL: 60,
    checkperiod: 20,
    useClones: false,
    deleteOnExpire: true
  }),
  
  // Long-lived cache for static/report data (5 minutes)
  long: new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false,
    deleteOnExpire: true
  })
};

/**
 * Generate cache key from request
 * Includes user ID, path, and query parameters for uniqueness
 */
function generateCacheKey(req) {
  const userId = req.user?.id || 'anonymous';
  const path = req.path;
  const queryString = JSON.stringify(req.query);
  return `${userId}:${path}:${queryString}`;
}

/**
 * Cache middleware factory
 * @param {string} ttl - Cache TTL type: 'short', 'medium', or 'long'
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
function cacheMiddleware(ttl = 'medium', options = {}) {
  const cache = caches[ttl] || caches.medium;
  const { keyPrefix = '', skipCache = null } = options;

  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Allow custom skip logic
    if (skipCache && skipCache(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyPrefix + generateCacheKey(req);

    // Try to get cached response
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      // Cache hit - return cached response
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cachedResponse);
    }

    // Cache miss - proceed with request and cache the response
    res.set('X-Cache', 'MISS');
    
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data);
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache for specific resource
 * @param {string} resourceType - Type of resource (patients, visits, billing, etc.)
 * @param {string} resourceId - ID of specific resource (optional)
 */
function invalidateCache(resourceType, resourceId = null) {
  // Get all keys from all caches
  const allKeys = [
    ...caches.short.keys(),
    ...caches.medium.keys(),
    ...caches.long.keys()
  ];

  // Pattern to match
  const pattern = resourceId 
    ? `${resourceType}/${resourceId}`
    : resourceType;

  // Delete matching keys
  let deletedCount = 0;
  allKeys.forEach(key => {
    if (key.includes(pattern)) {
      caches.short.del(key);
      caches.medium.del(key);
      caches.long.del(key);
      deletedCount++;
    }
  });

  return deletedCount;
}

/**
 * Invalidate all caches
 */
function invalidateAll() {
  caches.short.flushAll();
  caches.medium.flushAll();
  caches.long.flushAll();
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    short: caches.short.getStats(),
    medium: caches.medium.getStats(),
    long: caches.long.getStats()
  };
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateAll,
  getCacheStats,
  caches
};
