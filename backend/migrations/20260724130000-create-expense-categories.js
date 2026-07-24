'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expense_categories', {
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
        comment: 'Stable value stored on expense records'
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      treso_line: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'autres',
        comment: 'TRÉSO CHARGES line fed by this category in the accounting export'
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

    await queryInterface.addIndex('expense_categories', ['is_active', 'display_order']);

    const now = new Date();
    const defaults = [
      { code: 'RENT', label: 'Loyer', treso_line: 'loyer', display_order: 1 },
      { code: 'EQUIPMENT', label: 'Équipement', treso_line: 'autres', display_order: 2 },
      { code: 'SOFTWARE', label: 'Logiciels', treso_line: 'autres', display_order: 3 },
      { code: 'INSURANCE', label: 'Assurance', treso_line: 'assurance', display_order: 4 },
      { code: 'TRAINING', label: 'Formation', treso_line: 'autres', display_order: 5 },
      { code: 'MARKETING', label: 'Marketing', treso_line: 'autres', display_order: 6 },
      { code: 'UTILITIES', label: 'Charges', treso_line: 'autres', display_order: 7 },
      { code: 'STAFF', label: 'Personnel', treso_line: 'autres', display_order: 8 },
      { code: 'PROFESSIONAL_FEES', label: 'Honoraires', treso_line: 'autres', display_order: 9 },
      { code: 'SUPPLIES', label: 'Fournitures', treso_line: 'autres', display_order: 10 },
      { code: 'TRAVEL', label: 'Déplacements', treso_line: 'autres', display_order: 11 },
      { code: 'OTHER', label: 'Autre', treso_line: 'autres', display_order: 12 }
    ];
    await queryInterface.bulkInsert('expense_categories', defaults.map(d => ({
      id: randomUUID(),
      ...d,
      is_active: true,
      created_at: now,
      updated_at: now
    })));
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expense_categories');
  }
};
