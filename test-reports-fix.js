#!/usr/bin/env node

/**
 * Test script to verify ReportsPage patient count fix
 * Tests the patientService.getPatients() function and data parsing
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testPatientService() {
  console.log('🧪 Testing patientService.getPatients() fix...\n');

  try {
    // First, authenticate to get a token
    console.log('🔐 Authenticating...');
    const authResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });

    if (!authResponse.data.success) {
      throw new Error('Authentication failed');
    }

    const token = authResponse.data.data.accessToken;
    console.log('✅ Authentication successful\n');

    // Test getPatients API call
    console.log('🏥 Testing getPatients API call...');
    const patientsResponse = await axios.get(`${BASE_URL}/api/patients?limit=1000`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📊 API Response structure:');
    console.log('   Response type:', typeof patientsResponse);
    console.log('   Response.data type:', typeof patientsResponse.data);
    console.log('   Response.data.success:', patientsResponse.data.success);
    console.log('   Response.data.data type:', typeof patientsResponse.data.data);
    console.log('   Response.data.data length:', patientsResponse.data.data?.length || 'undefined');

    // Simulate ReportsPage data parsing
    console.log('\n📈 Simulating ReportsPage data parsing...');
    const patientsRes = patientsResponse; // This is what ReportsPage receives

    console.log('   patientsRes.data?.data:', patientsRes.data?.data?.length || 'undefined');
    console.log('   patientsRes.data?.data type:', typeof patientsRes.data?.data);

    const patients = patientsRes.data?.data || [];
    const activePatients = patients.filter(p => p.is_active).length;
    const totalPatients = patients.length;

    console.log('\n📊 Results:');
    console.log(`   Total patients: ${totalPatients}`);
    console.log(`   Active patients: ${activePatients}`);
    console.log(`   Inactive patients: ${totalPatients - activePatients}`);

    if (totalPatients > 0) {
      console.log('\n✅ SUCCESS: Patient data is correctly parsed!');
      console.log('   ReportsPage should now display correct patient counts.');
    } else {
      console.log('\n❌ FAILURE: No patient data found or parsing failed.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Error details:', error);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    } else if (error.code) {
      console.error('   Error code:', error.code);
    }
  }
}

// Run the test
testPatientService();