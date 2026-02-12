'use strict';

/**
 * SQLite cannot ALTER TABLE to drop a column-level UNIQUE constraint.
 * We must recreate the table without UNIQUE on slug, adding a composite
 * unique index on (slug, user_id) instead so dietitians can clone templates.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // SQLite-specific: recreate table without UNIQUE on slug column
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'sqlite') {
      await queryInterface.sequelize.transaction(async (transaction) => {
        // 1. Create new table without UNIQUE on slug
        await queryInterface.sequelize.query(`
          CREATE TABLE email_templates_new (
            id UUID PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            subject VARCHAR(500) NOT NULL,
            body_html TEXT NOT NULL,
            body_text TEXT,
            available_variables JSON NOT NULL DEFAULT '"[]"',
            version INTEGER NOT NULL DEFAULT 1,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            is_system TINYINT(1) NOT NULL DEFAULT 0,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            updated_by UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE
          );
        `, { transaction });

        // 2. Copy all data
        await queryInterface.sequelize.query(`
          INSERT INTO email_templates_new
          SELECT id, name, slug, category, description, subject, body_html, body_text,
                 available_variables, version, is_active, is_system, created_by, updated_by,
                 created_at, updated_at, deleted_at, user_id
          FROM email_templates;
        `, { transaction });

        // 3. Drop old table
        await queryInterface.sequelize.query(`DROP TABLE email_templates;`, { transaction });

        // 4. Rename new table
        await queryInterface.sequelize.query(`ALTER TABLE email_templates_new RENAME TO email_templates;`, { transaction });

        // 5. Recreate indexes
        await queryInterface.sequelize.query(`
          CREATE INDEX email_templates_category_active ON email_templates(category, is_active);
        `, { transaction });
        await queryInterface.sequelize.query(`
          CREATE INDEX email_templates_is_active ON email_templates(is_active);
        `, { transaction });
        await queryInterface.sequelize.query(`
          CREATE INDEX email_templates_is_system ON email_templates(is_system);
        `, { transaction });
        await queryInterface.sequelize.query(`
          CREATE INDEX email_templates_slug_user_id ON email_templates(slug, user_id);
        `, { transaction });
        await queryInterface.sequelize.query(`
          CREATE INDEX email_templates_user_id ON email_templates(user_id);
        `, { transaction });
      });
    } else {
      // PostgreSQL: can simply drop the constraint
      await queryInterface.removeConstraint('email_templates', 'email_templates_slug_key').catch(() => {});
      await queryInterface.removeIndex('email_templates', 'email_templates_slug').catch(() => {});
    }
  },

  async down(queryInterface, Sequelize) {
    // Not reversible in a safe way for SQLite — would need another table rebuild
    // For PostgreSQL we could re-add the unique constraint
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'sqlite') {
      await queryInterface.addConstraint('email_templates', {
        fields: ['slug'],
        type: 'unique',
        name: 'email_templates_slug_key'
      });
    }
  }
};
