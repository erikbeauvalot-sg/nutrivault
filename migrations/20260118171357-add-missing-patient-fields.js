'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add missing patient fields that exist in the model but not in the database
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

    await queryInterface.addColumn('patients', 'current_medications', {
      type: Sequelize.TEXT,
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

    await queryInterface.addColumn('patients', 'blood_type', {
      type: Sequelize.STRING(10),
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
  },

  async down (queryInterface, Sequelize) {
    // Remove the added columns in reverse order
    await queryInterface.removeColumn('patients', 'notes');
    await queryInterface.removeColumn('patients', 'alcohol_consumption');
    await queryInterface.removeColumn('patients', 'smoking_status');
    await queryInterface.removeColumn('patients', 'exercise_habits');
    await queryInterface.removeColumn('patients', 'nutritional_goals');
    await queryInterface.removeColumn('patients', 'food_preferences');
    await queryInterface.removeColumn('patients', 'blood_type');
    await queryInterface.removeColumn('patients', 'weight_kg');
    await queryInterface.removeColumn('patients', 'height_cm');
    await queryInterface.removeColumn('patients', 'current_medications');
    await queryInterface.removeColumn('patients', 'primary_care_physician');
    await queryInterface.removeColumn('patients', 'insurance_policy_number');
    await queryInterface.removeColumn('patients', 'insurance_provider');
    await queryInterface.removeColumn('patients', 'medical_record_number');
  }
};
