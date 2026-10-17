'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('practice_locations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Stable value stored on billing records'
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Shown in the app and written in the accounting export "Structure" column'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Location given to new invoices'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    await queryInterface.addIndex('practice_locations', ['is_active', 'display_order']);

    await queryInterface.addColumn('billing', 'location_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Practice location (practice_locations.code) of the consultation'
    });
    await queryInterface.addIndex('billing', ['location_code'], { name: 'idx_billing_location_code' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('billing', 'idx_billing_location_code');
    await queryInterface.removeColumn('billing', 'location_code');
    await queryInterface.dropTable('practice_locations');
  }
};
