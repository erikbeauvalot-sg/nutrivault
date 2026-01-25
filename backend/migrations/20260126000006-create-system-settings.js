'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create system_settings table for application configuration
    await queryInterface.createTable('system_settings', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false
      },
      setting_key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique key for the setting'
      },
      setting_value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Value of the setting (stored as string, parsed based on data_type)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human-readable description of the setting'
      },
      data_type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
        comment: 'Data type for proper parsing of setting_value'
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

    // Add index for setting_key lookups
    await queryInterface.addIndex('system_settings', ['setting_key'], {
      name: 'idx_system_settings_key',
      unique: true
    });

    // Insert default appointment reminder settings
    await queryInterface.bulkInsert('system_settings', [
      {
        id: uuidv4(),
        setting_key: 'appointment_reminders_enabled',
        setting_value: 'true',
        description: 'Enable/disable appointment reminders globally',
        data_type: 'boolean',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        setting_key: 'appointment_reminder_times',
        setting_value: '[24, 168]',
        description: 'Hours before appointment to send reminders (JSON array). 24 = 1 day, 168 = 1 week',
        data_type: 'json',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        setting_key: 'appointment_reminder_cron',
        setting_value: '0 * * * *',
        description: 'Cron schedule for reminder job (default: every hour)',
        data_type: 'string',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        setting_key: 'max_reminders_per_visit',
        setting_value: '2',
        description: 'Maximum number of reminders to send per visit',
        data_type: 'number',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('system_settings');
  }
};
