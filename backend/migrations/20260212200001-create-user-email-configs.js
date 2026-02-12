'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_email_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      smtp_host: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      smtp_port: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 587
      },
      smtp_secure: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      smtp_user: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      smtp_password: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      from_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      from_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      reply_to: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_email_configs');
  }
};
