'use strict';

/**
 * Migration: Remove visit_measurements table
 *
 * The old visit_measurements table is replaced by the new flexible
 * patient_measures system (PatientMeasure + MeasureDefinition).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the visit_measurements table
    await queryInterface.dropTable('visit_measurements');
  },

  async down(queryInterface, Sequelize) {
    // Recreate the visit_measurements table
    await queryInterface.createTable('visit_measurements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      visit_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'visits',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      weight_kg: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      height_cm: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      bmi: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true
      },
      blood_pressure_systolic: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      blood_pressure_diastolic: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      waist_circumference_cm: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      body_fat_percentage: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true
      },
      muscle_mass_percentage: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
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

    // Add index on visit_id
    await queryInterface.addIndex('visit_measurements', ['visit_id']);
  }
};
