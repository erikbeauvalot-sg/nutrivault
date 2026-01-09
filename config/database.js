require('dotenv').config();

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './backend/data/nutrivault_poc.db',
    logging: console.log
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    dialect: 'sqlite',
    storage: './backend/data/nutrivault_poc.db',
    logging: false
  }
};
