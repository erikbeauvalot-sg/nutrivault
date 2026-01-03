#!/usr/bin/env node
'use strict';

/**
 * Database Verification Script
 * Verifies all models, tables, and seed data are properly set up
 */

const db = require('../models');
const { testConnection } = require('./database');

async function verifyDatabase() {
  console.log('\n========================================');
  console.log('  DATABASE VERIFICATION');
  console.log('========================================\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('   ✓ Database connection successful\n');

    // Count roles
    console.log('2. Verifying roles...');
    const roleCount = await db.Role.count();
    const roles = await db.Role.findAll({ attributes: ['name'] });
    console.log(`   ✓ Found ${roleCount} roles: ${roles.map(r => r.name).join(', ')}\n`);

    // Count permissions
    console.log('3. Verifying permissions...');
    const permissionCount = await db.Permission.count();
    console.log(`   ✓ Found ${permissionCount} permissions\n`);

    // Count role-permission mappings
    console.log('4. Verifying role-permission mappings...');
    const rolePermissionCount = await db.RolePermission.count();
    console.log(`   ✓ Found ${rolePermissionCount} role-permission mappings\n`);

    // Verify admin user
    console.log('5. Verifying admin user...');
    const adminUser = await db.User.findOne({
      where: { username: 'admin' },
      include: [{ model: db.Role, as: 'role' }]
    });
    if (!adminUser) {
      throw new Error('Admin user not found');
    }
    console.log(`   ✓ Admin user found: ${adminUser.username} (${adminUser.email})`);
    console.log(`   ✓ Role: ${adminUser.role.name}\n`);

    // Verify admin permissions
    console.log('6. Verifying admin permissions...');
    const adminRole = await db.Role.findOne({
      where: { name: 'ADMIN' },
      include: [{ model: db.Permission, as: 'permissions' }]
    });
    console.log(`   ✓ Admin role has ${adminRole.permissions.length} permissions\n`);

    // Verify all models are loaded
    console.log('7. Verifying all models...');
    const modelNames = Object.keys(db).filter(key =>
      key !== 'sequelize' && key !== 'Sequelize'
    );
    console.log(`   ✓ Loaded ${modelNames.length} models:`);
    modelNames.forEach(name => console.log(`     - ${name}`));
    console.log('');

    // Verify tables exist
    console.log('8. Verifying database tables...');
    const [results] = await db.sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );
    console.log(`   ✓ Found ${results.length} tables:`);
    results.forEach(table => console.log(`     - ${table.name}`));
    console.log('');

    console.log('========================================');
    console.log('  ✓ DATABASE VERIFICATION COMPLETE');
    console.log('========================================\n');

    console.log('Database is ready for use!\n');
    console.log('Admin credentials:');
    console.log('  Username: admin');
    console.log('  Password: Admin123!');
    console.log('  Email:    admin@nutrivault.local\n');

  } catch (error) {
    console.error('\n✗ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Run verification
verifyDatabase();
