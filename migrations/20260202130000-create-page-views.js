'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('page_views', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      page_path: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      visitor_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      session_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      referrer: {
        type: Sequelize.STRING(1000),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      device_type: {
        type: Sequelize.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
        allowNull: false,
        defaultValue: 'unknown'
      },
      browser: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      os: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      utm_source: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      utm_medium: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      utm_campaign: {
        type: Sequelize.STRING(255),
        allowNull: true
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
    await queryInterface.addIndex('page_views', ['page_path']);
    await queryInterface.addIndex('page_views', ['visitor_id']);
    await queryInterface.addIndex('page_views', ['created_at']);
    await queryInterface.addIndex('page_views', ['page_path', 'created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('page_views');
  }
};
