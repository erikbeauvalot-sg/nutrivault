const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Hardcode SQLite config for migrations to avoid dotenv issues
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

async function runMigrations() {
  try {
    console.log('🔄 Running migrations...');
    console.log('📂 Current directory:', __dirname);
    console.log('📂 Migrations path:', path.join(__dirname, '..', 'migrations'));

    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all migration files
    const migrationsPath = path.join(__dirname, '..', 'migrations');
    console.log('📂 Resolved migrations path:', migrationsPath);
    const files = fs.readdirSync(migrationsPath).sort();
    console.log('📄 Found migration files:', files.length);

    for (const file of files) {
      if (file.endsWith('.js')) {
        console.log('📄 Executing migration:', file);
        const migration = require(path.join(migrationsPath, file));
        await migration.up(sequelize.getQueryInterface(), Sequelize);
      }
    }

    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runMigrations();