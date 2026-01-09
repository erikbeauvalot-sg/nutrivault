'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get ADMIN role
    const adminRole = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!adminRole || adminRole.length === 0) {
      console.log('❌ ADMIN role not found. Please run roles seeder first.');
      return;
    }

    // Check if admin user already exists
    const existingAdmin = await queryInterface.sequelize.query(
      "SELECT username FROM users WHERE username = 'admin' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingAdmin.length > 0) {
      console.log('ℹ️  Admin user already exists, skipping seed');
      return;
    }

    // Hash the default password
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    const adminUser = {
      id: uuidv4(),
      username: 'admin',
      email: 'admin@nutrivault.local',
      password_hash: passwordHash,
      role_id: adminRole[0].id,
      first_name: 'System',
      last_name: 'Administrator',
      phone: null,
      failed_login_attempts: 0,
      locked_until: null,
      last_login: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    await queryInterface.bulkInsert('users', [adminUser]);
    
    console.log('✅ Created default admin user');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log('   Email: admin@nutrivault.local');
    console.log('');
    console.log('⚠️  WARNING: Change this password before deploying to production!');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { username: 'admin' }, {});
  }
};
