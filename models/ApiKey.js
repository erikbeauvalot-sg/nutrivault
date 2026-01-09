module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define('ApiKey', {
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
    key_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Human-readable name for the API key'
    },
    key_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'bcrypt hash of API key'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'NULL means no expiration'
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['key_hash']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  return ApiKey;
};
