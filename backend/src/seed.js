#!/usr/bin/env node

/**
 * Seed Database Script
 * Runs all seeders in order to populate the database with initial data
 */

const path = require('path');
const fs = require('fs');
const db = require('../../models');

async function runSeeders() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Skip database sync - assume migrations have already run
    console.log('📁 Using existing database schema...\n');

    // Get all seeder files
    const seedersDir = path.join(__dirname, '..', '..', 'seeders');
    const seeders = fs.readdirSync(seedersDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log(`Found ${seeders.length} seeders:\n`);
    seeders.forEach(seeder => console.log(`  - ${seeder}`));
    console.log();

    // Run each seeder
    let successCount = 0;
    let skipCount = 0;

    for (const seederFile of seeders) {
      const seederPath = path.join(seedersDir, seederFile);
      const seeder = require(seederPath);

      try {
        console.log(`▶️  Running ${seederFile}...`);
        await seeder.up(db.sequelize.getQueryInterface(), db.sequelize.constructor);
        console.log(`✅ ${seederFile} completed\n`);
        successCount++;
      } catch (error) {
        if (error.message && (error.message.includes('not found') || error.message.includes('ASSISTANT role') || error.message.includes('DIETITIAN role'))) {
          console.log(`⏭️  ${seederFile} skipped (dependency not found)\n`);
          skipCount++;
        } else {
          console.error(`❌ ${seederFile} failed:`, error.message, '\n');
          // Don't throw - continue with next seeder
          skipCount++;
        }
      }
    }

    console.log(`\n🎉 Seeding completed!`);
    console.log(`✅ ${successCount} seeders ran successfully`);
    if (skipCount > 0) {
      console.log(`⏭️  ${skipCount} seeders skipped`);
    }

    process.exit(0);
  } catch (error) {
    console.error('🔥 Seeding failed:', error);
    process.exit(1);
  }
}

runSeeders();
