'use strict';

module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'permissions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: 'permission_id',
      otherKey: 'role_id',
      as: 'roles'
    });
  };

  return Permission;
};
