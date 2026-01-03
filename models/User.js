'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role'
    });
    User.hasMany(models.Patient, {
      foreignKey: 'assigned_dietitian_id',
      as: 'assignedPatients'
    });
    User.hasMany(models.Patient, {
      foreignKey: 'created_by',
      as: 'createdPatients'
    });
    User.hasMany(models.ApiKey, {
      foreignKey: 'user_id',
      as: 'apiKeys'
    });
    User.hasMany(models.RefreshToken, {
      foreignKey: 'user_id',
      as: 'refreshTokens'
    });
  };

  return User;
};
