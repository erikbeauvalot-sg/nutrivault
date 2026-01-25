'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(`PRAGMA table_info(patients)`);
    const hasColumn = (name) => cols.some(c => c.name === name);

    const columnsToAdd = [
      { name: 'medical_record_number', type: Sequelize.STRING(100) },
      { name: 'insurance_provider', type: Sequelize.STRING(200) },
      { name: 'insurance_policy_number', type: Sequelize.STRING(100) },
      { name: 'primary_care_physician', type: Sequelize.STRING(200) },
      { name: 'current_medications', type: Sequelize.TEXT },
      { name: 'height_cm', type: Sequelize.DECIMAL(5, 2) },
      { name: 'weight_kg', type: Sequelize.DECIMAL(5, 2) },
      { name: 'blood_type', type: Sequelize.STRING(10) },
      { name: 'food_preferences', type: Sequelize.TEXT },
      { name: 'nutritional_goals', type: Sequelize.TEXT },
      { name: 'exercise_habits', type: Sequelize.TEXT },
      { name: 'smoking_status', type: Sequelize.STRING(50) },
      { name: 'alcohol_consumption', type: Sequelize.STRING(50) },
      { name: 'notes', type: Sequelize.TEXT }
    ];

    for (const col of columnsToAdd) {
      if (!hasColumn(col.name)) {
        await queryInterface.addColumn('patients', col.name, {
          type: col.type,
          allowNull: true
        });
      }
    }
  },

  async down (queryInterface, Sequelize) {
    const columns = [
      'notes', 'alcohol_consumption', 'smoking_status', 'exercise_habits',
      'nutritional_goals', 'food_preferences', 'blood_type', 'weight_kg',
      'height_cm', 'current_medications', 'primary_care_physician',
      'insurance_policy_number', 'insurance_provider', 'medical_record_number'
    ];
    for (const col of columns) {
      await queryInterface.removeColumn('patients', col).catch(() => {});
    }
  }
};
