#!/usr/bin/env node
/**
 * Initialize NutriVault database for bare-metal (non-Docker) installs.
 *
 * 1. Creates all tables from Sequelize models (sync)
 * 2. Marks all migrations as already applied (since sync covers them)
 * 3. Runs all seeders
 *
 * Usage: node scripts/init-bare-metal.js
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

// Load env from backend/.env
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

async function main() {
  const db = require(path.join(__dirname, '..', 'models'));

  console.log('=== NutriVault Bare Metal DB Init ===\n');

  // 1. Sync all models (creates tables, indexes, constraints)
  console.log('[1/3] Creating tables from models...');
  await db.sequelize.sync();
  console.log('      Done.\n');

  // 2. Mark all migrations as applied
  console.log('[2/3] Marking migrations as applied...');

  // Ensure SequelizeMeta table exists
  await db.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
      "name" VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY
    )
  `);

  // Read all migration files
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const backendMigrationsDir = path.join(__dirname, '..', 'backend', 'migrations');

  const migrationFiles = new Set();

  for (const dir of [migrationsDir, backendMigrationsDir]) {
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.js')) migrationFiles.add(f);
      }
    }
  }

  for (const name of [...migrationFiles].sort()) {
    await db.sequelize.query(
      `INSERT OR IGNORE INTO "SequelizeMeta" ("name") VALUES (?)`,
      { replacements: [name] }
    );
  }
  console.log(`      Marked ${migrationFiles.size} migrations.\n`);

  // 3. Run seeders
  console.log('[3/3] Running seeders...');
  execFileSync('npx', ['sequelize-cli', 'db:seed:all'], {
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: 'inherit',
    env: { ...process.env }
  });

  console.log('\n=== Init complete ===');
  console.log('You can now start the server: systemctl start nutrivault');

  await db.sequelize.close();
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
