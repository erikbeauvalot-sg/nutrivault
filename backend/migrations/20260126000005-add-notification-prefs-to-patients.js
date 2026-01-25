'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(patients)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    if (!hasColumn('appointment_reminders_enabled')) {
      await queryInterface.addColumn('patients', 'appointment_reminders_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether patient wants to receive appointment reminder emails'
      });
    }

    if (!hasColumn('unsubscribe_token')) {
      await queryInterface.addColumn('patients', 'unsubscribe_token', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Unique token for unsubscribe link'
      });

      // Generate unsubscribe tokens for existing patients without tokens
      const patients = await queryInterface.sequelize.query(
        'SELECT id FROM patients WHERE unsubscribe_token IS NULL',
        { type: Sequelize.QueryTypes.SELECT }
      );

      for (const patient of patients) {
        await queryInterface.sequelize.query(
          'UPDATE patients SET unsubscribe_token = :token WHERE id = :id',
          { replacements: { token: uuidv4(), id: patient.id } }
        );
      }
    }

    // Add indexes (ignore if exist)
    try {
      await queryInterface.addIndex('patients', ['appointment_reminders_enabled'], {
        name: 'idx_patients_reminders_enabled'
      });
    } catch (e) {}

    try {
      await queryInterface.addIndex('patients', ['unsubscribe_token'], {
        name: 'idx_patients_unsubscribe_token',
        unique: true
      });
    } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('patients', 'idx_patients_unsubscribe_token').catch(() => {});
    await queryInterface.removeIndex('patients', 'idx_patients_reminders_enabled').catch(() => {});
    await queryInterface.removeColumn('patients', 'unsubscribe_token').catch(() => {});
    await queryInterface.removeColumn('patients', 'appointment_reminders_enabled').catch(() => {});
  }
};
