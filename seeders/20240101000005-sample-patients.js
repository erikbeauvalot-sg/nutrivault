/**
 * Seeder: Sample Patients
 * Creates sample patients for testing visit management
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { v4: uuidv4 } = require('uuid');
    
    // Check if patients already exist
    const existingPatients = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM patients",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (existingPatients[0].count > 0) {
      console.log('ℹ️  Sample patients already exist, skipping seed');
      return;
    }
    
    await queryInterface.bulkInsert('patients', [
      {
        id: uuidv4(),
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '555-0101',
        assigned_dietitian_id: null,
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '555-0102',
        assigned_dietitian_id: null,
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        first_name: 'Michael',
        last_name: 'Brown',
        email: 'michael.brown@example.com',
        phone: '555-0103',
        assigned_dietitian_id: null,
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily.davis@example.com',
        phone: '555-0104',
        assigned_dietitian_id: null,
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('patients', null, {});
  }
};
