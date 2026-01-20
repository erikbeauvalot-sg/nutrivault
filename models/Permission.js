module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Permission code in format: resource.action (e.g., patients.create)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Resource type: patients, visits, billing, users, etc.'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Action type: create, read, update, delete, etc.'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'permissions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['code']
      },
      {
        fields: ['resource']
      }
    ]
  });

  return Permission;
};
