'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create billing_template_items table
    await queryInterface.createTable('billing_template_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      billing_template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'billing_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Parent template'
      },
      item_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Service or item name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed item description'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.00,
        comment: 'Quantity of this item'
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Price per unit in euros'
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order of items in template'
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

    // Add indexes for performance
    await queryInterface.addIndex('billing_template_items', ['billing_template_id'], {
      name: 'idx_billing_template_items_template',
      comment: 'Find all items for a template'
    });

    await queryInterface.addIndex('billing_template_items', ['billing_template_id', 'sort_order'], {
      name: 'idx_billing_template_items_sort',
      comment: 'Order items within a template'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('billing_template_items');
  }
};
