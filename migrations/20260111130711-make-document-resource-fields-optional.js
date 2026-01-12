'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Make resource_type and resource_id nullable to allow general document uploads
    await queryInterface.changeColumn('documents', 'resource_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'patient, visit, user - polymorphic association (optional for general uploads)'
    });

    await queryInterface.changeColumn('documents', 'resource_id', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'ID of associated resource - polymorphic association (optional for general uploads)'
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert to required fields
    await queryInterface.changeColumn('documents', 'resource_type', {
      type: Sequelize.STRING(50),
      allowNull: false,
      comment: 'patient, visit, user - polymorphic association'
    });

    await queryInterface.changeColumn('documents', 'resource_id', {
      type: Sequelize.UUID,
      allowNull: false,
      comment: 'ID of associated resource - polymorphic association'
    });
  }
};
