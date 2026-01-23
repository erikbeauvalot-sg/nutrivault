#!/bin/sh
# Docker entrypoint script for NutriVault Backend
# Handles database migrations and initialization before starting the server

set -e

echo "🚀 Starting NutriVault Backend..."

# Wait for database file to be accessible (if using shared volume)
echo "📁 Checking database directory..."
mkdir -p /app/data

# Check if database exists
if [ ! -f "/app/data/nutrivault.db" ]; then
  echo "🆕 Database not found. Will be created on first migration."
fi

# Run database migrations
echo "🔄 Running database migrations..."
if npm run db:migrate; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️  Migrations failed or no migrations to run"
fi

# Check if we need to seed the database (only if SEED_DB is set)
if [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed || echo "⚠️  Seeding failed or already seeded"
fi

# Note: Admin user creation must be done manually via backend seed script or API

echo "🎯 Starting application server..."
exec "$@"
