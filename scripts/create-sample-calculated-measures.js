/**
 * Create Sample Calculated Measures
 * Sprint 4: US-5.4.2
 */

const db = require('../models');
const { MeasureDefinition } = db;

async function createSampleCalculatedMeasures() {
  try {
    console.log('🚀 Creating sample calculated measures...\n');

    // Get existing measures
    const weight = await MeasureDefinition.findOne({ where: { name: 'weight' } });
    const height = await MeasureDefinition.findOne({ where: { name: 'height' } });
    const systolic = await MeasureDefinition.findOne({ where: { name: 'blood_pressure_systolic' } });
    const diastolic = await MeasureDefinition.findOne({ where: { name: 'blood_pressure_diastolic' } });

    if (!weight || !height) {
      console.error('❌ Weight and Height measures must exist first');
      process.exit(1);
    }

    // 1. BMI - Body Mass Index
    const [bmi, bmiCreated] = await MeasureDefinition.findOrCreate({
      where: { name: 'bmi' },
      defaults: {
        display_name: 'BMI',
        description: 'Body Mass Index calculated from weight and height',
        category: 'anthropometric',
        measure_type: 'calculated',
        unit: 'kg/m²',
        min_value: 10,
        max_value: 60,
        decimal_places: 1,
        is_active: true,
        display_order: 25,
        is_system: false,
        formula: '{weight} / (({height} / 100) * ({height} / 100))',
        dependencies: ['weight', 'height'],
        last_formula_change: new Date()
      }
    });

    if (bmiCreated) {
      console.log('✅ Created BMI measure');
      console.log('   Formula: {weight} / (({height} / 100) * ({height} / 100))');
      console.log('   Dependencies: weight, height\n');
    } else {
      console.log('ℹ️  BMI measure already exists\n');
    }

    // 2. Weight Change
    const [weightChange, weightChangeCreated] = await MeasureDefinition.findOrCreate({
      where: { name: 'weight_change' },
      defaults: {
        display_name: 'Weight Change',
        description: 'Change in weight since last measurement',
        category: 'anthropometric',
        measure_type: 'calculated',
        unit: 'kg',
        min_value: -50,
        max_value: 50,
        decimal_places: 1,
        is_active: true,
        display_order: 26,
        is_system: false,
        formula: '{current:weight} - {previous:weight}',
        dependencies: ['current:weight', 'previous:weight'],
        last_formula_change: new Date()
      }
    });

    if (weightChangeCreated) {
      console.log('✅ Created Weight Change measure');
      console.log('   Formula: {current:weight} - {previous:weight}');
      console.log('   Dependencies: weight (time-series)\n');
    } else {
      console.log('ℹ️  Weight Change measure already exists\n');
    }

    // 3. Mean Arterial Pressure (MAP)
    if (systolic && diastolic) {
      const [map, mapCreated] = await MeasureDefinition.findOrCreate({
        where: { name: 'map' },
        defaults: {
          display_name: 'Mean Arterial Pressure',
          description: 'Average blood pressure during one cardiac cycle',
          category: 'vitals',
          measure_type: 'calculated',
          unit: 'mmHg',
          min_value: 40,
          max_value: 200,
          decimal_places: 0,
          is_active: true,
          display_order: 7,
          is_system: false,
          formula: '{blood_pressure_diastolic} + ({blood_pressure_systolic} - {blood_pressure_diastolic}) / 3',
          dependencies: ['blood_pressure_systolic', 'blood_pressure_diastolic'],
          last_formula_change: new Date()
        }
      });

      if (mapCreated) {
        console.log('✅ Created Mean Arterial Pressure measure');
        console.log('   Formula: {blood_pressure_diastolic} + ({blood_pressure_systolic} - {blood_pressure_diastolic}) / 3');
        console.log('   Dependencies: blood_pressure_systolic, blood_pressure_diastolic\n');
      } else {
        console.log('ℹ️  Mean Arterial Pressure measure already exists\n');
      }
    }

    // 4. Pulse Pressure
    if (systolic && diastolic) {
      const [pulsePressure, pulsePressureCreated] = await MeasureDefinition.findOrCreate({
        where: { name: 'pulse_pressure' },
        defaults: {
          display_name: 'Pulse Pressure',
          description: 'Difference between systolic and diastolic pressure',
          category: 'vitals',
          measure_type: 'calculated',
          unit: 'mmHg',
          min_value: 10,
          max_value: 150,
          decimal_places: 0,
          is_active: true,
          display_order: 8,
          is_system: false,
          formula: '{blood_pressure_systolic} - {blood_pressure_diastolic}',
          dependencies: ['blood_pressure_systolic', 'blood_pressure_diastolic'],
          last_formula_change: new Date()
        }
      });

      if (pulsePressureCreated) {
        console.log('✅ Created Pulse Pressure measure');
        console.log('   Formula: {blood_pressure_systolic} - {blood_pressure_diastolic}');
        console.log('   Dependencies: blood_pressure_systolic, blood_pressure_diastolic\n');
      } else {
        console.log('ℹ️  Pulse Pressure measure already exists\n');
      }
    }

    console.log('✨ Sample calculated measures created successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Log weight and height for a patient');
    console.log('   2. BMI will auto-calculate');
    console.log('   3. Log weight again to see Weight Change');
    console.log('   4. Log blood pressure to see MAP and Pulse Pressure\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample measures:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createSampleCalculatedMeasures();
}

module.exports = createSampleCalculatedMeasures;
