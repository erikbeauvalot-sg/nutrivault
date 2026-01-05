/**
 * Migration: Create documents table
 *
 * Polymorphic design supporting documents for multiple resource types:
 * - patients (medical records, lab results, diet plans)
 * - visits (meal plans, progress photos)
 * - users (profile photos, credentials)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      // Polymorphic association fields
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of resource: patients, visits, users'
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of the associated resource'
      },

      // Document type categorization
      document_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Category: medical_record, lab_result, diet_plan, profile_photo, meal_plan, progress_photo, etc.'
      },

      // File information
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original name of uploaded file'
      },
      stored_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'UUID-based filename on disk'
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Relative path from uploads root'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'MIME type (e.g., application/pdf, image/jpeg)'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },

      // Optional metadata
      title: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'User-friendly title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional description or notes'
      },
      metadata: {
        type: Sequelize.TEXT, // Will store JSON
        allowNull: true,
        comment: 'Additional metadata as JSON (image dimensions, document properties, etc.)'
      },

      // Audit fields
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes for efficient querying
    await queryInterface.addIndex('documents', ['resource_type', 'resource_id'], {
      name: 'documents_resource_idx'
    });

    await queryInterface.addIndex('documents', ['document_type'], {
      name: 'documents_type_idx'
    });

    await queryInterface.addIndex('documents', ['created_by'], {
      name: 'documents_created_by_idx'
    });

    await queryInterface.addIndex('documents', ['created_at'], {
      name: 'documents_created_at_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('documents');
  }
};
