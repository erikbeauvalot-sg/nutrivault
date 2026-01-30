#!/bin/bash
# Migration Debugging Script for Production
# Run this on your production server

echo "================================"
echo "NutriVault Migration Diagnostic"
echo "================================"
echo ""

echo "1. Checking Docker containers..."
docker-compose ps
echo ""

echo "2. Checking backend logs for migration messages..."
docker-compose logs backend | grep -i "migrat" | tail -20
echo ""

echo "3. Checking if migrations directories exist in container..."
docker exec nutrivault-backend ls -la /app/migrations/ 2>/dev/null | head -10
echo ""
docker exec nutrivault-backend ls -la /app/backend-migrations/ 2>/dev/null | head -10
echo ""

echo "4. Checking migration status inside container..."
docker exec nutrivault-backend npx sequelize-cli db:migrate:status 2>&1 | tail -30
echo ""

echo "5. Checking database schema for custom_field_definitions table..."
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "PRAGMA table_info(custom_field_definitions);" 2>/dev/null
echo ""

echo "6. Checking .sequelizerc configuration..."
docker exec nutrivault-backend cat /app/.sequelizerc 2>/dev/null
echo ""

echo "================================"
echo "Diagnostic Complete"
echo "================================"
