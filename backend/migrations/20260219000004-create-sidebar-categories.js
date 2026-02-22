'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sidebar_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      key: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      label: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: '📁'
      },
      section: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'main'
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_default_open: {
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

    const defaults = [
      { key: 'clinic',        label: 'Clinique',       icon: '🏥', section: 'main',     display_order: 1, is_default_open: true  },
      { key: 'nutrition',     label: 'Nutrition',      icon: '🥗', section: 'main',     display_order: 2, is_default_open: true  },
      { key: 'communication', label: 'Communication',  icon: '💬', section: 'main',     display_order: 3, is_default_open: true  },
      { key: 'finance',       label: 'Finance',        icon: '💰', section: 'main',     display_order: 4, is_default_open: true  },
      { key: 'data',          label: 'Données',        icon: '📊', section: 'main',     display_order: 5, is_default_open: true  },
      { key: 'admin',         label: 'Administration', icon: '⚙️', section: 'main',     display_order: 6, is_default_open: true  },
      { key: 'settings',      label: 'Paramètres',     icon: '🔧', section: 'settings', display_order: 1, is_default_open: false },
    ];

    await queryInterface.bulkInsert('sidebar_categories', defaults.map(d => ({
      id: uuidv4(),
      key: d.key,
      label: d.label,
      icon: d.icon,
      section: d.section,
      display_order: d.display_order,
      is_default_open: d.is_default_open,
      created_at: new Date(),
      updated_at: new Date()
    })));
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sidebar_categories');
  }
};
