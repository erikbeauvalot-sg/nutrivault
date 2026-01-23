#!/bin/bash
# Seed Custom Fields in Production

echo "🌱 Seeding Custom Fields"
echo "================================"
echo ""

echo "⚠️  This will create default custom field categories and definitions."
echo "If custom fields already exist, this may create duplicates."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "1. Checking if admin user exists..."
ADMIN_EXISTS=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM users WHERE username='admin';" 2>/dev/null)

if [ "$ADMIN_EXISTS" = "0" ]; then
  echo "❌ Admin user not found!"
  echo "Please create the admin user first:"
  echo "  docker exec nutrivault-backend node /app/scripts/create-admin.js \"YourPassword\""
  exit 1
else
  echo "✅ Admin user found"
fi

echo ""
echo "2. Running custom fields seed script..."
docker exec nutrivault-backend node /app/src/scripts/seedCustomFields.js

echo ""
echo "3. Verifying seeded data..."
echo ""
echo "Categories created:"
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT id, name, entity_types, display_order FROM custom_field_categories ORDER BY display_order;" 2>/dev/null
echo ""
echo "Definitions created:"
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) as total FROM custom_field_definitions;" 2>/dev/null

echo ""
echo "================================"
echo "✅ Custom Fields Seeded!"
echo ""
echo "You can now manage them in the UI:"
echo "  Navigate to Settings > Custom Fields"
echo "================================"
