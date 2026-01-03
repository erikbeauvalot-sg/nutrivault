'use strict';

module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define('ApiKey', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key_hash: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false
    },
    key_prefix: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  ApiKey.associate = (models) => {
    ApiKey.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    ApiKey.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    ApiKey.hasMany(models.AuditLog, {
      foreignKey: 'api_key_id',
      as: 'auditLogs'
    });
  };

  return ApiKey;
};
