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
db.Document = require('./Document')(sequelize, DataTypes);
db.AuditLog = require('./AuditLog')(sequelize, DataTypes);
db.RefreshToken = require('./RefreshToken')(sequelize, DataTypes);
db.ApiKey = require('./ApiKey')(sequelize, DataTypes);

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

// Document - User (uploaded_by) relationship
db.Document.belongsTo(db.User, {
  foreignKey: 'uploaded_by',
  as: 'uploader'
});
db.User.hasMany(db.Document, {
  foreignKey: 'uploaded_by',
  as: 'uploaded_documents'
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

module.exports = db;
