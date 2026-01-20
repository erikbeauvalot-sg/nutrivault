'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      key_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Human-readable name for the API key'
      },
      key_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'bcrypt hash of API key'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'NULL means no expiration'
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      usage_count: {
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
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('api_keys', ['user_id']);
    await queryInterface.addIndex('api_keys', ['key_hash']);
    await queryInterface.addIndex('api_keys', ['is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('api_keys');
  }
};
