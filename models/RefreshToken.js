module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'bcrypt hash of refresh token'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['token_hash']
      },
      {
        fields: ['expires_at']
      }
    ]
  });

  return RefreshToken;
};
