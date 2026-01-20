require('dotenv').config();
const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'backend', 'data', 'nutrivault.db'),
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
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
    }
  },
  production: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    // SQLite configuration
    storage: process.env.DB_STORAGE || path.join(__dirname, '..', 'backend', 'data', 'nutrivault_prod.db'),
    // PostgreSQL configuration (used when DB_DIALECT=postgres)
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nutrivault',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    logging: false,
    dialectOptions: process.env.DB_DIALECT === 'postgres' ? {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    } : {},
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
};
