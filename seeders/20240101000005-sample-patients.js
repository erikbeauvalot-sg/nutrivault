/**
 * Seeder: Sample Patients
 * Creates sample patients for testing visit management
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { v4: uuidv4 } = require('uuid');
    
    await queryInterface.bulkInsert('patients', [
      {
        id: uuidv4(),
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '555-0101',
        date_of_birth: '1980-05-15',
        gender: 'Male',
        assigned_dietitian_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '555-0102',
        date_of_birth: '1975-09-22',
        gender: 'Female',
        assigned_dietitian_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        first_name: 'Michael',
        last_name: 'Brown',
        email: 'michael.brown@example.com',
        phone: '555-0103',
        date_of_birth: '1990-03-10',
        gender: 'Male',
        assigned_dietitian_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily.davis@example.com',
        phone: '555-0104',
        date_of_birth: '1988-11-30',
        gender: 'Female',
        assigned_dietitian_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('patients', null, {});
  }
};
