'use strict';

/**
 * Migration: Simplify Patient Table
 *
 * Removes all fields except essential ones:
 * - id, first_name, last_name, email, phone
 * - assigned_dietitian_id (for RBAC)
 * - is_active, created_at, updated_at
 *
 * All other patient data should be managed via custom fields
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Columns to remove
    const columnsToRemove = [
      'date_of_birth',
      'gender',
      'address',
      'city',
      'state',
      'zip_code',
      'emergency_contact_name',
      'emergency_contact_phone',
      'medical_notes',
      'medical_conditions',
      'allergies',
      'dietary_preferences',
      'dietary_restrictions',
      'blood_type',
      'current_medications',
      'medical_record_number',
      'insurance_provider',
      'insurance_policy_number',
      'primary_care_physician',
      'height_cm',
      'weight_kg',
      'food_preferences',
      'nutritional_goals',
      'exercise_habits',
      'smoking_status',
      'alcohol_consumption',
      'notes'
    ];

    // Remove each column
    for (const column of columnsToRemove) {
      await queryInterface.removeColumn('patients', column);
    }
  },

  async down(queryInterface, Sequelize) {
    // Restore all removed columns
    await queryInterface.addColumn('patients', 'date_of_birth', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'gender', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'address', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'city', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'state', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'zip_code', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'emergency_contact_name', {
      type: Sequelize.STRING(200),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'emergency_contact_phone', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'medical_notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'medical_conditions', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'allergies', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'dietary_preferences', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'dietary_restrictions', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'blood_type', {
      type: Sequelize.STRING(10),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'current_medications', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'medical_record_number', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'insurance_provider', {
      type: Sequelize.STRING(200),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'insurance_policy_number', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'primary_care_physician', {
      type: Sequelize.STRING(200),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'height_cm', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'weight_kg', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'food_preferences', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'nutritional_goals', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'exercise_habits', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'smoking_status', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'alcohol_consumption', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('patients', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
};
