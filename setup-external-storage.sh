#!/bin/bash

# NutriVault External Storage Setup Script
# Creates directory structure for external storage deployment

set -e

echo "========================================"
echo "NutriVault External Storage Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default external storage location
EXTERNAL_BASE="${1:-./external}"

echo "Setting up external storage at: $EXTERNAL_BASE"
echo ""

# Create directory structure
echo "Creating directory structure..."
mkdir -p "$EXTERNAL_BASE/config"
mkdir -p "$EXTERNAL_BASE/data"
mkdir -p "$EXTERNAL_BASE/uploads"
mkdir -p "$EXTERNAL_BASE/logs"
mkdir -p "$EXTERNAL_BASE/ssl"
mkdir -p "$EXTERNAL_BASE/certbot"
mkdir -p "$EXTERNAL_BASE/backups"

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Copy configuration files
echo "Setting up configuration..."

# Copy database config if it doesn't exist
if [ ! -f "$EXTERNAL_BASE/config/database.js" ]; then
    cp config/database.js "$EXTERNAL_BASE/config/database.js"
    echo -e "${GREEN}✓ Copied database.js${NC}"
else
    echo -e "${YELLOW}⚠ database.js already exists, skipping${NC}"
fi

# Copy .sequelizerc if it doesn't exist
if [ ! -f "$EXTERNAL_BASE/config/.sequelizerc" ]; then
    cp .sequelizerc "$EXTERNAL_BASE/config/.sequelizerc"
    echo -e "${GREEN}✓ Copied .sequelizerc${NC}"
else
    echo -e "${YELLOW}⚠ .sequelizerc already exists, skipping${NC}"
fi

echo ""

# Create .env file for external storage if it doesn't exist
if [ ! -f "$EXTERNAL_BASE/.env" ]; then
    echo "Creating .env file..."
    cat > "$EXTERNAL_BASE/.env" << 'EOF'
# NutriVault External Storage Configuration

# Application
NODE_ENV=production
PORT=3001

# Database - SQLite (stored in external/data/)
DB_DIALECT=sqlite
DB_STORAGE=/app/backend/data/nutrivault_prod.db

# For PostgreSQL (external database server)
# DB_DIALECT=postgres
# DB_HOST=your-postgres-host
# DB_PORT=5432
# DB_NAME=nutrivault_prod
# DB_USER=nutrivault_user
# DB_PASSWORD=SECURE_PASSWORD_HERE

# JWT Secrets (MUST be at least 32 characters!)
# Generate with: openssl rand -base64 48
JWT_SECRET=REPLACE_WITH_SECURE_SECRET_32_CHARS_MINIMUM
REFRESH_TOKEN_SECRET=REPLACE_WITH_DIFFERENT_SECRET_32_CHARS_MINIMUM

# Security
BCRYPT_ROUNDS=12

# CORS (your production domains)
ALLOWED_ORIGINS=http://localhost:3001,https://yourdomain.com

# External storage paths (for docker-compose.external-storage.yml)
CONFIG_DIR=./external/config
DATA_DIR=./external/data
UPLOADS_DIR=./external/uploads
LOGS_DIR=./external/logs
SSL_DIR=./external/ssl
CERTBOT_DIR=./external/certbot

# User ID for file permissions (optional)
# UID=1001
# GID=1001
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Edit $EXTERNAL_BASE/.env and add secure JWT secrets!${NC}"
    echo "Generate secrets with: openssl rand -base64 48"
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi

echo ""

# Set permissions
echo "Setting permissions..."
chmod 755 "$EXTERNAL_BASE"
chmod 755 "$EXTERNAL_BASE/config"
chmod 755 "$EXTERNAL_BASE/data"
chmod 755 "$EXTERNAL_BASE/uploads"
chmod 755 "$EXTERNAL_BASE/logs"
chmod 755 "$EXTERNAL_BASE/ssl"
chmod 755 "$EXTERNAL_BASE/certbot"
chmod 755 "$EXTERNAL_BASE/backups"

if [ -f "$EXTERNAL_BASE/.env" ]; then
    chmod 600 "$EXTERNAL_BASE/.env"
fi

echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

# Create README
cat > "$EXTERNAL_BASE/README.md" << 'EOF'
# NutriVault External Storage

This directory contains all persistent data for NutriVault when using external storage.

## Directory Structure

```
external/
├── config/          # Configuration files (read-only in container)
│   ├── database.js  # Database configuration
│   └── .sequelizerc # Sequelize CLI configuration
├── data/            # SQLite database files
│   └── nutrivault_prod.db
├── uploads/         # User-uploaded documents
├── logs/            # Application logs
├── ssl/             # SSL certificates (for HTTPS)
├── certbot/         # Let's Encrypt webroot
├── backups/         # Database backups
└── .env             # Environment configuration

```

## Benefits of External Storage

1. **Easy Backups**: Just copy the `external/` directory
2. **Direct Access**: Access database files directly from host
3. **Network Storage**: Can mount to NFS, SMB, or cloud storage
4. **Migration**: Easy to move between servers
5. **Version Control**: Can track config changes in git (exclude .env!)

## Usage

### Start with External Storage

```bash
# Use the external storage docker-compose
docker-compose -f docker-compose.external-storage.yml up -d
```

### Backup Everything

```bash
# Simple backup
tar czf nutrivault-backup-$(date +%Y%m%d).tar.gz external/

# Or use the backup script
cp external/data/nutrivault_prod.db external/backups/nutrivault-$(date +%Y%m%d).db
```

### Restore Database

```bash
# Copy backup to data directory
cp external/backups/nutrivault-YYYYMMDD.db external/data/nutrivault_prod.db

# Restart container
docker-compose -f docker-compose.external-storage.yml restart
```

## Security Notes

- `config/` is mounted read-only in the container
- `.env` should have 600 permissions (owner read/write only)
- Never commit `.env` to version control
- Regular backups to `backups/` directory recommended

## Switching to Network Storage

You can mount this directory on network storage:

```bash
# Example: Mount NFS
sudo mount -t nfs server:/path/to/storage /path/to/external

# Example: Mount SMB/CIFS
sudo mount -t cifs //server/share /path/to/external -o credentials=/etc/samba/credentials

# Update docker-compose.external-storage.yml to point to mounted location
```
EOF

echo -e "${GREEN}✓ Created README.md${NC}"
echo ""

# Show summary
echo "========================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================"
echo ""
echo "External storage structure created at: $EXTERNAL_BASE"
echo ""
echo "Directory structure:"
echo "  $EXTERNAL_BASE/config/    - Configuration files"
echo "  $EXTERNAL_BASE/data/      - Database storage"
echo "  $EXTERNAL_BASE/uploads/   - Uploaded documents"
echo "  $EXTERNAL_BASE/logs/      - Application logs"
echo "  $EXTERNAL_BASE/ssl/       - SSL certificates"
echo "  $EXTERNAL_BASE/backups/   - Database backups"
echo ""
echo "Next steps:"
echo "  1. Edit $EXTERNAL_BASE/.env and add secure JWT secrets"
echo "  2. Generate secrets: openssl rand -base64 48"
echo "  3. Copy .env to project root: cp $EXTERNAL_BASE/.env .env"
echo "  4. Deploy: docker-compose -f docker-compose.external-storage.yml up -d"
echo ""
echo "For more information, see: $EXTERNAL_BASE/README.md"
echo ""
