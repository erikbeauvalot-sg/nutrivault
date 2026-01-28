#!/bin/bash

# Script to deploy NutriVault v5.3.0 with database migration
# This script should be run on the production server

echo "🚀 Deploying NutriVault v5.3.0"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "migrations" ]; then
    print_error "This script must be run from the NutriVault project root directory"
    exit 1
fi

print_status "Project directory verified"

# Backup database (recommended)
print_warning "Creating database backup..."
if command -v pg_dump &> /dev/null; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump $DATABASE_URL > $BACKUP_FILE 2>/dev/null
    if [ $? -eq 0 ]; then
        print_status "Database backup created: $BACKUP_FILE"
    else
        print_warning "Could not create database backup. Please ensure you have a recent backup."
    fi
else
    print_warning "pg_dump not found. Please ensure you have a recent database backup before proceeding."
fi

# Run database migrations
print_status "Running database migrations..."
npm run db:migrate

if [ $? -eq 0 ]; then
    print_status "Database migrations completed successfully"
else
    print_error "Database migration failed! Please check the logs and restore from backup if necessary."
    exit 1
fi

# Install dependencies (if needed)
print_status "Installing dependencies..."
npm ci

if [ $? -eq 0 ]; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Build the application
print_status "Building application..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Restart the application (adjust this based on your deployment method)
print_status "Restarting application..."
# Example for PM2:
# pm2 restart nutrivault

# Example for systemd:
# sudo systemctl restart nutrivault

# Example for Docker:
# docker-compose restart

print_warning "Please restart your application server manually based on your deployment setup"

print_status "Deployment completed!"
echo ""
echo "🎯 New Features in v5.3.0:"
echo "  • Separator custom field type for visual organization"
echo "  • Horizontal line separators in Patient and Visit forms"
echo "  • Full-width layout for separators"
echo "  • No data input required for separators"
echo ""
echo "📋 Next Steps:"
echo "  1. Verify the application is running correctly"
echo "  2. Test creating separator custom fields"
echo "  3. Check that separators display properly in forms"
echo "  4. Monitor for any issues and rollback if necessary"
echo ""
print_warning "Remember to test the new separator functionality thoroughly!"