#!/usr/bin/env node
/**
 * Initialize NutriVault database for bare-metal (non-Docker) installs.
 *
 * 1. Runs root migrations (base schema + roles, permissions, etc.)
 * 2. Runs backend migrations (features schema + data)
 * 3. Runs root seeders (admin user, sample data)
 * 4. Runs backend seeders (measures, templates, etc.)
 *
 * Usage: node scripts/init-bare-metal.js
 */

const path = require('path');
const { execFileSync } = require('child_process');

// Load env from backend/.env
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const rootDir = path.join(__dirname, '..');
const backendDir = path.join(__dirname, '..', 'backend');

function run(label, args, cwd) {
  console.log(`      ${label}`);
  execFileSync('npx', args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env }
  });
}

async function main() {
  console.log('=== NutriVault Bare Metal DB Init ===\n');

  // 1. Run root migrations (creates base tables + roles, permissions, custom fields, etc.)
  console.log('[1/4] Running root migrations...');
  run('npx sequelize-cli db:migrate', ['sequelize-cli', 'db:migrate'], rootDir);
  console.log('      Done.\n');

  // 2. Run backend migrations (creates feature tables + settings, themes, portal, etc.)
  console.log('[2/4] Running backend migrations...');
  run('npx sequelize-cli db:migrate', ['sequelize-cli', 'db:migrate'], backendDir);
  console.log('      Done.\n');

  // 3. Run root seeders (roles, permissions, admin user, sample data)
  console.log('[3/4] Running base seeders...');
  run('npx sequelize-cli db:seed:all', ['sequelize-cli', 'db:seed:all'], rootDir);
  console.log('      Done.\n');

  // 4. Run backend seeders (measures, email templates, billing templates, etc.)
  console.log('[4/4] Running feature seeders...');
  run('npx sequelize-cli db:seed:all', ['sequelize-cli', 'db:seed:all'], backendDir);
  console.log('      Done.\n');

  console.log('=== Init complete ===');
  console.log('You can now start the server: systemctl start nutrivault');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
