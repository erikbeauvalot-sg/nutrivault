/**
 * Test script to verify patient details API returns all measurements
 */
require('dotenv').config();
const patientService = require('./src/services/patient.service');
const db = require('../models');

(async () => {
  try {
    console.log('🔍 Testing patient details API...\n');

    // Get admin user for the request
    const user = await db.User.findOne({
      where: { username: 'admin' },
      include: [{ model: db.Role, as: 'role' }]
    });

    if (!user) {
      console.error('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('✅ Authenticated as:', user.username, `(${user.role.name})\n`);

    // Test patient ID with known measurements
    const patientId = '2794785d-32e8-4fcc-8a0b-8c70bb284be3';

    const patient = await patientService.getPatientDetails(
      patientId,
      user,
      { ip: '127.0.0.1', userAgent: 'test-script', method: 'GET', path: '/test' }
    );

    console.log('📋 Patient:', patient.first_name, patient.last_name);
    console.log('📊 Total visits:', patient.visits?.length || 0);

    const visitsWithMeasurements = patient.visits?.filter(v => v.measurements?.length > 0) || [];
    console.log('✅ Visits with measurements:', visitsWithMeasurements.length);

    console.log('\n📅 All visits:');
    patient.visits?.forEach((v, i) => {
      const measurementCount = v.measurements?.length || 0;
      const icon = measurementCount > 0 ? '✅' : '⚠️';
      console.log(`  ${icon} ${i+1}. ${v.visit_date.toISOString().split('T')[0]} - Status: ${v.status} - Measurements: ${measurementCount}`);

      if (v.measurements && v.measurements.length > 0) {
        v.measurements.forEach((m, idx) => {
          console.log(`     ${idx+1}. Weight: ${m.weight_kg}kg, Height: ${m.height_cm}cm, BMI: ${m.bmi}`);
          console.log(`        BP: ${m.blood_pressure_systolic || 'N/A'}/${m.blood_pressure_diastolic || 'N/A'}`);
          console.log(`        Waist: ${m.waist_circumference_cm || 'N/A'}cm, Body Fat: ${m.body_fat_percentage || 'N/A'}%`);
        });
      }
    });

    console.log('\n✅ Test completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total visits: ${patient.visits?.length || 0}`);
    console.log(`   - Visits with measurements: ${visitsWithMeasurements.length}`);
    console.log(`   - Total measurements: ${visitsWithMeasurements.reduce((sum, v) => sum + v.measurements.length, 0)}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
})();
