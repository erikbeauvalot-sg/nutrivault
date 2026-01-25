/**
 * Test Fixtures Index
 * Central export for all test fixtures
 */

const users = require('./users.fixture');
const patients = require('./patients.fixture');
const visits = require('./visits.fixture');
const billing = require('./billing.fixture');
const customFields = require('./customFields.fixture');
const measures = require('./measures.fixture');
const emailTemplates = require('./emailTemplates.fixture');
const billingTemplates = require('./billingTemplates.fixture');
const invoiceCustomizations = require('./invoiceCustomizations.fixture');
const roles = require('./roles.fixture');

module.exports = {
  users,
  patients,
  visits,
  billing,
  customFields,
  measures,
  emailTemplates,
  billingTemplates,
  invoiceCustomizations,
  roles
};
