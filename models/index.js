const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import all models
db.Role = require('./Role')(sequelize, DataTypes);
db.User = require('./User')(sequelize, DataTypes);
db.Permission = require('./Permission')(sequelize, DataTypes);
db.RolePermission = require('./RolePermission')(sequelize, DataTypes);
db.Patient = require('./Patient')(sequelize, DataTypes);
db.PatientTag = require('./PatientTag')(sequelize, DataTypes);
db.Visit = require('./Visit')(sequelize, DataTypes);
db.VisitMeasurement = require('./VisitMeasurement')(sequelize, DataTypes);
db.Billing = require('./Billing')(sequelize, DataTypes);
db.Payment = require('./Payment')(sequelize, DataTypes);
db.InvoiceEmail = require('./InvoiceEmail')(sequelize, DataTypes);
db.Document = require('./Document')(sequelize, DataTypes);
db.DocumentShare = require('./DocumentShare')(sequelize, DataTypes);
db.AuditLog = require('./AuditLog')(sequelize, DataTypes);
db.RefreshToken = require('./RefreshToken')(sequelize, DataTypes);
db.ApiKey = require('./ApiKey')(sequelize, DataTypes);
db.CustomFieldCategory = require('./CustomFieldCategory')(sequelize, DataTypes);
db.CustomFieldDefinition = require('./CustomFieldDefinition')(sequelize, DataTypes);
db.PatientCustomFieldValue = require('./PatientCustomFieldValue')(sequelize, DataTypes);
db.VisitCustomFieldValue = require('./VisitCustomFieldValue')(sequelize, DataTypes);
db.CustomFieldTranslation = require('./CustomFieldTranslation')(sequelize, DataTypes);
db.MeasureDefinition = require('./MeasureDefinition')(sequelize, DataTypes);
db.PatientMeasure = require('./PatientMeasure')(sequelize, DataTypes);

// Define associations
// User - Role relationship
db.User.belongsTo(db.Role, {
  foreignKey: 'role_id',
  as: 'role'
});
db.Role.hasMany(db.User, {
  foreignKey: 'role_id',
  as: 'users'
});

// Role - Permission many-to-many relationship
db.Role.belongsToMany(db.Permission, {
  through: db.RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions'
});
db.Permission.belongsToMany(db.Role, {
  through: db.RolePermission,
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles'
});

// RolePermission also needs direct associations for verification queries
db.RolePermission.belongsTo(db.Role, {
  foreignKey: 'role_id',
  as: 'role'
});
db.RolePermission.belongsTo(db.Permission, {
  foreignKey: 'permission_id',
  as: 'permission'
});

// Patient - User (assigned dietitian) relationship
db.Patient.belongsTo(db.User, {
  foreignKey: 'assigned_dietitian_id',
  as: 'assigned_dietitian'
});
db.User.hasMany(db.Patient, {
  foreignKey: 'assigned_dietitian_id',
  as: 'assigned_patients'
});

// Patient - PatientTag relationship (tags for patient segmentation)
db.PatientTag.belongsTo(db.Patient, {
  foreignKey: 'patient_id',
  as: 'tagged_patient'
});
db.Patient.hasMany(db.PatientTag, {
  foreignKey: 'patient_id',
  as: 'tags'
});

// Visit - Patient relationship
db.Visit.belongsTo(db.Patient, {
  foreignKey: 'patient_id',
  as: 'patient'
});
db.Patient.hasMany(db.Visit, {
  foreignKey: 'patient_id',
  as: 'visits'
});

// Visit - User (dietitian) relationship
db.Visit.belongsTo(db.User, {
  foreignKey: 'dietitian_id',
  as: 'dietitian'
});
db.User.hasMany(db.Visit, {
  foreignKey: 'dietitian_id',
  as: 'dietitian_visits'
});

