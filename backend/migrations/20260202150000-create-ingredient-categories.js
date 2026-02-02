'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ingredient_categories table
    await queryInterface.createTable('ingredient_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true
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
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Add indexes
    await queryInterface.addIndex('ingredient_categories', ['is_active']);
    await queryInterface.addIndex('ingredient_categories', ['display_order']);
    await queryInterface.addIndex('ingredient_categories', ['name'], { unique: true });

    // Add category_id column to ingredients table
    await queryInterface.addColumn('ingredients', 'category_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'ingredient_categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for category_id
    await queryInterface.addIndex('ingredients', ['category_id']);

    // Seed default ingredient categories
    const defaultCategories = [
      { id: '10000000-0000-0000-0000-000000000001', name: 'Protéines', icon: '🥩', color: '#e74c3c', display_order: 1 },
      { id: '10000000-0000-0000-0000-000000000002', name: 'Céréales & Féculents', icon: '🌾', color: '#f39c12', display_order: 2 },
      { id: '10000000-0000-0000-0000-000000000003', name: 'Légumes', icon: '🥬', color: '#27ae60', display_order: 3 },
      { id: '10000000-0000-0000-0000-000000000004', name: 'Fruits', icon: '🍎', color: '#e91e63', display_order: 4 },
      { id: '10000000-0000-0000-0000-000000000005', name: 'Produits laitiers', icon: '🧀', color: '#ffc107', display_order: 5 },
      { id: '10000000-0000-0000-0000-000000000006', name: 'Huiles & Graisses', icon: '🫒', color: '#8bc34a', display_order: 6 },
      { id: '10000000-0000-0000-0000-000000000007', name: 'Noix & Graines', icon: '🥜', color: '#795548', display_order: 7 },
      { id: '10000000-0000-0000-0000-000000000008', name: 'Légumineuses', icon: '🫘', color: '#9c27b0', display_order: 8 },
      { id: '10000000-0000-0000-0000-000000000009', name: 'Épices & Aromates', icon: '🌿', color: '#4caf50', display_order: 9 },
      { id: '10000000-0000-0000-0000-000000000010', name: 'Condiments & Sauces', icon: '🧂', color: '#607d8b', display_order: 10 },
      { id: '10000000-0000-0000-0000-000000000011', name: 'Boissons', icon: '🥤', color: '#00bcd4', display_order: 11 },
      { id: '10000000-0000-0000-0000-000000000012', name: 'Autres', icon: '📦', color: '#9e9e9e', display_order: 12 }
    ];

    const now = new Date().toISOString();
    for (const cat of defaultCategories) {
      await queryInterface.bulkInsert('ingredient_categories', [{
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        display_order: cat.display_order,
        is_active: true,
        created_at: now,
        updated_at: now
      }]);
    }

    // Map existing string categories to new category IDs
    const categoryMapping = {
      'proteins': '10000000-0000-0000-0000-000000000001',
      'grains': '10000000-0000-0000-0000-000000000002',
      'vegetables': '10000000-0000-0000-0000-000000000003',
      'fruits': '10000000-0000-0000-0000-000000000004',
      'dairy': '10000000-0000-0000-0000-000000000005',
      'oils': '10000000-0000-0000-0000-000000000006',
      'nuts': '10000000-0000-0000-0000-000000000007',
      'legumes': '10000000-0000-0000-0000-000000000008',
      'spices': '10000000-0000-0000-0000-000000000009',
      'condiments': '10000000-0000-0000-0000-000000000010',
      'beverages': '10000000-0000-0000-0000-000000000011',
      'other': '10000000-0000-0000-0000-000000000012'
    };

    // Update existing ingredients to use the new category_id
    for (const [oldCategory, newCategoryId] of Object.entries(categoryMapping)) {
      await queryInterface.sequelize.query(
        `UPDATE ingredients SET category_id = '${newCategoryId}' WHERE category = '${oldCategory}'`
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove category_id from ingredients
    await queryInterface.removeColumn('ingredients', 'category_id');

    // Drop ingredient_categories table
    await queryInterface.dropTable('ingredient_categories');
  }
};
