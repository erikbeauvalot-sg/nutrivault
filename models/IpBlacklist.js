module.exports = (sequelize, DataTypes) => {
  const IpBlacklist = sequelize.define('IpBlacklist', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    auto_blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    blocked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    unblocked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    unblocked_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'ip_blacklist',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['ip_address'] },
      { fields: ['is_active'] }
    ]
  });

  return IpBlacklist;
};
