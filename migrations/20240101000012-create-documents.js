'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      resource_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'patient, visit, user - polymorphic association'
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'ID of associated resource - polymorphic association'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Relative path from uploads directory'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('documents', ['resource_type']);
    await queryInterface.addIndex('documents', ['resource_id']);
    await queryInterface.addIndex('documents', ['uploaded_by']);
    // Composite index for polymorphic queries
    await queryInterface.addIndex('documents', ['resource_type', 'resource_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('documents');
  }
};
