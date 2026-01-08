#!/usr/bin/env node
/**
 * Admin User Management CLI
 * 
 * Commands:
 * - node src/cli/manage-admin.js create <username> <email> <firstname> <lastname> [password]
 * - node src/cli/manage-admin.js reset-password <username> [new-password]
 */

const db = require('../../models');
const { hashPassword, validatePasswordStrength, generateRandomPassword } = require('../auth/password');

/**
 * Create a new admin user
 */
async function createAdmin(username, email, firstName, lastName, password) {
  try {
    // Generate password if not provided
    if (!password) {
      password = generateRandomPassword(16);
      console.log(`\n🔑 Generated password: ${password}`);
      console.log('⚠️  Please save this password securely!\n');
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      console.error('❌ Password does not meet requirements:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Find ADMIN role
    const adminRole = await db.Role.findOne({
      where: { name: 'ADMIN' }
    });

    if (!adminRole) {
      console.error('❌ ADMIN role not found. Please run database seeds first.');
      process.exit(1);
    }

    // Check if username already exists
    const existingUser = await db.User.findOne({
      where: { username }
    });

    if (existingUser) {
      console.error(`❌ Username '${username}' already exists.`);
      process.exit(1);
    }

    // Check if email already exists
    const existingEmail = await db.User.findOne({
      where: { email }
    });

    if (existingEmail) {
      console.error(`❌ Email '${email}' already exists.`);
      process.exit(1);
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create admin user
    const admin = await db.User.create({
      username,
      email,
      password_hash,
      first_name: firstName,
      last_name: lastName,
      role_id: adminRole.id,
      is_active: true,
      failed_login_attempts: 0
    });

    console.log('✅ Admin user created successfully!');
    console.log('\nUser Details:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
    console.log(`   Role: ADMIN`);
    console.log(`   ID: ${admin.id}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

/**
 * Reset admin user password
 */
async function resetPassword(username, newPassword) {
  try {
    // Find user
    const user = await db.User.findOne({
      where: { username },
      include: [{
        model: db.Role,
        as: 'role'
      }]
    });

    if (!user) {
      console.error(`❌ User '${username}' not found.`);
      process.exit(1);
    }

    // Check if user is admin
    if (user.role.name !== 'ADMIN') {
      console.error(`❌ User '${username}' is not an admin.`);
      console.log(`   Current role: ${user.role.name}`);
      process.exit(1);
    }

    // Generate password if not provided
    if (!newPassword) {
      newPassword = generateRandomPassword(16);
      console.log(`\n🔑 Generated password: ${newPassword}`);
      console.log('⚠️  Please save this password securely!\n');
    }

    // Validate password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      console.error('❌ Password does not meet requirements:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Hash password
    const password_hash = await hashPassword(newPassword);

    // Update user
    await user.update({
      password_hash,
      failed_login_attempts: 0,
      locked_until: null
    });

    console.log('✅ Password reset successfully!');
    console.log('\nUser Details:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  }
}

/**
 * Show usage instructions
 */
function showUsage() {
  console.log(`
NutriVault - Admin User Management CLI

Usage:
  node src/cli/manage-admin.js create <username> <email> <firstname> <lastname> [password]
  node src/cli/manage-admin.js reset-password <username> [new-password]

Commands:
  create          Create a new admin user
  reset-password  Reset an admin user's password

Arguments:
  username        Unique username for the admin
  email           Email address for the admin
  firstname       First name
  lastname        Last name
  password        Password (optional, will be generated if not provided)
  new-password    New password (optional, will be generated if not provided)

Examples:
  # Create admin with generated password
  node src/cli/manage-admin.js create johndoe john@example.com John Doe

  # Create admin with specific password
  node src/cli/manage-admin.js create johndoe john@example.com John Doe MySecurePass123!

  # Reset password with generated password
  node src/cli/manage-admin.js reset-password johndoe

  # Reset password with specific password
  node src/cli/manage-admin.js reset-password johndoe NewSecurePass123!

Password Requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
`);
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showUsage();
    process.exit(0);
  }

    // Show database info
    const env = process.env.NODE_ENV || 'development';
    const dbDialect = db.sequelize.getDialect();
    console.log(`\n💾 Using database: ${dbDialect.toUpperCase()} (${env} environment)\n`);

  try {
    switch (command) {
      case 'create':
        if (args.length < 5) {
          console.error('❌ Missing required arguments for create command');
          showUsage();
          process.exit(1);
        }
        await createAdmin(args[1], args[2], args[3], args[4], args[5]);
        break;

      case 'reset-password':
        if (args.length < 2) {
          console.error('❌ Missing required arguments for reset-password command');
          showUsage();
          process.exit(1);
        }
        await resetPassword(args[1], args[2]);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

// Run CLI
main();
