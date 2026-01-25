'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_prompts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      usage: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Usage type: followup, invitation, relance, welcome, etc.'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Display name for the prompt'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of when/how this prompt is used'
      },
      language_code: {
        type: Sequelize.STRING(5),
        allowNull: false,
        defaultValue: 'fr',
        comment: 'Language code (fr, en, es, nl, de)'
      },
      system_prompt: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'System instructions for the AI'
      },
      user_prompt_template: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'User prompt template with {{variables}}'
      },
      available_variables: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'List of available variables for this prompt'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this prompt is active'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the default prompt for its usage+language'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Version number for tracking changes'
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
      updated_by: {
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
    await queryInterface.addIndex('ai_prompts', ['usage', 'language_code', 'is_active'], {
      name: 'idx_ai_prompts_usage_language_active'
    });

    await queryInterface.addIndex('ai_prompts', ['usage', 'language_code', 'is_default'], {
      name: 'idx_ai_prompts_usage_language_default'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_prompts');
  }
};
