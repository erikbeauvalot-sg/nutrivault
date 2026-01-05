/**
 * Document Model
 *
 * Polymorphic model for file uploads associated with various resources
 * (patients, visits, users)
 */

'use strict';

module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Polymorphic association
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['patients', 'visits', 'users']]
      }
    },
    resource_id: {
      type: DataTypes.UUID,
      allowNull: false
    },

    // Document categorization
    document_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isIn: [[
          'medical_record',
          'lab_result',
          'diet_plan',
          'profile_photo',
          'meal_plan',
          'progress_photo',
          'prescription',
          'insurance_card',
          'consent_form',
          'other'
        ]]
      }
    },

    // File information
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    stored_filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 10485760 // 10MB max
      }
    },

    // Optional metadata
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('metadata');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('metadata', value ? JSON.stringify(value) : null);
      }
    },

    // Audit fields
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['resource_type', 'resource_id'],
        name: 'documents_resource_idx'
      },
      {
        fields: ['document_type'],
        name: 'documents_type_idx'
      },
      {
        fields: ['created_by'],
        name: 'documents_created_by_idx'
      }
    ]
  });

  Document.associate = (models) => {
    // User associations for audit trail
    Document.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    Document.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });

    // Note: Polymorphic associations are handled at the service layer
    // to maintain flexibility across different resource types
  };

  return Document;
};
