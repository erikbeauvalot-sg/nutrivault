#!/bin/bash
# Force Migration Fix Script for Production
# This script manually runs all pending migrations

set -e

echo "================================"
echo "NutriVault Migration Fix"
echo "================================"
echo ""

echo "⚠️  This script will run all pending migrations."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "1. Checking current migration status..."
docker exec nutrivault-backend npx sequelize-cli db:migrate:status
echo ""

echo "2. Manually consolidating backend migrations..."
docker exec nutrivault-backend sh -c "
if [ -d /app/backend-migrations ]; then
  echo 'Copying backend migrations to main migrations folder...'
  cp -v /app/backend-migrations/*.js /app/migrations/ 2>/dev/null || echo 'No backend migrations to copy or already copied'
else
  echo '⚠️  Warning: /app/backend-migrations directory not found!'
fi
"
echo ""

echo "3. Listing all migrations in /app/migrations/..."
docker exec nutrivault-backend ls -la /app/migrations/ | grep "\.js$"
echo ""

echo "4. Running all pending migrations..."
docker exec nutrivault-backend npm run db:migrate
echo ""

echo "5. Verifying migration status..."
docker exec nutrivault-backend npx sequelize-cli db:migrate:status | tail -20
echo ""

echo "6. Checking if show_in_basic_info column exists..."
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "PRAGMA table_info(custom_field_definitions);" | grep -i "show_in_basic"
echo ""

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS: show_in_basic_info column exists!"
else
    echo "❌ ERROR: show_in_basic_info column still missing!"
    echo ""
    echo "Trying manual column addition..."
    docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "ALTER TABLE custom_field_definitions ADD COLUMN show_in_basic_info BOOLEAN NOT NULL DEFAULT 0;"
    echo "✅ Column added manually"
fi

echo ""
echo "7. Restarting backend container..."
docker-compose restart backend
echo ""

echo "================================"
echo "Migration Fix Complete"
echo "================================"
echo ""
echo "Please test your application now."
