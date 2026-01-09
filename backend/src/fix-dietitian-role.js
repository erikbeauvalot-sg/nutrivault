#!/usr/bin/env node

/**
 * Fix Dietitian Role
 * Updates the dietitian user to have DIETITIAN role instead of ADMIN
 * Run this ONCE after backend is running:
 * node src/fix-dietitian-role.js
 */

const db = require('../../models');

async function fixDietitianRole() {
  try {
    console.log('🔧 Fixing dietitian user role...\n');

    // Get DIETITIAN role
    const dietitianRole = await db.Role.findOne({
      where: { name: 'DIETITIAN' }
    });

    if (!dietitianRole) {
      console.error('❌ DIETITIAN role not found in database');
      process.exit(1);
    }

    // Update dietitian user to have DIETITIAN role
    const result = await db.User.update(
      { role_id: dietitianRole.id },
      { where: { username: 'dietitian' } }
    );

    console.log(`✅ Updated ${result[0]} user(s)`);
    
    // Verify the change
    const updatedUser = await db.User.findOne({
      where: { username: 'dietitian' },
      include: [{ model: db.Role, as: 'role' }]
    });

    console.log('\n📋 Dietitian user now has role:', updatedUser.role.name);
    console.log('✅ Done!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDietitianRole();
