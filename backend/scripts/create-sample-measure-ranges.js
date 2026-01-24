#!/usr/bin/env node
/**
 * Script to populate sample measure ranges for common health measures
 * Sprint 4: US-5.4.3 - Normal Ranges & Alerts
 *
 * Usage: node scripts/create-sample-measure-ranges.js
 */

const db = require('../../models');

// Common measure ranges based on medical standards
const MEASURE_RANGES = [
  {
    name: 'bmi',
    normal_range_min: 18.5,
    normal_range_max: 24.9,
    alert_threshold_min: 16.0,
    alert_threshold_max: 30.0,
    enable_alerts: true,
    description: 'Body Mass Index - WHO classification'
  },
  {
    name: 'blood_glucose',
    normal_range_min: 70,
    normal_range_max: 140,
    alert_threshold_min: 54,
    alert_threshold_max: 250,
    enable_alerts: true,
    description: 'Fasting blood glucose (mg/dL)'
  },
  {
    name: 'blood_pressure_systolic',
    normal_range_min: 90,
    normal_range_max: 120,
    alert_threshold_min: 70,
    alert_threshold_max: 180,
    enable_alerts: true,
    description: 'Systolic blood pressure (mmHg)'
  },
  {
    name: 'blood_pressure_diastolic',
    normal_range_min: 60,
    normal_range_max: 80,
    alert_threshold_min: 40,
    alert_threshold_max: 120,
    enable_alerts: true,
    description: 'Diastolic blood pressure (mmHg)'
  },
  {
    name: 'heart_rate',
    normal_range_min: 60,
    normal_range_max: 100,
    alert_threshold_min: 40,
    alert_threshold_max: 120,
    enable_alerts: true,
    description: 'Resting heart rate (bpm)'
  },
  {
    name: 'body_temperature',
    normal_range_min: 36.1,
    normal_range_max: 37.2,
    alert_threshold_min: 35.0,
    alert_threshold_max: 39.0,
    enable_alerts: true,
    description: 'Body temperature (°C)'
  },
  {
    name: 'weight',
    normal_range_min: null,
    normal_range_max: null,
    alert_threshold_min: null,
    alert_threshold_max: null,
    enable_alerts: false,
    description: 'Weight - highly individual, use BMI for health assessment'
  },
  {
    name: 'oxygen_saturation',
    normal_range_min: 95,
    normal_range_max: 100,
    alert_threshold_min: 90,
    alert_threshold_max: 100,
    enable_alerts: true,
    description: 'Blood oxygen saturation (%)'
  },
  {
    name: 'respiratory_rate',
    normal_range_min: 12,
    normal_range_max: 20,
    alert_threshold_min: 8,
    alert_threshold_max: 30,
    enable_alerts: true,
    description: 'Breaths per minute'
  },
  {
    name: 'cholesterol_total',
    normal_range_min: null,
    normal_range_max: 200,
    alert_threshold_min: null,
    alert_threshold_max: 240,
    enable_alerts: true,
    description: 'Total cholesterol (mg/dL)'
  },
  {
    name: 'hdl_cholesterol',
    normal_range_min: 40,
    normal_range_max: 60,
    alert_threshold_min: 30,
    alert_threshold_max: null,
    enable_alerts: true,
    description: 'HDL (good) cholesterol (mg/dL)'
  },
  {
    name: 'ldl_cholesterol',
    normal_range_min: null,
    normal_range_max: 100,
    alert_threshold_min: null,
    alert_threshold_max: 160,
    enable_alerts: true,
    description: 'LDL (bad) cholesterol (mg/dL)'
  },
  {
    name: 'triglycerides',
    normal_range_min: null,
    normal_range_max: 150,
    alert_threshold_min: null,
    alert_threshold_max: 200,
    enable_alerts: true,
    description: 'Triglycerides (mg/dL)'
  },
  {
    name: 'hba1c',
    normal_range_min: null,
    normal_range_max: 5.7,
    alert_threshold_min: null,
    alert_threshold_max: 6.5,
    enable_alerts: true,
    description: 'HbA1c - diabetes marker (%)'
  }
];

async function populateMeasureRanges() {
  try {
    console.log('🔍 Starting measure ranges population...\n');

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;

    for (const rangeConfig of MEASURE_RANGES) {
      const { name, normal_range_min, normal_range_max, alert_threshold_min, alert_threshold_max, enable_alerts, description } = rangeConfig;

      // Find the measure definition by name
      const measure = await db.MeasureDefinition.findOne({
        where: { name }
      });

      if (!measure) {
        console.log(`⚠️  Measure "${name}" not found - skipping`);
        notFoundCount++;
        continue;
      }

      // Check if measure already has ranges configured
      if (measure.normal_range_min !== null || measure.normal_range_max !== null) {
        console.log(`⏭️  Measure "${name}" already has ranges configured - skipping`);
        skippedCount++;
        continue;
      }

      // Update the measure with ranges
      await measure.update({
        normal_range_min,
        normal_range_max,
        alert_threshold_min,
        alert_threshold_max,
        enable_alerts
      });

      console.log(`✅ Updated "${measure.display_name}" (${name})`);
      if (normal_range_min && normal_range_max) {
        console.log(`   Normal range: ${normal_range_min} - ${normal_range_max} ${measure.unit || ''}`);
      }
      if (alert_threshold_min || alert_threshold_max) {
        console.log(`   Alert thresholds: ${alert_threshold_min || '∞'} - ${alert_threshold_max || '∞'} ${measure.unit || ''}`);
      }
      console.log(`   Alerts enabled: ${enable_alerts ? 'Yes' : 'No'}`);
      console.log(`   Note: ${description}\n`);

      updatedCount++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updatedCount} measures`);
    console.log(`   ⏭️  Skipped (already configured): ${skippedCount} measures`);
    console.log(`   ⚠️  Not found: ${notFoundCount} measures`);
    console.log('\n✨ Measure ranges population complete!\n');

    if (updatedCount > 0) {
      console.log('💡 Tips:');
      console.log('   - Ranges are based on general medical standards');
      console.log('   - Adjust ranges as needed for your specific patient population');
      console.log('   - Normal ranges define when warnings are generated');
      console.log('   - Alert thresholds define when critical alerts are generated');
      console.log('   - Critical alerts trigger email notifications\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating measure ranges:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 NutriVault - Measure Ranges Population Script');
console.log('   Sprint 4: US-5.4.3 - Normal Ranges & Alerts\n');

db.sequelize.sync()
  .then(() => {
    console.log('✅ Database connected\n');
    return populateMeasureRanges();
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });
