# Docker with External Storage

Complete guide for deploying NutriVault with external storage (host directories instead of Docker volumes).

## Why External Storage?

### Benefits

✅ **Easy Backups**: Simple file copy - no Docker commands needed
✅ **Direct Access**: Edit configs and access DB files directly
✅ **Network Storage**: Mount NFS, SMB, or cloud storage
✅ **Easy Migration**: Move data between servers easily
✅ **Better Control**: Full filesystem control and permissions
✅ **Simpler Troubleshooting**: Standard file operations

### When to Use

- Need direct access to database files
- Want simple file-based backups
- Using network storage (NFS, SMB)
- Multiple environments sharing config
- Need to edit configs without rebuilding

## Quick Start

### 1. Setup External Storage Structure

```bash
# Create directory structure and configuration
./setup-external-storage.sh

# This creates:
# external/
# ├── config/      - Configuration files
# ├── data/        - Database storage
# ├── uploads/     - Document uploads
# ├── logs/        - Application logs
# ├── ssl/         - SSL certificates
# ├── backups/     - Database backups
# └── .env         - Environment configuration
```

### 2. Configure Environment

```bash
# Edit the .env file
nano external/.env

# Generate and add secure secrets:
openssl rand -base64 48  # For JWT_SECRET
openssl rand -base64 48  # For REFRESH_TOKEN_SECRET

# Copy to project root
cp external/.env .env
```

### 3. Deploy

```bash
# Start with external storage configuration
docker-compose -f docker-compose.external-storage.yml up -d

# Initialize database
docker-compose -f docker-compose.external-storage.yml exec nutrivault npm run db:migrate
docker-compose -f docker-compose.external-storage.yml exec nutrivault npm run db:seed
```

### 4. Access

Open http://localhost:3001

**Default credentials:** admin / Admin123!

## Directory Structure

```
external/
├── config/                          # Configuration (read-only in container)
│   ├── database.js                 # Database configuration
│   └── .sequelizerc                # Sequelize CLI config
├── data/                           # Database storage (read-write)
│   ├── nutrivault_prod.db          # SQLite database
│   ├── nutrivault_prod.db-journal  # SQLite journal
│   └── nutrivault_prod.db-wal      # SQLite WAL
├── uploads/                        # Document uploads (read-write)
│   └── patients/YYYY-MM-DD/        # Organized by date
├── logs/                           # Application logs (read-write)
│   ├── error.log                   # Error logs
│   └── output.log                  # Application output
├── ssl/                            # SSL certificates (optional)
│   ├── fullchain.pem               # SSL certificate
│   └── privkey.pem                 # Private key
├── certbot/                        # Let's Encrypt webroot
├── backups/                        # Database backups
│   └── nutrivault-YYYYMMDD.db      # Backup files
└── .env                            # Environment variables
```

## Configuration

### Environment Variables

The external storage setup uses environment variables to configure paths:

```bash
# .env file variables
CONFIG_DIR=./external/config        # Configuration directory
DATA_DIR=./external/data            # Database directory
UPLOADS_DIR=./external/uploads      # Uploads directory
LOGS_DIR=./external/logs            # Logs directory
SSL_DIR=./external/ssl              # SSL certificates
CERTBOT_DIR=./external/certbot      # Let's Encrypt

# Optional: Run as specific user (prevents permission issues)
UID=1001
GID=1001
```

### Custom Locations

You can use any directory on your host:

```bash
# Example: Use /mnt/storage for data
cat > .env << 'EOF'
DATA_DIR=/mnt/storage/nutrivault/data
UPLOADS_DIR=/mnt/storage/nutrivault/uploads
LOGS_DIR=/var/log/nutrivault
CONFIG_DIR=./external/config
EOF
```

### Network Storage

Mount network storage first, then point Docker to it:

