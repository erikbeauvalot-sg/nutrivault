const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Add root node_modules to path to find uuid
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain) {
  if (request === 'uuid') {
    try {
      return originalResolveFilename.call(this, request, parent, isMain);
    } catch (e) {
      // Try from root node_modules
      const rootPath = path.join(__dirname, '..', 'node_modules', request);
      if (fs.existsSync(rootPath)) {
        return rootPath;
      }
      throw e;
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain);
};

// Hardcode SQLite config for seeders to avoid dotenv issues
const config = {
  dialect: 'sqlite',
  storage: path.join(__dirname, 'data', 'nutrivault.db'),
  logging: console.log,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};

const sequelize = new Sequelize(config);

async function runSeeders() {
  try {
    console.log('🌱 Running seeders...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all seeder files
    const seedersPath = path.join(__dirname, '..', 'seeders');
    console.log('📂 Seeders path:', seedersPath);
    const files = fs.readdirSync(seedersPath).sort();
    console.log('📄 Found seeder files:', files.length);

    for (const file of files) {
      if (file.endsWith('.js')) {
        console.log('🌱 Executing seeder:', file);
        const seeder = require(path.join(seedersPath, file));
        await seeder.up(sequelize.getQueryInterface(), Sequelize);
      }
    }

    console.log('✅ All seeders completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runSeeders();