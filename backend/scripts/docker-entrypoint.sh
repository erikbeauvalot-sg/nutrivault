#!/bin/sh
# Docker entrypoint script for NutriVault Backend
# Handles database migrations and initialization before starting the server

# Don't exit on error - we want the server to start even if migrations have issues
# set -e

echo "🚀 Starting NutriVault Backend..."

# Create directories as root (volumes may be root-owned)
echo "📁 Setting up data directories..."
mkdir -p /app/data
mkdir -p /app/uploads/invoice-customizations
mkdir -p /app/uploads/documents
mkdir -p /app/temp_uploads
mkdir -p /app/logs

# Set permissions for nodejs user
chown -R nodejs:nodejs /app/data /app/uploads /app/temp_uploads /app/logs 2>/dev/null || true
chmod -R 755 /app/data /app/uploads /app/temp_uploads /app/logs 2>/dev/null || true

# Debug: Show current working directory
echo "   Working directory: $(pwd)"
echo "   Upload directories: $(ls -la /app/uploads 2>/dev/null || echo 'not found')"

# Check if database exists
if [ ! -f "/app/data/nutrivault.db" ]; then
  echo "🆕 Database not found. Will be created on first migration."
fi

# List available migrations
echo "📦 Checking migrations..."
ls -la /app/migrations/ 2>/dev/null | head -5 || echo "   No migrations found"
echo "   Total migrations: $(ls /app/migrations/*.js 2>/dev/null | wc -l)"

# Debug: Show configuration
echo "📋 Database configuration:"
echo "   DB_STORAGE: ${DB_STORAGE:-not set}"
echo "   NODE_ENV: ${NODE_ENV:-not set}"

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:migrate 2>&1
MIGRATE_STATUS=$?
if [ $MIGRATE_STATUS -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️  Migrations failed (exit code: $MIGRATE_STATUS)"
  echo "   .sequelizerc contents:"
  cat /app/.sequelizerc 2>/dev/null || echo "   No .sequelizerc found"
  echo "   Continuing anyway - server will start"
fi

# Check if we need to seed the database (only if SEED_DB is set)
if [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed || echo "⚠️  Seeding failed or already seeded"
fi

# Note: Admin user creation must be done manually via backend seed script or API

echo "🎯 Starting application server as nodejs user..."
exec su-exec nodejs "$@"