```bash
# Mount NFS share
sudo mkdir -p /mnt/nutrivault
sudo mount -t nfs storage-server:/exports/nutrivault /mnt/nutrivault

# Configure .env
cat > .env << 'EOF'
DATA_DIR=/mnt/nutrivault/data
UPLOADS_DIR=/mnt/nutrivault/uploads
LOGS_DIR=/mnt/nutrivault/logs
CONFIG_DIR=/mnt/nutrivault/config
EOF

# Deploy
docker-compose -f docker-compose.external-storage.yml up -d
```

## Management

### Start/Stop

```bash
# Start
docker-compose -f docker-compose.external-storage.yml up -d

# Stop
docker-compose -f docker-compose.external-storage.yml down

# Restart
docker-compose -f docker-compose.external-storage.yml restart

# View logs
docker-compose -f docker-compose.external-storage.yml logs -f
```

### Database Operations

```bash
# Backup database (simple file copy!)
cp external/data/nutrivault_prod.db external/backups/nutrivault-$(date +%Y%m%d).db

# Restore database
cp external/backups/nutrivault-YYYYMMDD.db external/data/nutrivault_prod.db
docker-compose -f docker-compose.external-storage.yml restart

# Check database size
ls -lh external/data/nutrivault_prod.db

# Access database directly with sqlite3
sqlite3 external/data/nutrivault_prod.db
```

### Automated Backups

Create a backup script:

```bash
cat > backup-external.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="external/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup database
cp external/data/nutrivault_prod.db "$BACKUP_DIR/"

# Backup uploads (if needed)
tar czf "$BACKUP_DIR/uploads.tar.gz" external/uploads/

echo "Backup complete: $BACKUP_DIR"

# Keep only last 7 days
find external/backups/ -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x backup-external.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./backup-external.sh") | crontab -
```

### Configuration Updates

Since config is mounted from the host, you can edit files directly:

```bash
# Edit database config
nano external/config/database.js

# Restart to apply changes
docker-compose -f docker-compose.external-storage.yml restart
```

## Permissions

### File Ownership

The container runs as user `nutrivault` (UID 1001). Ensure your external directories are accessible:

```bash
# Option 1: Change ownership to match container user
sudo chown -R 1001:1001 external/

# Option 2: Use your user ID
export UID=$(id -u)
export GID=$(id -g)
docker-compose -f docker-compose.external-storage.yml up -d
```

### Permission Issues

If you encounter permission errors:

```bash
# Check current permissions
ls -la external/

# Fix permissions
chmod 755 external/config external/data external/uploads external/logs
chmod 600 external/.env  # Protect env file
chmod 644 external/data/nutrivault_prod.db  # Database readable

# If still issues, run container as root temporarily
docker-compose -f docker-compose.external-storage.yml exec --user root nutrivault chown -R nutrivault:nutrivault /app/backend/data
```

## PostgreSQL with External Storage

You can use external PostgreSQL instead of SQLite:

```bash
# Update .env
cat > .env << 'EOF'
DB_DIALECT=postgres
DB_HOST=postgres-server  # External PostgreSQL server
DB_PORT=5432
DB_NAME=nutrivault_prod
DB_USER=nutrivault_user
DB_PASSWORD=secure_password

# Data directory still used for uploads/logs
DATA_DIR=./external/data
UPLOADS_DIR=./external/uploads
LOGS_DIR=./external/logs
EOF

# Deploy
docker-compose -f docker-compose.external-storage.yml up -d
docker-compose -f docker-compose.external-storage.yml exec nutrivault npm run db:migrate
docker-compose -f docker-compose.external-storage.yml exec nutrivault npm run db:seed
```

## Backup Strategies

### Local Backups

```bash
# Quick backup (database only)
cp external/data/nutrivault_prod.db external/backups/backup-$(date +%Y%m%d).db

# Full backup (everything)
tar czf nutrivault-full-backup-$(date +%Y%m%d).tar.gz external/

# Incremental backup (rsync)
rsync -av --delete external/ /backup/location/external/
```

### Remote Backups

