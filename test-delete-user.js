#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testDeleteUser() {
  try {
    console.log('🧪 Testing Delete User Endpoint\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Get list of users
    console.log('2️⃣ Fetching users list...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const users = usersResponse.data.data;
    console.log(`✅ Found ${users.length} users`);
    
    // Find a user that's not admin to delete
    const targetUser = users.find(u => u.username !== 'admin');
    if (!targetUser) {
      console.log('❌ No non-admin users found to test delete');
      return;
    }
    
    console.log(`   Target user: ${targetUser.username} (${targetUser.id})\n`);

    // Step 3: Delete the user
    console.log(`3️⃣ Deleting user: ${targetUser.username}`);
    const deleteResponse = await axios.delete(`${BASE_URL}/api/users/${targetUser.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Delete successful!');
    console.log(`   Response:`, JSON.stringify(deleteResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR:\n');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.statusText}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

testDeleteUser();
