'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get ADMIN role
    const roles = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'ADMIN';",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (roles.length === 0) {
      throw new Error('ADMIN role not found. Please run roles seeder first.');
    }

    const adminRoleId = roles[0].id;

    // Hash the password: Admin123!
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    const adminUser = {
      id: uuidv4(),
      username: 'admin',
      email: 'admin@nutrivault.local',
      password_hash: passwordHash,
      first_name: 'System',
      last_name: 'Administrator',
      role_id: adminRoleId,
      is_active: true,
      failed_login_attempts: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    await queryInterface.bulkInsert('users', [adminUser]);

    console.log('');
    console.log('========================================');
    console.log('  ADMIN USER CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log('  Username: admin');
    console.log('  Password: Admin123!');
    console.log('  Email:    admin@nutrivault.local');
    console.log('========================================');
    console.log('');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { username: 'admin' }, {});
  }
};
