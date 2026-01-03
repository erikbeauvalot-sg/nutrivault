'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize instance
const sequelize = new Sequelize(dbConfig);

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

/**
 * Sync all models with database (use with caution in production)
 * @param {Object} options - Sequelize sync options
 * @returns {Promise<void>}
 */
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  syncDatabase
};
