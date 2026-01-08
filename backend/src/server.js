/**
 * NutriVault - Server Startup
 *
 * Server startup logic - only runs when this file is executed directly
 * Tests can import app.js without starting the server
 */

const app = require('./app');
const db = require('../models');

// Environment variables
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection and server start
async function startServer() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log(`✓ Database connected (${db.sequelize.options.dialect})`);

    // Sync database (create tables if they don't exist)
    // In development/docker, we sync models. In production, use migrations.
    if (NODE_ENV === 'development' || process.env.DB_SYNC === 'true') {
      await db.sequelize.sync({ alter: false });
      console.log('✓ Database tables synced');
    } else {
      console.log('✓ Database models loaded');
    }

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log('╔════════════════════════════════════════════╗');
      console.log('║          NutriVault API Server            ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Host: ${HOST}`);
      console.log(`Port: ${PORT}`);
      console.log(`Server: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
      console.log(`Health: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
      console.log(`API Info: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api`);
      if (HOST === '0.0.0.0') {
        console.log(`Network: Available on all network interfaces`);
      }
      console.log('');
      console.log('Press CTRL+C to stop');
      console.log('');
    });

    return server;

  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received. Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  await db.sequelize.close();
  process.exit(0);
});

// Only start server if this file is run directly (not imported)
if (require.main === module) {
  startServer();
}

// Export app for testing
module.exports = app;
