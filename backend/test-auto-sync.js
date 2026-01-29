const axios = require('axios');

// Test script for automatic Google Calendar synchronization
async function testAutoSync() {
  try {
    console.log('🔄 Testing automatic Google Calendar synchronization...');

    // Login as admin
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Admin logged in');

    // Create a test visit
    console.log('📅 Creating a test visit...');
    const visitData = {
      patient_id: '550e8400-e29b-41d4-a716-446655440001', // Using a test UUID
      dietitian_id: '650e8400-e29b-41d4-a716-446655440002', // Test dietitian ID
      visit_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      visit_type: 'Consultation',
      status: 'SCHEDULED',
      duration_minutes: 60,
      notes: 'Test visit for auto-sync'
    };

    const createResponse = await axios.post('http://localhost:3001/api/visits', visitData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (createResponse.data.success) {
      console.log('✅ Test visit created:', createResponse.data.data.id);

      // Wait a moment for auto-sync to complete
      console.log('⏳ Waiting for auto-sync to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check visits list (this should trigger agenda access sync)
      console.log('📊 Checking visits list (agenda access)...');
      const visitsResponse = await axios.get('http://localhost:3001/api/visits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`✅ Retrieved ${visitsResponse.data.data.length} visits`);

      // Update the visit
      console.log('📝 Updating the test visit...');
      const updateData = {
        notes: 'Updated test visit for auto-sync - ' + new Date().toISOString()
      };

      const updateResponse = await axios.put(`http://localhost:3001/api/visits/${createResponse.data.data.id}`, updateData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (updateResponse.data.success) {
        console.log('✅ Test visit updated');

        // Wait for auto-sync
        console.log('⏳ Waiting for auto-sync after update...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🎉 Auto-sync test completed successfully!');
        console.log('Check your Google Calendar to verify the events were created/updated.');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAutoSync();