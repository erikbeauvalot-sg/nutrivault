'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add user_id column to email_templates
    await queryInterface.addColumn('email_templates', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    // Remove the existing unique index on slug
    try {
      await queryInterface.removeIndex('email_templates', 'email_templates_slug');
    } catch (e) {
      // Index may have a different name depending on dialect
      try {
        await queryInterface.removeIndex('email_templates', 'email_templates_slug_unique');
      } catch (e2) {
        console.log('Could not remove slug index, may not exist or have different name:', e2.message);
      }
    }

    // Add composite index on (slug, user_id) - non-unique, uniqueness managed at service level
    await queryInterface.addIndex('email_templates', ['slug', 'user_id'], {
      name: 'email_templates_slug_user_id'
    });

    // Add index on user_id for lookups
    await queryInterface.addIndex('email_templates', ['user_id'], {
      name: 'email_templates_user_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('email_templates', 'email_templates_slug_user_id');
    await queryInterface.removeIndex('email_templates', 'email_templates_user_id');
    await queryInterface.removeColumn('email_templates', 'user_id');

    // Restore unique index on slug
    await queryInterface.addIndex('email_templates', ['slug'], {
      unique: true,
      name: 'email_templates_slug'
    });
  }
};
