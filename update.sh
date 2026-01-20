#!/bin/bash

# NutriVault Production Update Script
# This script updates an existing production deployment

set -e  # Exit on error

echo "========================================"
echo "NutriVault Production Update"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Backup database
echo "Backing up database..."
if [ -f "backend/data/nutrivault_prod.db" ]; then
    BACKUP_FILE="backend/data/nutrivault_prod.db.backup-$(date +%Y%m%d-%H%M%S)"
    cp backend/data/nutrivault_prod.db "$BACKUP_FILE"
    echo -e "${GREEN}✓ Database backed up to $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}Warning: No database file found${NC}"
fi
echo ""

# Pull latest changes
echo "Pulling latest changes from git..."
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Install dependencies
echo "Updating dependencies..."
npm install

cd backend
npm install --production
cd ..

cd frontend
npm install
cd ..

echo -e "${GREEN}✓ Dependencies updated${NC}"
echo ""

# Run migrations
echo "Running database migrations..."
npm run db:migrate
echo -e "${GREEN}✓ Migrations complete${NC}"
echo ""

# Rebuild frontend
echo "Rebuilding frontend..."
cd frontend
npm run build
cd ..
echo -e "${GREEN}✓ Frontend rebuilt${NC}"
echo ""

# Restart application
echo "Restarting application..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart nutrivault-backend
    echo -e "${GREEN}✓ Application restarted${NC}"
else
    echo -e "${YELLOW}PM2 not found. Please restart manually${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Update Complete!${NC}"
echo "========================================"
echo ""
echo "Verify the update:"
echo "  pm2 logs nutrivault-backend --lines 20"
echo ""