```bash
# Sync to remote server
rsync -avz -e ssh external/ user@backup-server:/backup/nutrivault/

# Sync to S3 (with aws-cli)
aws s3 sync external/data/ s3://my-bucket/nutrivault/data/
aws s3 sync external/uploads/ s3://my-bucket/nutrivault/uploads/

# Sync to Google Drive (with rclone)
rclone sync external/backups/ gdrive:NutriVault/Backups/
```

## Migration

### Moving to Another Server

```bash
# On old server - create archive
tar czf nutrivault-migration.tar.gz external/ .env

# Copy to new server
scp nutrivault-migration.tar.gz user@new-server:/tmp/

# On new server - extract and deploy
cd /path/to/nutrivault
tar xzf /tmp/nutrivault-migration.tar.gz
docker-compose -f docker-compose.external-storage.yml up -d
```

### Converting from Docker Volumes

If you're currently using Docker volumes and want to switch to external storage:

```bash
# 1. Create external storage structure
./setup-external-storage.sh

# 2. Copy data from Docker volumes
docker cp nutrivault:/app/backend/data/nutrivault_prod.db external/data/
docker cp nutrivault:/app/backend/uploads/. external/uploads/
docker cp nutrivault:/app/backend/logs/. external/logs/

# 3. Stop old container
docker-compose down

# 4. Start with external storage
docker-compose -f docker-compose.external-storage.yml up -d
```

## Troubleshooting

### Database File Not Found

```bash
# Check if data directory exists and is mounted
docker-compose -f docker-compose.external-storage.yml exec nutrivault ls -la /app/backend/data/

# Check host directory
ls -la external/data/

# Verify mount in container
docker inspect nutrivault | grep -A 10 Mounts
```

### Permission Denied Errors

```bash
# Check ownership
ls -la external/

# Fix ownership
sudo chown -R 1001:1001 external/

# Or run as your user
export UID=$(id -u)
export GID=$(id -g)
docker-compose -f docker-compose.external-storage.yml up -d
```

### Configuration Not Loading

```bash
# Verify .env is in project root
ls -la .env

# Check environment variables in container
docker-compose -f docker-compose.external-storage.yml exec nutrivault env | grep DB_

# Restart to reload config
docker-compose -f docker-compose.external-storage.yml restart
```

## Comparison: Volumes vs External Storage

| Feature | Docker Volumes | External Storage |
|---------|---------------|------------------|
| Setup Complexity | Simple | Moderate |
| Backup | Docker commands | File copy |
| Direct Access | No | Yes |
| Network Storage | Difficult | Easy |
| Performance | Better | Good |
| Portability | Docker-specific | Universal |
| Security | Isolated | Host-dependent |
| Best For | Simple deployments | Production, backups |

## Best Practices

1. **Separate Environments**: Use different external directories for dev/staging/prod
2. **Regular Backups**: Automate daily backups to `external/backups/`
3. **Secure .env**: Always `chmod 600 external/.env`
4. **Read-Only Config**: Mount config as read-only (`:ro`)
5. **Monitor Disk Space**: Watch `external/data/` and `external/uploads/` size
6. **Network Storage**: Use reliable network storage with redundancy
7. **Test Restores**: Regularly test backup restoration process

## Advanced Configurations

### Multiple Databases (SQLite)

```bash
# Development database
DATA_DIR_DEV=./external/data-dev
# Production database
DATA_DIR_PROD=./external/data-prod

# Switch between them
ln -sf data-prod external/data  # Use production
ln -sf data-dev external/data   # Use development
```

### Separate Storage Devices

```bash
# SSD for database (fast)
DATA_DIR=/mnt/ssd/nutrivault/data

# HDD for uploads (large)
UPLOADS_DIR=/mnt/hdd/nutrivault/uploads

# Local for logs
LOGS_DIR=./external/logs
```

## Support

For issues with external storage:
- Check file permissions first
- Verify mount points
- Review logs: `docker-compose -f docker-compose.external-storage.yml logs`
- See main [DOCKER.md](DOCKER.md) for general Docker help

---

**Last Updated**: January 20, 2026
