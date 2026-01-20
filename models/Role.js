module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        isIn: [['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER']]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['name']
      }
    ]
  });

  return Role;
};
