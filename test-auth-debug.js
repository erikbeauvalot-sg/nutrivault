/**
 * Debug script to test authentication
 */

const bcrypt = require('bcryptjs');
const db = require('./models');

async function testAuth() {
  try {
    console.log('🔍 Testing authentication...\n');

    // Find admin user
    const user = await db.User.findOne({
      where: { username: 'admin' },
      include: [
        {
          model: db.Role,
          as: 'role',
          include: [
            {
              model: db.Permission,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:', user.username);
    console.log('   Password hash:', user.password_hash);
    console.log('   Is active:', user.is_active);
    console.log('   Role:', user.role?.name);
    console.log('   Permissions:', user.role?.permissions?.length || 0);

    // Test password comparison
    const testPassword = 'Admin123!';
    console.log('\n🔐 Testing password:', testPassword);
    
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log('   Password match:', isValid ? '✅ YES' : '❌ NO');

    // Test with wrong password
    const wrongPassword = 'WrongPassword';
    const isInvalid = await bcrypt.compare(wrongPassword, user.password_hash);
    console.log('   Wrong password match:', isInvalid ? '❌ ERROR' : '✅ Correctly rejected');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAuth();