// VisitMeasurement - Visit relationship
// Beta feature: Changed from hasOne to hasMany to support measurement history
db.VisitMeasurement.belongsTo(db.Visit, {
  foreignKey: 'visit_id',
  as: 'visit'
});
db.Visit.hasMany(db.VisitMeasurement, {
  foreignKey: 'visit_id',
  as: 'measurements'
});

// Billing - Patient relationship
db.Billing.belongsTo(db.Patient, {
  foreignKey: 'patient_id',
  as: 'patient'
});
db.Patient.hasMany(db.Billing, {
  foreignKey: 'patient_id',
  as: 'billing_records'
});

// Billing - Visit relationship
db.Billing.belongsTo(db.Visit, {
  foreignKey: 'visit_id',
  as: 'visit'
});
db.Visit.hasOne(db.Billing, {
  foreignKey: 'visit_id',
  as: 'billing'
});

// Payment - Billing relationship
db.Payment.belongsTo(db.Billing, {
  foreignKey: 'billing_id',
  as: 'invoice'
});
db.Billing.hasMany(db.Payment, {
  foreignKey: 'billing_id',
  as: 'payments'
});

// Payment - User (recorded_by) relationship
db.Payment.belongsTo(db.User, {
  foreignKey: 'recorded_by',
  as: 'recorder'
});
db.User.hasMany(db.Payment, {
  foreignKey: 'recorded_by',
  as: 'recorded_payments'
});

// InvoiceEmail - Billing relationship
db.InvoiceEmail.belongsTo(db.Billing, {
  foreignKey: 'billing_id',
  as: 'invoice'
});
db.Billing.hasMany(db.InvoiceEmail, {
  foreignKey: 'billing_id',
  as: 'email_history'
});

// InvoiceEmail - User (sent_by) relationship
db.InvoiceEmail.belongsTo(db.User, {
  foreignKey: 'sent_by',
  as: 'sender'
});
db.User.hasMany(db.InvoiceEmail, {
  foreignKey: 'sent_by',
  as: 'sent_invoice_emails'
});

// Document - User (uploaded_by) relationship
db.Document.belongsTo(db.User, {
  foreignKey: 'uploaded_by',
  as: 'uploader'
});
db.User.hasMany(db.Document, {
  foreignKey: 'uploaded_by',
  as: 'uploaded_documents'
});

// DocumentShare - Document relationship
db.DocumentShare.belongsTo(db.Document, {
  foreignKey: 'document_id',
  as: 'document'
});
db.Document.hasMany(db.DocumentShare, {
  foreignKey: 'document_id',
  as: 'shares'
});

// DocumentShare - Patient relationship
db.DocumentShare.belongsTo(db.Patient, {
  foreignKey: 'patient_id',
  as: 'patient'
});
db.Patient.hasMany(db.DocumentShare, {
  foreignKey: 'patient_id',
  as: 'shared_documents'
});

// DocumentShare - User (shared_by) relationship
db.DocumentShare.belongsTo(db.User, {
  foreignKey: 'shared_by',
  as: 'sharedByUser'
});
db.User.hasMany(db.DocumentShare, {
  foreignKey: 'shared_by',
  as: 'documents_shared'
});

// RefreshToken - User relationship
db.RefreshToken.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});
db.User.hasMany(db.RefreshToken, {
  foreignKey: 'user_id',
  as: 'refresh_tokens'
});

// ApiKey - User relationship
db.ApiKey.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});
db.User.hasMany(db.ApiKey, {
  foreignKey: 'user_id',
  as: 'api_keys'
});

// Note: AuditLog does not have FK constraints to preserve audit integrity
// Documents use polymorphic associations (resource_type + resource_id)

// CustomFieldCategory - CustomFieldDefinition relationship
db.CustomFieldCategory.hasMany(db.CustomFieldDefinition, {
  foreignKey: 'category_id',
  as: 'field_definitions'
});
db.CustomFieldDefinition.belongsTo(db.CustomFieldCategory, {
  foreignKey: 'category_id',
  as: 'category'
});

