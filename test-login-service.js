/**
 * Direct test of auth service login method
 */

const authService = require('./backend/src/services/auth.service');

async function testLogin() {
  try {
    console.log('🔐 Testing authService.login() directly...\n');
    
    const result = await authService.login('admin', 'Admin123!');
    
    console.log('✅ Login successful!');
    console.log('   User:', result.user.username);
    console.log('   Role:', result.user.role);
    console.log('   Access Token:', result.accessToken ? '✅ Generated' : '❌ Missing');
    console.log('   Refresh Token:', result.refreshToken ? '✅ Generated' : '❌ Missing');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testLogin();
