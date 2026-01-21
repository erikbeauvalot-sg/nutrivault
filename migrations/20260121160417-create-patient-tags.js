'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create patient_tags table for many-to-many relationship
    await queryInterface.createTable('patient_tags', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tag_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('patient_tags', ['patient_id']);
    await queryInterface.addIndex('patient_tags', ['tag_name']);
    await queryInterface.addIndex('patient_tags', ['patient_id', 'tag_name'], { unique: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('patient_tags');
  }
};
