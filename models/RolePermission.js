module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'role_permissions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'permission_id'],
        name: 'unique_role_permission'
      },
      {
        fields: ['role_id']
      },
      {
        fields: ['permission_id']
      }
    ]
  });

  return RolePermission;
};