// CustomFieldCategory - User (created_by) relationship
db.CustomFieldCategory.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator'
});
db.User.hasMany(db.CustomFieldCategory, {
  foreignKey: 'created_by',
  as: 'created_field_categories'
});

// CustomFieldDefinition - User (created_by) relationship
db.CustomFieldDefinition.belongsTo(db.User, {
  foreignKey: 'created_by',
  as: 'creator'
});
db.User.hasMany(db.CustomFieldDefinition, {
  foreignKey: 'created_by',
  as: 'created_field_definitions'
});

// CustomFieldDefinition - PatientCustomFieldValue relationship
db.CustomFieldDefinition.hasMany(db.PatientCustomFieldValue, {
  foreignKey: 'field_definition_id',
  as: 'patient_values'
});
db.PatientCustomFieldValue.belongsTo(db.CustomFieldDefinition, {
  foreignKey: 'field_definition_id',
  as: 'field_definition'
});

// Patient - PatientCustomFieldValue relationship
db.Patient.hasMany(db.PatientCustomFieldValue, {
  foreignKey: 'patient_id',
  as: 'custom_field_values'
});
db.PatientCustomFieldValue.belongsTo(db.Patient, {
  foreignKey: 'patient_id',
  as: 'patient'
});

// PatientCustomFieldValue - User (updated_by) relationship
db.PatientCustomFieldValue.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater'
});
db.User.hasMany(db.PatientCustomFieldValue, {
  foreignKey: 'updated_by',
  as: 'updated_custom_field_values'
});

// CustomFieldDefinition - VisitCustomFieldValue relationship
db.CustomFieldDefinition.hasMany(db.VisitCustomFieldValue, {
  foreignKey: 'field_definition_id',
  as: 'visit_values'
});
db.VisitCustomFieldValue.belongsTo(db.CustomFieldDefinition, {
  foreignKey: 'field_definition_id',
  as: 'field_definition'
});

// Visit - VisitCustomFieldValue relationship
db.Visit.hasMany(db.VisitCustomFieldValue, {
  foreignKey: 'visit_id',
  as: 'custom_field_values'
});
db.VisitCustomFieldValue.belongsTo(db.Visit, {
  foreignKey: 'visit_id',
  as: 'visit'
});

// VisitCustomFieldValue - User (updated_by) relationship
db.VisitCustomFieldValue.belongsTo(db.User, {
  foreignKey: 'updated_by',
  as: 'updater'
});
db.User.hasMany(db.VisitCustomFieldValue, {
  foreignKey: 'updated_by',
  as: 'updated_visit_custom_field_values'
});

// MeasureDefinition - PatientMeasure relationship
db.MeasureDefinition.hasMany(db.PatientMeasure, {
  foreignKey: 'measure_definition_id',
  as: 'measures'
});
db.PatientMeasure.belongsTo(db.MeasureDefinition, {
  foreignKey: 'measure_definition_id',
  as: 'measureDefinition'
});

// PatientMeasure - Patient relationship
db.PatientMeasure.belongsTo(db.Patient, {
  foreignKey: 'patient_id',
  as: 'patient'
});
db.Patient.hasMany(db.PatientMeasure, {
  foreignKey: 'patient_id',
  as: 'measures'
});

// PatientMeasure - Visit relationship (optional)
db.PatientMeasure.belongsTo(db.Visit, {
  foreignKey: 'visit_id',
  as: 'visit'
});
db.Visit.hasMany(db.PatientMeasure, {
  foreignKey: 'visit_id',
  as: 'measures'
});

// PatientMeasure - User (recorded_by) relationship
db.PatientMeasure.belongsTo(db.User, {
  foreignKey: 'recorded_by',
  as: 'recorder'
});
db.User.hasMany(db.PatientMeasure, {
  foreignKey: 'recorded_by',
  as: 'recorded_measures'
});

module.exports = db;
