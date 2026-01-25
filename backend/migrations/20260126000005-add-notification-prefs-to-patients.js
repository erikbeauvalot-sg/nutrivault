'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add notification preferences to patients table
    await queryInterface.addColumn('patients', 'appointment_reminders_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether patient wants to receive appointment reminder emails'
    });

    await queryInterface.addColumn('patients', 'unsubscribe_token', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Unique token for unsubscribe link'
    });

    // Generate unsubscribe tokens for existing patients
    const patients = await queryInterface.sequelize.query(
      'SELECT id FROM patients',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const patient of patients) {
      await queryInterface.sequelize.query(
        'UPDATE patients SET unsubscribe_token = :token WHERE id = :id',
        {
          replacements: {
            token: uuidv4(),
            id: patient.id
          }
        }
      );
    }

    // Add index for reminder queries
    await queryInterface.addIndex('patients', ['appointment_reminders_enabled'], {
      name: 'idx_patients_reminders_enabled',
      comment: 'Optimize queries filtering by reminder preferences'
    });

    // Add index for unsubscribe token lookups
    await queryInterface.addIndex('patients', ['unsubscribe_token'], {
      name: 'idx_patients_unsubscribe_token',
      unique: true,
      comment: 'Optimize unsubscribe token lookups'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('patients', 'idx_patients_unsubscribe_token');
    await queryInterface.removeIndex('patients', 'idx_patients_reminders_enabled');

    // Remove columns
    await queryInterface.removeColumn('patients', 'unsubscribe_token');
    await queryInterface.removeColumn('patients', 'appointment_reminders_enabled');
  }
};
