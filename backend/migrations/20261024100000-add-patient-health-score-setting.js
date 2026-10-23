'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    // The row may already exist: PUT /api/app-settings creates it on demand
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM system_settings WHERE setting_key = 'patient_health_score_enabled'"
    );
    if (existing.length > 0) return;

    const now = new Date();
    await queryInterface.bulkInsert('system_settings', [
      {
        id: uuidv4(),
        setting_key: 'patient_health_score_enabled',
        setting_value: 'false',
        description: 'Compute and display the health score on patient detail pages',
        data_type: 'boolean',
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('system_settings', {
      setting_key: 'patient_health_score_enabled'
    });
  }
};
