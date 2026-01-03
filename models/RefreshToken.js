'use strict';

module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    token_hash: {
      type: DataTypes.STRING(255),
      unique: true,
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
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return RefreshToken;
};
