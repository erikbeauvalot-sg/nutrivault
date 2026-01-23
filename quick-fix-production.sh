#!/bin/bash
# Quick Fix for Production Migration Issues
# This script ensures all migrations run correctly

echo "🔧 NutriVault Production Migration Quick Fix"
echo "=============================================="
echo ""

# Step 1: Check if migrations exist in the container
echo "Step 1: Checking migration files in container..."
echo ""
echo "Root migrations:"
docker exec nutrivault-backend ls /app/migrations/*.js 2>/dev/null | wc -l
echo ""
echo "Backend migrations directory:"
docker exec nutrivault-backend ls /app/backend-migrations/*.js 2>/dev/null | wc -l
echo ""

# Step 2: Manually copy backend migrations if they exist
echo "Step 2: Ensuring backend migrations are in main migrations folder..."
docker exec nutrivault-backend sh -c '
if [ -d /app/backend-migrations ]; then
  echo "Found backend-migrations directory"
  for file in /app/backend-migrations/*.js; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      if [ ! -f "/app/migrations/$filename" ]; then
        echo "Copying $filename..."
        cp "$file" "/app/migrations/$filename"
      else
        echo "Already exists: $filename"
      fi
    fi
  done
  echo "✅ Backend migrations consolidated"
else
  echo "⚠️  Backend migrations directory not found in container!"
  echo "The Docker image may need to be rebuilt."
fi
'
echo ""

# Step 3: List all migrations
echo "Step 3: All migrations now available:"
docker exec nutrivault-backend ls -1 /app/migrations/*.js | sort
echo ""

# Step 4: Check migration status
echo "Step 4: Checking which migrations have been executed..."
docker exec nutrivault-backend npx sequelize-cli db:migrate:status
echo ""

# Step 5: Run migrations
echo "Step 5: Running all pending migrations..."
docker exec nutrivault-backend npm run db:migrate
echo ""

# Step 6: Verify the column exists
echo "Step 6: Verifying show_in_basic_info column..."
COLUMN_CHECK=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "PRAGMA table_info(custom_field_definitions);" 2>/dev/null | grep -i "show_in_basic_info" || echo "")

if [ -n "$COLUMN_CHECK" ]; then
  echo "✅ SUCCESS: Column exists!"
  echo "$COLUMN_CHECK"
else
  echo "❌ Column still missing. Attempting manual fix..."
  echo ""
  echo "Step 6a: Adding column manually via SQL..."
  docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "ALTER TABLE custom_field_definitions ADD COLUMN show_in_basic_info BOOLEAN NOT NULL DEFAULT 0;" 2>&1

  if [ $? -eq 0 ]; then
    echo "✅ Column added successfully via SQL"

    # Mark the migration as executed
    echo ""
    echo "Step 6b: Marking migration as executed in SequelizeMeta..."
    docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "INSERT OR IGNORE INTO SequelizeMeta (name) VALUES ('20260123134734-add-show-in-basic-info-to-definitions.js');"
    echo "✅ Migration marked as executed"
  else
    echo "❌ Failed to add column. Check the error above."
  fi
fi

echo ""
echo "Step 7: Restarting backend container..."
docker-compose restart backend
sleep 5

echo ""
echo "Step 8: Checking backend health..."
curl -s http://localhost:3001/health || echo "Backend not responding yet, wait a moment..."

echo ""
echo "=============================================="
echo "✅ Quick Fix Complete!"
echo ""
echo "If you still see errors, the Docker image needs to be rebuilt:"
echo "  docker-compose build --no-cache backend"
echo "  docker-compose up -d"
echo "=============================================="
