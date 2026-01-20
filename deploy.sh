#!/bin/bash

# NutriVault Production Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "========================================"
echo "NutriVault Production Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

if ! command_exists pm2; then
    echo -e "${YELLOW}Warning: PM2 is not installed. Install with: npm install -g pm2${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Check environment file
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Copy .env.example to .env and configure it"
    exit 1
fi

echo -e "${GREEN}✓ Environment file found${NC}"
echo ""

# Stop existing PM2 process
echo "Stopping existing application..."
if command_exists pm2; then
    pm2 stop nutrivault-backend 2>/dev/null || echo "No existing process to stop"
fi
echo ""

# Backup database (if SQLite)
if grep -q "DB_DIALECT=sqlite" .env; then
    echo "Backing up SQLite database..."
    if [ -f "backend/data/nutrivault_prod.db" ]; then
        BACKUP_FILE="backend/data/nutrivault_prod.db.backup-$(date +%Y%m%d-%H%M%S)"
        cp backend/data/nutrivault_prod.db "$BACKUP_FILE"
        echo -e "${GREEN}✓ Database backed up to $BACKUP_FILE${NC}"
    else
        echo "No existing database to backup"
    fi
    echo ""
fi

# Install dependencies
echo "Installing dependencies..."
echo "  - Root dependencies..."
npm install --silent

echo "  - Backend dependencies..."
cd backend
npm install --production --silent
cd ..

echo "  - Frontend dependencies..."
cd frontend
npm install --silent
cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Ask if should seed database
read -p "Seed database with initial data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:seed
    echo -e "${GREEN}✓ Database seeded${NC}"
fi
echo ""

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"
cd ..
echo ""

# Start application with PM2
if command_exists pm2; then
    echo "Starting application with PM2..."

    # Create logs directory
    mkdir -p backend/logs

    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save

    echo -e "${GREEN}✓ Application started with PM2${NC}"
    echo ""
    echo "PM2 Commands:"
    echo "  pm2 list                     - View running apps"
    echo "  pm2 logs nutrivault-backend  - View logs"
    echo "  pm2 monit                    - Monitor resources"
    echo "  pm2 restart nutrivault-backend - Restart app"
else
    echo -e "${YELLOW}PM2 not installed. Starting manually...${NC}"
    cd backend
    NODE_ENV=production node src/server.js &
    echo -e "${GREEN}✓ Application started${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Verify application is running: pm2 list"
echo "  2. Check logs: pm2 logs nutrivault-backend"
echo "  3. Configure Nginx (see DEPLOYMENT.md)"
echo "  4. Setup SSL with certbot (see DEPLOYMENT.md)"
echo ""
