/**
 * PatientDietitian Model - Many-to-Many junction table
 * Links patients to their dietitians (multiple dietitians per patient)
 */

module.exports = (sequelize, DataTypes) => {
  const PatientDietitian = sequelize.define('PatientDietitian', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    dietitian_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'patient_dietitians',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['patient_id', 'dietitian_id']
      },
      {
        fields: ['dietitian_id']
      }
    ]
  });

  PatientDietitian.associate = function(models) {
    PatientDietitian.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    PatientDietitian.belongsTo(models.User, {
      foreignKey: 'dietitian_id',
      as: 'dietitian'
    });
  };

  return PatientDietitian;
};
