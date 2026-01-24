/**
 * Script to add test measure data for a patient
 * Usage: node scripts/add-test-measures.js
 */

const db = require('../models');

const PATIENT_ID = 'a75c1459-4dab-4686-9a12-6f8c63aa775f'; // Erik

async function addTestMeasures() {
  try {
    // Find weight measure definition
    const weightMeasure = await db.MeasureDefinition.findOne({
      where: { name: 'weight' }
    });

    if (!weightMeasure) {
      console.log('❌ Weight measure definition not found. Creating it...');

      // Create weight measure definition
      const newWeightMeasure = await db.MeasureDefinition.create({
        name: 'weight',
        display_name: 'Weight',
        description: 'Body weight',
        category: 'anthropometric',
        measure_type: 'numeric',
        unit: 'kg',
        min_value: 0,
        max_value: 300,
        decimal_places: 1,
        is_active: true,
        display_order: 1,
        is_system: true
      });

      console.log('✅ Weight measure definition created:', newWeightMeasure.id);
    } else {
      console.log('✅ Weight measure definition found:', weightMeasure.id);
    }

    const measureDefId = weightMeasure?.id || (await db.MeasureDefinition.findOne({ where: { name: 'weight' }})).id;

    // Create test data for the last 90 days
    const today = new Date();
    const testData = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 3)); // Every 3 days

      // Generate realistic weight data (70-75 kg with variation)
      const baseWeight = 72;
      const variation = Math.sin(i / 5) * 2; // Slight wave pattern
      const randomNoise = (Math.random() - 0.5) * 0.5; // Small random variation
      const weight = baseWeight + variation + randomNoise;

      testData.push({
        patient_id: PATIENT_ID,
        measure_definition_id: measureDefId,
        measured_at: date,
        numeric_value: parseFloat(weight.toFixed(1)),
        notes: i === 0 ? 'Most recent measurement' : null,
        recorded_by: PATIENT_ID // Using patient as recorder for test
      });
    }

    // Insert test data
    await db.PatientMeasure.bulkCreate(testData);

    console.log(`✅ Created ${testData.length} test weight measurements for patient Erik`);
    console.log(`   Date range: ${testData[testData.length - 1].measured_at.toISOString().split('T')[0]} to ${testData[0].measured_at.toISOString().split('T')[0]}`);
    console.log(`   Weight range: ${Math.min(...testData.map(d => d.numeric_value)).toFixed(1)} - ${Math.max(...testData.map(d => d.numeric_value)).toFixed(1)} kg`);

    // Verify data
    const count = await db.PatientMeasure.count({
      where: {
        patient_id: PATIENT_ID,
        measure_definition_id: measureDefId
      }
    });

    console.log(`\n✅ Total weight measurements for this patient: ${count}`);
    console.log('\nYou can now view the measures in the patient edit page!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

addTestMeasures();
