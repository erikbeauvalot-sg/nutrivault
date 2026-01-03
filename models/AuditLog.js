'use strict';

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    resource_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    request_method: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    request_path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    severity: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    api_key_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'api_keys',
        key: 'id'
      }
    }
  }, {
    tableName: 'audit_logs',
    timestamps: false
  });

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    AuditLog.belongsTo(models.ApiKey, {
      foreignKey: 'api_key_id',
      as: 'apiKey'
    });
  };

  return AuditLog;
};
