'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seed: Default Measure Definitions
 * Sprint 3: US-5.3.1 - Define Custom Measures
 *
 * Pre-configured default measures for common health tracking
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if measures already exist
    const existingMeasures = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as count FROM measure_definitions WHERE is_system = true",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingMeasures[0].count > 0) {
      console.log('ℹ️  Default measures already exist, skipping seed');
      return;
    }

    const now = new Date();

    const defaultMeasures = [
      // Vitals
      {
        id: uuidv4(),
        name: 'weight',
        display_name: 'Weight',
        description: 'Body weight measurement',
        category: 'vitals',
        measure_type: 'numeric',
        unit: 'kg',
        min_value: 0.5,
        max_value: 500,
        decimal_places: 1,
        is_active: true,
        display_order: 1,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'height',
        display_name: 'Height',
        description: 'Body height measurement',
        category: 'anthropometric',
        measure_type: 'numeric',
        unit: 'cm',
        min_value: 30,
        max_value: 300,
        decimal_places: 1,
        is_active: true,
        display_order: 2,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'blood_pressure_systolic',
        display_name: 'Blood Pressure (Systolic)',
        description: 'Systolic blood pressure',
        category: 'vitals',
        measure_type: 'numeric',
        unit: 'mmHg',
        min_value: 50,
        max_value: 300,
        decimal_places: 0,
        is_active: true,
        display_order: 3,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'blood_pressure_diastolic',
        display_name: 'Blood Pressure (Diastolic)',
        description: 'Diastolic blood pressure',
        category: 'vitals',
        measure_type: 'numeric',
        unit: 'mmHg',
        min_value: 30,
        max_value: 200,
        decimal_places: 0,
        is_active: true,
        display_order: 4,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'heart_rate',
        display_name: 'Heart Rate',
        description: 'Resting heart rate',
        category: 'vitals',
        measure_type: 'numeric',
        unit: 'bpm',
        min_value: 20,
        max_value: 250,
        decimal_places: 0,
        is_active: true,
        display_order: 5,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'body_temperature',
        display_name: 'Body Temperature',
        description: 'Core body temperature',
        category: 'vitals',
        measure_type: 'numeric',
        unit: '°C',
        min_value: 30,
        max_value: 45,
        decimal_places: 1,
        is_active: true,
        display_order: 6,
        is_system: true,
        created_at: now,
        updated_at: now
      },

      // Lab Results
      {
        id: uuidv4(),
        name: 'blood_glucose',
        display_name: 'Blood Glucose',
        description: 'Fasting blood glucose level',
        category: 'lab_results',
        measure_type: 'numeric',
        unit: 'mg/dL',
        min_value: 20,
        max_value: 600,
        decimal_places: 0,
        is_active: true,
        display_order: 10,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'hba1c',
        display_name: 'HbA1c',
        description: 'Glycated hemoglobin (average blood sugar)',
        category: 'lab_results',
        measure_type: 'numeric',
        unit: '%',
        min_value: 3,
        max_value: 20,
        decimal_places: 1,
        is_active: true,
        display_order: 11,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'cholesterol_total',
        display_name: 'Total Cholesterol',
        description: 'Total blood cholesterol',
        category: 'lab_results',
        measure_type: 'numeric',
        unit: 'mg/dL',
        min_value: 50,
        max_value: 500,
        decimal_places: 0,
        is_active: true,
        display_order: 12,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'cholesterol_ldl',
        display_name: 'LDL Cholesterol',
        description: 'Low-density lipoprotein (bad cholesterol)',
        category: 'lab_results',
        measure_type: 'numeric',
        unit: 'mg/dL',
        min_value: 20,
        max_value: 400,
        decimal_places: 0,
        is_active: true,
        display_order: 13,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'cholesterol_hdl',
        display_name: 'HDL Cholesterol',
        description: 'High-density lipoprotein (good cholesterol)',
        category: 'lab_results',
        measure_type: 'numeric',
        unit: 'mg/dL',
        min_value: 10,
        max_value: 150,
        decimal_places: 0,
        is_active: true,
        display_order: 14,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'triglycerides',
        display_name: 'Triglycerides',
        description: 'Blood triglycerides level',
        category: 'lab_results',
        measure_type: 'numeric',
        unit: 'mg/dL',
        min_value: 20,
        max_value: 1000,
        decimal_places: 0,
        is_active: true,
        display_order: 15,
        is_system: true,
        created_at: now,
        updated_at: now
      },

      // Anthropometric
      {
        id: uuidv4(),
        name: 'waist_circumference',
        display_name: 'Waist Circumference',
        description: 'Waist measurement at navel level',
        category: 'anthropometric',
        measure_type: 'numeric',
        unit: 'cm',
        min_value: 30,
        max_value: 300,
        decimal_places: 1,
        is_active: true,
        display_order: 20,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'hip_circumference',
        display_name: 'Hip Circumference',
        description: 'Hip measurement at widest point',
        category: 'anthropometric',
        measure_type: 'numeric',
        unit: 'cm',
        min_value: 40,
        max_value: 300,
        decimal_places: 1,
        is_active: true,
        display_order: 21,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'body_fat_percentage',
        display_name: 'Body Fat Percentage',
        description: 'Percentage of body weight that is fat',
        category: 'anthropometric',
        measure_type: 'numeric',
        unit: '%',
        min_value: 3,
        max_value: 70,
        decimal_places: 1,
        is_active: true,
        display_order: 22,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'muscle_mass',
        display_name: 'Muscle Mass',
        description: 'Skeletal muscle mass',
        category: 'anthropometric',
        measure_type: 'numeric',
        unit: 'kg',
        min_value: 5,
        max_value: 150,
        decimal_places: 1,
        is_active: true,
        display_order: 23,
        is_system: true,
        created_at: now,
        updated_at: now
      },

      // Lifestyle
      {
        id: uuidv4(),
        name: 'sleep_hours',
        display_name: 'Sleep Duration',
        description: 'Hours of sleep per night',
        category: 'lifestyle',
        measure_type: 'numeric',
        unit: 'hours',
        min_value: 0,
        max_value: 24,
        decimal_places: 1,
        is_active: true,
        display_order: 30,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'water_intake',
        display_name: 'Water Intake',
        description: 'Daily water consumption',
        category: 'lifestyle',
        measure_type: 'numeric',
        unit: 'liters',
        min_value: 0,
        max_value: 20,
        decimal_places: 1,
        is_active: true,
        display_order: 31,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'exercise_minutes',
        display_name: 'Exercise Duration',
        description: 'Daily exercise/physical activity',
        category: 'lifestyle',
        measure_type: 'numeric',
        unit: 'minutes',
        min_value: 0,
        max_value: 1440,
        decimal_places: 0,
        is_active: true,
        display_order: 32,
        is_system: true,
        created_at: now,
        updated_at: now
      },

      // Symptoms (boolean)
      {
        id: uuidv4(),
        name: 'fatigue',
        display_name: 'Fatigue',
        description: 'Experiencing unusual tiredness',
        category: 'symptoms',
        measure_type: 'boolean',
        unit: null,
        min_value: null,
        max_value: null,
        decimal_places: null,
        is_active: true,
        display_order: 40,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'headache',
        display_name: 'Headache',
        description: 'Experiencing headache',
        category: 'symptoms',
        measure_type: 'boolean',
        unit: null,
        min_value: null,
        max_value: null,
        decimal_places: null,
        is_active: true,
        display_order: 41,
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'nausea',
        display_name: 'Nausea',
        description: 'Feeling nauseous',
        category: 'symptoms',
        measure_type: 'boolean',
        unit: null,
        min_value: null,
        max_value: null,
        decimal_places: null,
        is_active: true,
        display_order: 42,
        is_system: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('measure_definitions', defaultMeasures);
    console.log(`✅ Inserted ${defaultMeasures.length} default measures`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('measure_definitions', { is_system: true });
    console.log('✅ Removed default measures');
  }
};
