#!/bin/bash
# Check Custom Fields Data Status

echo "🔍 Checking Custom Fields Data"
echo "================================"
echo ""

echo "1. Checking if custom field tables exist..."
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%custom%' ORDER BY name;" 2>/dev/null
echo ""

echo "2. Counting custom field categories..."
CATEGORIES=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM custom_field_categories;" 2>/dev/null)
echo "Categories: $CATEGORIES"
echo ""

echo "3. Counting custom field definitions..."
DEFINITIONS=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM custom_field_definitions;" 2>/dev/null)
echo "Definitions: $DEFINITIONS"
echo ""

echo "4. Counting patient custom field values..."
PATIENT_VALUES=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM patient_custom_field_values;" 2>/dev/null)
echo "Patient values: $PATIENT_VALUES"
echo ""

echo "5. Counting visit custom field values..."
VISIT_VALUES=$(docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM visit_custom_field_values;" 2>/dev/null)
echo "Visit values: $VISIT_VALUES"
echo ""

if [ "$CATEGORIES" = "0" ] && [ "$DEFINITIONS" = "0" ]; then
  echo "⚠️  No custom fields found!"
  echo ""
  echo "Options:"
  echo "  1. Seed sample custom fields: ./seed-customfields.sh"
  echo "  2. Restore from backup (if you have one)"
  echo "  3. Create custom fields manually via the UI"
else
  echo "✅ Custom field data exists"
  echo ""
  echo "Details:"
  docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT id, name_fr, name_en, entity_types FROM custom_field_categories ORDER BY display_order;" 2>/dev/null
fi

echo ""
echo "================================"
