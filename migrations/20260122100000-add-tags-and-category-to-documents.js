'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(documents)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    // Add tags column (JSON array)
    if (!hasColumn('tags')) {
      await queryInterface.addColumn('documents', 'tags', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Array of tags for document organization and search'
      });
    }

    // Add category column
    if (!hasColumn('category')) {
      await queryInterface.addColumn('documents', 'category', {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null,
        comment: 'Document category: recipes, guides, templates, educational, etc.'
      });
    }

    // Add is_template column for library documents
    if (!hasColumn('is_template')) {
      await queryInterface.addColumn('documents', 'is_template', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this document is a reusable template from the library'
      });
    }

    // Add indexes (ignore if exist)
    try { await queryInterface.addIndex('documents', ['category']); } catch (e) {}
    try { await queryInterface.addIndex('documents', ['is_template']); } catch (e) {}
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('documents', ['is_template']).catch(() => {});
    await queryInterface.removeIndex('documents', ['category']).catch(() => {});
    await queryInterface.removeColumn('documents', 'is_template').catch(() => {});
    await queryInterface.removeColumn('documents', 'category').catch(() => {});
    await queryInterface.removeColumn('documents', 'tags').catch(() => {});
  }
};
