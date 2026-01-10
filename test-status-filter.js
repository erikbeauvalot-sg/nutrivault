const axios = require('axios');

async function testUserStatusFilter() {
  const BASE_URL = 'http://localhost:3002';

  try {
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');

    const headers = { Authorization: `Bearer ${token}` };

    // Test 1: All Status (empty string) - should show both active and inactive
    console.log('\n📊 Testing "All Status" filter (empty string)...');
    const allStatusResponse = await axios.get(`${BASE_URL}/api/users?is_active=`, { headers });
    const allUsers = allStatusResponse.data.data || [];
    console.log(`✅ All Status: Found ${allUsers.length} users`);

    // Count active vs inactive
    const activeCount = allUsers.filter(u => u.is_active).length;
    const inactiveCount = allUsers.filter(u => !u.is_active).length;
    console.log(`   Active: ${activeCount}, Inactive: ${inactiveCount}`);

    // Test 2: Active only
    console.log('\n📊 Testing "Active only" filter...');
    const activeResponse = await axios.get(`${BASE_URL}/api/users?is_active=true`, { headers });
    const activeUsers = activeResponse.data.data || [];
    console.log(`✅ Active only: Found ${activeUsers.length} users`);
    const allActive = activeUsers.every(u => u.is_active);
    console.log(`   All users active: ${allActive}`);

    // Test 3: Inactive only
    console.log('\n📊 Testing "Inactive only" filter...');
    const inactiveResponse = await axios.get(`${BASE_URL}/api/users?is_active=false`, { headers });
    const inactiveUsers = inactiveResponse.data.data || [];
    console.log(`✅ Inactive only: Found ${inactiveUsers.length} users`);
    const allInactive = inactiveUsers.every(u => !u.is_active);
    console.log(`   All users inactive: ${allInactive}`);

    // Test 4: No filter (default behavior)
    console.log('\n📊 Testing "No filter" (default)...');
    const defaultResponse = await axios.get(`${BASE_URL}/api/users`, { headers });
    const defaultUsers = defaultResponse.data.data || [];
    console.log(`✅ Default (no filter): Found ${defaultUsers.length} users`);
    const defaultActiveCount = defaultUsers.filter(u => u.is_active).length;
    const defaultInactiveCount = defaultUsers.filter(u => !u.is_active).length;
    console.log(`   Active: ${defaultActiveCount}, Inactive: ${defaultInactiveCount}`);

    console.log('\n🎉 Status filter test completed!');
    console.log('Summary:');
    console.log(`- All Status (empty): ${allUsers.length} users (${activeCount} active, ${inactiveCount} inactive)`);
    console.log(`- Active only: ${activeUsers.length} users`);
    console.log(`- Inactive only: ${inactiveUsers.length} users`);
    console.log(`- Default (no filter): ${defaultUsers.length} users (${defaultActiveCount} active, ${defaultInactiveCount} inactive)`);

    if (inactiveCount > 0) {
      console.log('\n✅ SUCCESS: "All Status" filter now shows both active and inactive users!');
    } else {
      console.log('\n⚠️  Note: No inactive users found in database to test with');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testUserStatusFilter();