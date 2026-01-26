/**
 * Models Export Test
 * Ensures all model files are properly exported from models/index.js
 *
 * This test prevents errors like "Cannot read property 'findAll' of undefined"
 * when a model exists but isn't exported.
 */

const fs = require('fs');
const path = require('path');

describe('Models Index', () => {
  const modelsDir = path.join(__dirname, '../../models');
  const db = require('../../models');

  // Get all model files (excluding index.js)
  const modelFiles = fs.readdirSync(modelsDir)
    .filter(file => file.endsWith('.js') && file !== 'index.js')
    .map(file => file.replace('.js', ''));

  test('db object should have sequelize and Sequelize', () => {
    expect(db.sequelize).toBeDefined();
    expect(db.Sequelize).toBeDefined();
  });

  test.each(modelFiles)('Model %s should be exported from index.js', (modelName) => {
    expect(db[modelName]).toBeDefined();
    expect(typeof db[modelName]).toBe('function'); // Sequelize models are functions
  });

  test('All exported models should have required methods', () => {
    const requiredMethods = ['findAll', 'findOne', 'findByPk', 'create', 'update', 'destroy'];

    Object.keys(db).forEach(key => {
      // Skip non-model properties
      if (key === 'sequelize' || key === 'Sequelize') return;

      const model = db[key];
      if (typeof model === 'function' && model.prototype) {
        requiredMethods.forEach(method => {
          expect(model[method]).toBeDefined();
        });
      }
    });
  });

  // List of expected models (update this when adding new models)
  const expectedModels = [
    'Role',
    'User',
    'Permission',
    'RolePermission',
    'Patient',
    'PatientTag',
    'Visit',
    'Billing',
    'Payment',
    'InvoiceEmail',
    'Document',
    'DocumentShare',
    'AuditLog',
    'RefreshToken',
    'ApiKey',
    'CustomFieldCategory',
    'CustomFieldDefinition',
    'PatientCustomFieldValue',
    'VisitCustomFieldValue',
    'CustomFieldTranslation',
    'MeasureDefinition',
    'MeasureTranslation',
    'PatientMeasure',
    'MeasureAlert',
    'MeasureAnnotation',
    'EmailTemplate',
    'EmailLog',
    'SystemSetting',
    'BillingTemplate',
    'BillingTemplateItem',
    'InvoiceCustomization',
    'AIPrompt'
  ];

  test.each(expectedModels)('Expected model %s should be exported', (modelName) => {
    expect(db[modelName]).toBeDefined();
  });
});
