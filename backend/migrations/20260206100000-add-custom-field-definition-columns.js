'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('custom_field_definitions');

    // Add show_in_basic_info if not exists
    if (!tableInfo.show_in_basic_info) {
      await queryInterface.addColumn('custom_field_definitions', 'show_in_basic_info', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Add show_in_list if not exists
    if (!tableInfo.show_in_list) {
      await queryInterface.addColumn('custom_field_definitions', 'show_in_list', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Add visible_on_creation if not exists
    if (!tableInfo.visible_on_creation) {
      await queryInterface.addColumn('custom_field_definitions', 'visible_on_creation', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Add show_in_visit_list if not exists
    if (!tableInfo.show_in_visit_list) {
      await queryInterface.addColumn('custom_field_definitions', 'show_in_visit_list', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Add formula if not exists (for calculated fields)
    if (!tableInfo.formula) {
      await queryInterface.addColumn('custom_field_definitions', 'formula', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    // Add dependencies if not exists (for calculated fields)
    if (!tableInfo.dependencies) {
      await queryInterface.addColumn('custom_field_definitions', 'dependencies', {
        type: Sequelize.JSON,
        allowNull: true
      });
    }

    // Add decimal_places if not exists (for calculated fields)
    if (!tableInfo.decimal_places) {
      await queryInterface.addColumn('custom_field_definitions', 'decimal_places', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2
      });
    }

    // Add is_calculated if not exists
    if (!tableInfo.is_calculated) {
      await queryInterface.addColumn('custom_field_definitions', 'is_calculated', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('custom_field_definitions');

    if (tableInfo.show_in_basic_info) {
      await queryInterface.removeColumn('custom_field_definitions', 'show_in_basic_info');
    }
    if (tableInfo.show_in_list) {
      await queryInterface.removeColumn('custom_field_definitions', 'show_in_list');
    }
    if (tableInfo.visible_on_creation) {
      await queryInterface.removeColumn('custom_field_definitions', 'visible_on_creation');
    }
    if (tableInfo.show_in_visit_list) {
      await queryInterface.removeColumn('custom_field_definitions', 'show_in_visit_list');
    }
    if (tableInfo.formula) {
      await queryInterface.removeColumn('custom_field_definitions', 'formula');
    }
    if (tableInfo.dependencies) {
      await queryInterface.removeColumn('custom_field_definitions', 'dependencies');
    }
    if (tableInfo.decimal_places) {
      await queryInterface.removeColumn('custom_field_definitions', 'decimal_places');
    }
    if (tableInfo.is_calculated) {
      await queryInterface.removeColumn('custom_field_definitions', 'is_calculated');
    }
  }
};
