/**
 * MeasureAnnotation Model
 *
 * Stores event markers and annotations for patient measure timelines
 * (e.g., medication changes, lifestyle events, medical procedures)
 *
 * Sprint 4: US-5.4.1 - Trend Visualization with Charts (Phase 3)
 */

module.exports = (sequelize, DataTypes) => {
  const MeasureAnnotation = sequelize.define('MeasureAnnotation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Patient this annotation belongs to'
    },
    measure_definition_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'measure_definitions',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Specific measure this annotation applies to (null = all measures)'
    },
    event_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true
      },
      comment: 'Date of the event/annotation'
    },
    event_type: {
      type: DataTypes.ENUM('medication', 'lifestyle', 'medical', 'other'),
      allowNull: false,
      defaultValue: 'other',
      comment: 'Type of event: medication, lifestyle, medical, other'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      },
      comment: 'Brief title of the annotation'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed description of the event'
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#FF5733',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      },
      comment: 'Hex color code for the marker'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who created this annotation'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft delete timestamp'
    }
  }, {
    tableName: 'measure_annotations',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        name: 'idx_annotations_patient',
        fields: ['patient_id']
      },
      {
        name: 'idx_annotations_date',
        fields: ['event_date']
      },
      {
        name: 'idx_annotations_measure',
        fields: ['measure_definition_id']
      },
      {
        name: 'idx_annotations_patient_measure',
        fields: ['patient_id', 'measure_definition_id']
      },
      {
        name: 'idx_annotations_patient_date',
        fields: ['patient_id', 'event_date']
      }
    ]
  });

  // Associations
  MeasureAnnotation.associate = (models) => {
    // Belongs to Patient
    MeasureAnnotation.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'patient'
    });

    // Belongs to MeasureDefinition (optional)
    MeasureAnnotation.belongsTo(models.MeasureDefinition, {
      foreignKey: 'measure_definition_id',
      as: 'measureDefinition'
    });

    // Belongs to User (creator)
    MeasureAnnotation.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return MeasureAnnotation;
};
