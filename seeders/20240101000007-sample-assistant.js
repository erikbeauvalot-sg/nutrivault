/**
 * Seeder: Sample Assistant User
 * Creates a sample assistant user for testing RBAC
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    // Get ASSISTANT role ID from roles table
    const roles = await queryInterface.sequelize.query(
      'SELECT id FROM roles WHERE name = "ASSISTANT" LIMIT 1'
    );

    if (roles[0].length === 0) {
      console.error('❌ ASSISTANT role not found. Please run roles seeder first.');
      return;
    }

    const assistantRoleId = roles[0][0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash('Assistant123!', 12);

    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        username: 'assistant',
        email: 'assistant@example.com',
        password_hash: hashedPassword,
        first_name: 'James',
        last_name: 'Miller',
        phone: '555-0202',
        role_id: assistantRoleId,
        is_active: true,
        failed_login_attempts: 0,
        locked_until: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'DELETE FROM users WHERE username = "assistant"'
    );
  }
};
