require('dotenv').config();

/**
 * Database Configuration with Optimized Connection Pooling
 * 
 * Phase 5.4 - TASK-038: Optimize Database Connection Pooling
 * 
 * Connection pool settings optimized for production workload:
 * - max: Maximum concurrent connections
 * - min: Minimum idle connections
 * - acquire: Max time to get connection before throwing error
 * - idle: Max time a connection can be idle before being released
 */

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './nutrivault.db',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    // SQLite doesn't support connection pooling, but we configure it anyway
    // for consistency and future migration to PostgreSQL
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nutrivault',
    username: process.env.DB_USER || 'nutrivault_user',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false // For cloud databases with self-signed certs
    } : false,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    
    // Optimized connection pool for production
    pool: {
      // Maximum number of connection in pool
      // Set based on expected concurrent requests
      // Rule of thumb: (core_count * 2) + effective_spindle_count
      // For 4-core server with SSD: (4 * 2) + 1 = 9, round to 10
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      
      // Minimum number of idle connections
      // Keep some connections warm for faster response
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      
      // Maximum time (ms) to try to get connection before throwing error
      // 30 seconds is reasonable for most applications
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      
      // Maximum time (ms) that a connection can be idle before being released
      // 10 seconds balances connection reuse with resource cleanup
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
      
      // Maximum time (ms) that pool will try to get connection before throwing error
      // Should be less than or equal to acquire
      evict: parseInt(process.env.DB_POOL_EVICT) || 1000,
      
      // Whether to validate connections before use
      // Small performance cost but prevents errors from stale connections
      validate: (client) => {
        // Simple validation - check if connection is alive
        return client && client.readyState === 'open';
      }
    },
    
    // Retry configuration for transient errors
    retry: {
      max: 3,  // Maximum retry attempts
      match: [ // Retry on these error types
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/
      ]
    },
    
    // Statement timeout (ms) - kill queries that run too long
    // Prevents runaway queries from consuming resources
    dialectOptions: {
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30 seconds
      idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000 // 30 seconds
    }
  }
};

