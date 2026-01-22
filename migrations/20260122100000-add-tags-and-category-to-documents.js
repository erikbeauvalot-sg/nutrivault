'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add tags column (JSON array)
    await queryInterface.addColumn('documents', 'tags', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Array of tags for document organization and search'
    });

    // Add category column
    await queryInterface.addColumn('documents', 'category', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Document category: recipes, guides, templates, educational, etc.'
    });

    // Add is_template column for library documents
    await queryInterface.addColumn('documents', 'is_template', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this document is a reusable template from the library'
    });

    // Add index for category searches
    await queryInterface.addIndex('documents', ['category']);

    // Add index for template documents
    await queryInterface.addIndex('documents', ['is_template']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('documents', ['is_template']);
    await queryInterface.removeIndex('documents', ['category']);
    await queryInterface.removeColumn('documents', 'is_template');
    await queryInterface.removeColumn('documents', 'category');
    await queryInterface.removeColumn('documents', 'tags');
  }
};
