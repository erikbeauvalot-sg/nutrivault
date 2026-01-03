#!/usr/bin/env node
'use strict';

/**
 * Quick test to verify models work correctly
 */

const db = require('../models');

async function testModels() {
  console.log('\n=== Testing Sequelize Models ===\n');

  try {
    // Test 1: Query admin user with role
    console.log('1. Testing User model with Role association...');
    const admin = await db.User.findOne({
      where: { username: 'admin' },
      include: [{ model: db.Role, as: 'role' }]
    });
    console.log(`   Found: ${admin.first_name} ${admin.last_name}`);
    console.log(`   Role: ${admin.role.name}`);
    console.log('   ✓ User-Role association works\n');

    // Test 2: Query admin role with all permissions
    console.log('2. Testing Role model with Permission association...');
    const adminRole = await db.Role.findOne({
      where: { name: 'ADMIN' },
      include: [{ model: db.Permission, as: 'permissions' }]
    });
    console.log(`   Role: ${adminRole.name}`);
    console.log(`   Permissions: ${adminRole.permissions.length}`);
    const samplePerms = adminRole.permissions.slice(0, 3).map(p => p.name);
    console.log(`   Sample: ${samplePerms.join(', ')}...`);
    console.log('   ✓ Role-Permission association works\n');

    // Test 3: Count records in each table
    console.log('3. Testing record counts...');
    const counts = {
      roles: await db.Role.count(),
      permissions: await db.Permission.count(),
      users: await db.User.count(),
      rolePermissions: await db.RolePermission.count()
    };
    console.log(`   Roles: ${counts.roles}`);
    console.log(`   Permissions: ${counts.permissions}`);
    console.log(`   Users: ${counts.users}`);
    console.log(`   Role-Permissions: ${counts.rolePermissions}`);
    console.log('   ✓ All tables accessible\n');

    // Test 4: Verify model methods exist
    console.log('4. Testing model methods...');
    const models = ['User', 'Role', 'Permission', 'Patient', 'Visit',
                    'VisitMeasurement', 'Billing', 'AuditLog',
                    'RefreshToken', 'ApiKey'];
    models.forEach(model => {
      if (db[model] && db[model].findAll) {
        console.log(`   ✓ ${model} model loaded`);
      } else {
        throw new Error(`${model} model not loaded correctly`);
      }
    });
    console.log('   ✓ All models have required methods\n');

    console.log('=== All Tests Passed ===\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

testModels();
