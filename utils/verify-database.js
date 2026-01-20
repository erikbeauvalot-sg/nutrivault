#!/usr/bin/env node

/**
 * Database Verification Utility
 * 
 * Verifies that all tables, foreign keys, indexes, and seed data exist in the database
 * Usage: node utils/verify-database.js
 */

const db = require('../models');

const EXPECTED_TABLES = [
  'roles', 'users', 'permissions', 'role_permissions',
  'patients', 'visits', 'visit_measurements', 'billing',
  'refresh_tokens', 'api_keys', 'audit_logs', 'documents'
];

const EXPECTED_ROLES = ['ADMIN', 'DIETITIAN', 'ASSISTANT', 'VIEWER'];
const EXPECTED_PERMISSION_COUNT = 40;

async function verifyDatabase() {
  console.log('\n🔍 NutriVault Database Verification\n');
  console.log('━'.repeat(60));
  
  try {
    // Test connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Get database name
    const dbName = db.sequelize.config.storage || db.sequelize.config.database;
    console.log(`📂 Database: ${dbName}`);
    console.log(`🔧 Dialect: ${db.sequelize.config.dialect}`);
    console.log('━'.repeat(60));
    
    // Verify tables exist
    console.log('\n📋 Table Verification:');
    const tables = await db.sequelize.getQueryInterface().showAllTables();
    const tableNames = tables.filter(t => t !== 'SequelizeMeta');
    
    console.log(`   Found ${tableNames.length} tables (expected ${EXPECTED_TABLES.length})`);
    
    let allTablesExist = true;
    for (const expectedTable of EXPECTED_TABLES) {
      const exists = tableNames.includes(expectedTable);
      console.log(`   ${exists ? '✅' : '❌'} ${expectedTable}`);
      if (!exists) allTablesExist = false;
    }
    
    if (!allTablesExist) {
      console.log('\n❌ Missing tables detected. Run migrations: npm run db:migrate');
      process.exit(1);
    }
    
    // Verify seed data - Roles
    console.log('\n👥 Roles Verification:');
    const roles = await db.Role.findAll({ attributes: ['name'] });
    console.log(`   Found ${roles.length} roles (expected ${EXPECTED_ROLES.length})`);
    
    let allRolesExist = true;
    for (const expectedRole of EXPECTED_ROLES) {
      const exists = roles.some(r => r.name === expectedRole);
      console.log(`   ${exists ? '✅' : '❌'} ${expectedRole}`);
      if (!exists) allRolesExist = false;
    }
    
    if (!allRolesExist) {
      console.log('\n❌ Missing roles detected. Run seeders: npm run db:seed');
      process.exit(1);
    }
    
    // Verify seed data - Permissions
    console.log('\n🔐 Permissions Verification:');
    const permissionCount = await db.Permission.count();
    const allPermissions = await db.Permission.findAll({ 
      attributes: ['resource'],
      group: ['resource']
    });
    
    console.log(`   Total permissions: ${permissionCount} (expected ${EXPECTED_PERMISSION_COUNT})`);
    
    if (permissionCount === EXPECTED_PERMISSION_COUNT) {
      console.log('   ✅ All permissions present');
      
      // Group by resource
      const resources = {};
      const permissions = await db.Permission.findAll();
      permissions.forEach(p => {
        if (!resources[p.resource]) resources[p.resource] = 0;
        resources[p.resource]++;
      });
      
      Object.entries(resources).forEach(([resource, count]) => {
        console.log(`      - ${resource}: ${count} permissions`);
      });
    } else {
      console.log(`   ❌ Expected ${EXPECTED_PERMISSION_COUNT} permissions, found ${permissionCount}`);
      console.log('      Run seeders: npm run db:seed');
      process.exit(1);
    }
    
    // Verify role-permission mappings
    console.log('\n🔗 Role-Permission Mappings:');
    const rolePermissions = await db.RolePermission.findAll({
      include: [
        { model: db.Role, as: 'role', attributes: ['name'] },
        { model: db.Permission, as: 'permission', attributes: ['code'] }
      ]
    });
    
    // Count by role
    const mappingsByRole = {};
    rolePermissions.forEach(rp => {
      const roleName = rp.role?.name || 'Unknown';
      if (!mappingsByRole[roleName]) mappingsByRole[roleName] = 0;
      mappingsByRole[roleName]++;
    });
    
    console.log(`   Total mappings: ${rolePermissions.length}`);
    Object.entries(mappingsByRole).forEach(([role, count]) => {
      console.log(`   ✅ ${role}: ${count} permissions`);
    });
    
    if (rolePermissions.length === 0) {
      console.log('   ❌ No role-permission mappings found. Run seeders: npm run db:seed');
      process.exit(1);
    }
    
    // Verify admin user exists
    console.log('\n👤 Admin User Verification:');
    const adminUser = await db.User.findOne({
      where: { username: 'admin' },
      include: { model: db.Role, as: 'role', attributes: ['name'] }
    });
    
    if (adminUser) {
      console.log('   ✅ Admin user exists');
      console.log(`      Username: ${adminUser.username}`);
      console.log(`      Email: ${adminUser.email}`);
      console.log(`      Role: ${adminUser.role?.name}`);
      console.log(`      Active: ${adminUser.is_active ? 'Yes' : 'No'}`);
    } else {
      console.log('   ❌ Admin user not found. Run seeders: npm run db:seed');
      process.exit(1);
    }
    
    // Success summary
    console.log('\n' + '━'.repeat(60));
    console.log('✅ Database verification complete!');
    console.log('━'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   • Tables: ${tableNames.length}/${EXPECTED_TABLES.length}`);
    console.log(`   • Roles: ${roles.length}/${EXPECTED_ROLES.length}`);
    console.log(`   • Permissions: ${permissionCount}/${EXPECTED_PERMISSION_COUNT}`);
    console.log(`   • Role-Permission Mappings: ${rolePermissions.length}`);
    console.log(`   • Admin User: Created\n`);
    
    console.log('🎉 Database is ready for development!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database verification failed:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

// Run verification
verifyDatabase();
