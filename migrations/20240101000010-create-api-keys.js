'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      key_hash: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: false
      },
      key_prefix: {
        type: Sequelize.STRING(10),
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
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
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('api_keys', ['key_hash']);
    await queryInterface.addIndex('api_keys', ['user_id']);
    await queryInterface.addIndex('api_keys', ['key_prefix']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('api_keys');
  }
};
