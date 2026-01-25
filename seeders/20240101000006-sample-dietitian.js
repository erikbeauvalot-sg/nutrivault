/**
 * Seeder: Sample Dietitian User
 * Creates a sample dietitian user for testing visit management
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    // Check if dietitian already exists
    const existingDietitian = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM users WHERE username = 'dietitian' OR email = 'dietitian@example.com'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingDietitian[0].count > 0) {
      console.log('ℹ️  Sample dietitian already exists, skipping seed');
      return;
    }

    // Get DIETITIAN role ID from roles table
    const roles = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'DIETITIAN' LIMIT 1"
    );

    if (roles[0].length === 0) {
      console.error('❌ DIETITIAN role not found. Please run roles seeder first.');
      return;
    }

    const dietitianRoleId = roles[0][0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash('Dietitian123!', 12);

    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        username: 'dietitian',
        email: 'dietitian@example.com',
        password_hash: hashedPassword,
        first_name: 'Sarah',
        last_name: 'Wilson',
        phone: '555-0201',
        role_id: dietitianRoleId,
        is_active: false,
        failed_login_attempts: 0,
        locked_until: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      "DELETE FROM users WHERE username = 'dietitian'"
    );
  }
};
