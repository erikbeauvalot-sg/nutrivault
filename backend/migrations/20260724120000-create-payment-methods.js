'use strict';

const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_methods', {
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
        comment: 'Stable value stored on billing/expense records'
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      is_card: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Card payment — accounting export deducts the bank commission'
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

    await queryInterface.addIndex('payment_methods', ['is_active', 'display_order']);

    // Seed the defaults matching the values historically hard-coded in the UI.
    const now = new Date();
    const defaults = [
      { code: 'CASH', label: 'Espèces', is_card: false, display_order: 1 },
      { code: 'CHECK', label: 'Chèque', is_card: false, display_order: 2 },
      { code: 'BANK_TRANSFER', label: 'Virement bancaire', is_card: false, display_order: 3 },
      { code: 'CREDIT_CARD', label: 'Carte bancaire', is_card: true, display_order: 4 },
      { code: 'INSURANCE', label: 'Assurance', is_card: false, display_order: 5 },
      { code: 'OTHER', label: 'Autre', is_card: false, display_order: 6 }
    ];
    await queryInterface.bulkInsert('payment_methods', defaults.map(d => ({
      id: randomUUID(),
      ...d,
      is_active: true,
      created_at: now,
      updated_at: now
    })));
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment_methods');
  }
};
