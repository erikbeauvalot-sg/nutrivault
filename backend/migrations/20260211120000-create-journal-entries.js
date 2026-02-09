'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create journal_entries table
    await queryInterface.createTable('journal_entries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'patients',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      entry_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      entry_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'note'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      mood: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      energy_level: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      tags: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_private: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create indexes (use try/catch for idempotency in case model sync already created them)
    const tryAddIndex = async (table, fields, options) => {
      try {
        await queryInterface.addIndex(table, fields, options);
      } catch (e) {
        // Index may already exist (e.g., created by model sync in dev)
      }
    };

    await tryAddIndex('journal_entries', ['patient_id'], { name: 'idx_journal_entries_patient' });
    await tryAddIndex('journal_entries', ['entry_date'], { name: 'idx_journal_entries_date' });
    await tryAddIndex('journal_entries', ['patient_id', 'entry_date'], { name: 'idx_journal_entries_patient_date' });

    // 2. Create journal_comments table
    await queryInterface.createTable('journal_comments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      journal_entry_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'journal_entries',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
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
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await tryAddIndex('journal_comments', ['journal_entry_id'], { name: 'idx_journal_comments_entry' });
    await tryAddIndex('journal_comments', ['user_id'], { name: 'idx_journal_comments_user' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('journal_comments');
    await queryInterface.dropTable('journal_entries');
  }
};
