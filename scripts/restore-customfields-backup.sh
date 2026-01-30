#!/bin/bash
# Restore Custom Fields from Database Backup

echo "🔄 Restore Custom Fields from Backup"
echo "================================"
echo ""

if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file.db>"
  echo ""
  echo "Example:"
  echo "  $0 ~/nutrivault-backups/nutrivault-20260123.db"
  echo ""
  echo "Available backups:"
  ls -lh ~/nutrivault-backups/*.db 2>/dev/null || echo "No backups found in ~/nutrivault-backups/"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Backup file: $BACKUP_FILE"
echo ""
echo "⚠️  WARNING: This will restore custom field data from the backup."
echo "Current data in these tables will be replaced:"
echo "  - custom_field_categories"
echo "  - custom_field_definitions"
echo "  - patient_custom_field_values"
echo "  - visit_custom_field_values"
echo "  - custom_field_translations"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "1. Copying backup file to temporary location..."
cp "$BACKUP_FILE" /tmp/nutrivault-backup-temp.db
docker cp /tmp/nutrivault-backup-temp.db nutrivault-backend:/tmp/backup.db

echo ""
echo "2. Extracting custom field data from backup..."
docker exec nutrivault-backend sh -c "
echo 'Attaching backup database...'
sqlite3 /app/data/nutrivault.db << 'EOSQL'
ATTACH DATABASE '/tmp/backup.db' AS backup;

-- Clear current custom field data
DELETE FROM custom_field_translations;
DELETE FROM visit_custom_field_values;
DELETE FROM patient_custom_field_values;
DELETE FROM custom_field_definitions;
DELETE FROM custom_field_categories;

-- Restore from backup
INSERT INTO custom_field_categories SELECT * FROM backup.custom_field_categories;
INSERT INTO custom_field_definitions SELECT * FROM backup.custom_field_definitions;
INSERT INTO patient_custom_field_values SELECT * FROM backup.patient_custom_field_values;
INSERT INTO visit_custom_field_values SELECT * FROM backup.visit_custom_field_values;
INSERT INTO custom_field_translations SELECT * FROM backup.custom_field_translations;

DETACH DATABASE backup;
EOSQL
echo 'Restoration complete'
"

echo ""
echo "3. Verifying restored data..."
echo ""
echo "Categories:"
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM custom_field_categories;" 2>/dev/null
echo ""
echo "Definitions:"
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM custom_field_definitions;" 2>/dev/null
echo ""
echo "Patient values:"
docker exec nutrivault-backend sqlite3 /app/data/nutrivault.db "SELECT COUNT(*) FROM patient_custom_field_values;" 2>/dev/null

echo ""
echo "4. Cleaning up..."
docker exec nutrivault-backend rm /tmp/backup.db
rm /tmp/nutrivault-backup-temp.db

echo ""
echo "5. Restarting backend..."
docker-compose restart backend

echo ""
echo "================================"
echo "✅ Custom Fields Restored!"
echo "================================"
