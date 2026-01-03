'use strict';

module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define('RolePermission', {
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'permissions',
        key: 'id'
      }
    }
  }, {
    tableName: 'role_permissions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  RolePermission.associate = (models) => {
    // No additional associations needed - handled by belongsToMany
  };

  return RolePermission;
};
