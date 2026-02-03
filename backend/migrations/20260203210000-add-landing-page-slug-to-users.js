'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'landing_page_slug', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'Internal app path for the dietitian landing page (e.g. /mariondiet)'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'landing_page_slug');
  }
};
