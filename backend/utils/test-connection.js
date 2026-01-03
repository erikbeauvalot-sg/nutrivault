const { Sequelize } = require('sequelize');
const config = require('../config/database.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    console.log(`📁 Database: ${dbConfig.storage || dbConfig.database}`);
    console.log(`🔧 Dialect: ${dbConfig.dialect}`);
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
}

testConnection();
