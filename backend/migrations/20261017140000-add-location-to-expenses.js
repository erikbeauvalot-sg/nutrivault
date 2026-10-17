'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('expenses', 'location_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Optional practice location (practice_locations.code) of the expense'
    });
    await queryInterface.addIndex('expenses', ['location_code'], { name: 'idx_expenses_location_code' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('expenses', 'idx_expenses_location_code');
    await queryInterface.removeColumn('expenses', 'location_code');
  }
};
