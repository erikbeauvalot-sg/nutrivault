'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('visits', 'request_message', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Optional message from patient when requesting an appointment'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('visits', 'request_message');
  }
};
