module.exports = (sequelize, DataTypes) => {
  const UserSupervisor = sequelize.define('UserSupervisor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    assistant_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    dietitian_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'user_supervisors',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['assistant_id', 'dietitian_id']
      }
    ]
  });

  return UserSupervisor;
};
