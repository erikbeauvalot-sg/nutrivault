# Database Backup & Recovery Guide

**Version**: 1.0  
**Last Updated**: 2026-01-07  
**Database**: PostgreSQL 14.x+

---

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Automated Backups](#automated-backups)
3. [Manual Backups](#manual-backups)
4. [Backup Verification](#backup-verification)
5. [Restoration Procedures](#restoration-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Backup Monitoring](#backup-monitoring)

---

## Backup Strategy

### Backup Types

| Type | Frequency | Retention | Purpose |
|------|-----------|-----------|---------|
| **Full Backup** | Daily | 30 days | Complete database snapshot |
| **Incremental** | Every 6 hours | 7 days | Recent changes only |
| **Point-in-Time** | Continuous (WAL) | 7 days | Restore to any point in time |
| **Pre-deployment** | Before each deploy | Until next deploy | Rollback safety |

### Retention Policy

- **Daily backups**: 30 days
- **Weekly backups**: 12 weeks (3 months)
- **Monthly backups**: 12 months (1 year)
- **Yearly backups**: 5 years (compliance)

### Storage Strategy

- **Primary**: Local server storage (`/var/backups/nutrivault/`)
- **Secondary**: AWS S3 or cloud storage (encrypted)
- **Offsite**: Geographic redundancy for disaster recovery

---

## Automated Backups

### 1. Full Database Backup Script

Create the backup script:

```bash
sudo mkdir -p /opt/nutrivault/scripts
sudo nano /opt/nutrivault/scripts/backup-database.sh
```

Add the following script:

```bash
#!/bin/bash

#############################################
# NutriVault Database Backup Script
# Performs full PostgreSQL database backup
#############################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="/var/backups/nutrivault/database"
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"
MONTHLY_DIR="$BACKUP_DIR/monthly"
LOG_FILE="/var/log/nutrivault/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +%d)

# Database credentials (from environment)
DB_NAME="${DB_NAME:-nutrivault_prod}"
DB_USER="${DB_USER:-nutrivault_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Backup settings
BACKUP_FILENAME="nutrivault_backup_${DATE}"
RETENTION_DAYS=30
RETENTION_WEEKS=12
RETENTION_MONTHS=12

# Notification settings
NOTIFY_EMAIL="${NOTIFY_EMAIL:-admin@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

#############################################
# Functions
#############################################

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    send_notification "❌ Backup Failed" "$1" "critical"
    exit 1
}

send_notification() {
    local title="$1"
    local message="$2"
    local severity="${3:-info}"
    
    # Email notification
    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "$title" "$NOTIFY_EMAIL" 2>/dev/null || true
    fi
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$title: $message\"}" 2>/dev/null || true
    fi
}

check_prerequisites() {
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error_exit "pg_dump command not found. Install PostgreSQL client."
    fi
    
    # Check if database is accessible
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
        error_exit "Cannot connect to database $DB_NAME on $DB_HOST"
    fi
    
    log "Prerequisites check passed"
}

create_directories() {
    mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"
    log "Backup directories created/verified"
}

perform_backup() {
    local backup_type="$1"
    local target_dir="$2"
    local backup_file="$target_dir/${BACKUP_FILENAME}.dump"
    
    log "Starting $backup_type backup..."
    
    # Perform backup with pg_dump (custom format for compression and flexibility)
    if PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -F c \
        -b \
        -v \
        -f "$backup_file" \
        "$DB_NAME" 2>> "$LOG_FILE"; then
        
        # Get file size
        local file_size=$(du -h "$backup_file" | cut -f1)
        log "$backup_type backup completed: $backup_file ($file_size)"
        
        # Create checksum
        sha256sum "$backup_file" > "${backup_file}.sha256"
        log "Checksum created: ${backup_file}.sha256"
        
        # Compress with gzip for additional space savings
        gzip -f "$backup_file"
        log "Backup compressed: ${backup_file}.gz"
        
        # Update file reference
        backup_file="${backup_file}.gz"
        file_size=$(du -h "$backup_file" | cut -f1)
        
        return 0
    else
        error_exit "$backup_type backup failed. Check logs for details."
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Clean daily backups (keep last 30 days)
    find "$DAILY_DIR" -name "*.dump.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$DAILY_DIR" -name "*.sha256" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean weekly backups (keep last 12 weeks = 84 days)
    find "$WEEKLY_DIR" -name "*.dump.gz" -type f -mtime +$((RETENTION_WEEKS * 7)) -delete 2>/dev/null || true
    find "$WEEKLY_DIR" -name "*.sha256" -type f -mtime +$((RETENTION_WEEKS * 7)) -delete 2>/dev/null || true
    
    # Clean monthly backups (keep last 12 months = 365 days)
    find "$MONTHLY_DIR" -name "*.dump.gz" -type f -mtime +$((RETENTION_MONTHS * 30)) -delete 2>/dev/null || true
    find "$MONTHLY_DIR" -name "*.sha256" -type f -mtime +$((RETENTION_MONTHS * 30)) -delete 2>/dev/null || true
    
    log "Old backups cleaned up"
}

upload_to_cloud() {
    local backup_file="$1"
    
    # AWS S3 upload (if configured)
    if [ -n "$AWS_S3_BUCKET" ] && command -v aws &> /dev/null; then
        log "Uploading to S3: $AWS_S3_BUCKET"
        aws s3 cp "$backup_file" "s3://$AWS_S3_BUCKET/backups/database/" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256 2>> "$LOG_FILE" || {
            log "WARNING: S3 upload failed"
            return 1
        }
        log "S3 upload completed"
    fi
}

generate_backup_report() {
    local start_time="$1"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "=== Backup Report ==="
    log "Duration: ${duration}s"
    log "Daily backups: $(ls -1 $DAILY_DIR/*.dump.gz 2>/dev/null | wc -l)"
    log "Weekly backups: $(ls -1 $WEEKLY_DIR/*.dump.gz 2>/dev/null | wc -l)"
    log "Monthly backups: $(ls -1 $MONTHLY_DIR/*.dump.gz 2>/dev/null | wc -l)"
    log "Total disk usage: $(du -sh $BACKUP_DIR | cut -f1)"
    log "===================="
}

#############################################
# Main Execution
#############################################

main() {
    local start_time=$(date +%s)
    
    log "==================================="
    log "Starting NutriVault Database Backup"
    log "==================================="
    
    # Source environment variables
    if [ -f /opt/nutrivault/backend/.env.production ]; then
        set -a
        source /opt/nutrivault/backend/.env.production
        set +a
    else
        error_exit ".env.production file not found"
    fi
    
    # Run backup steps
    check_prerequisites
    create_directories
    
    # Always perform daily backup
    perform_backup "Daily" "$DAILY_DIR"
    local daily_backup="$DAILY_DIR/${BACKUP_FILENAME}.dump.gz"
    
    # Weekly backup (on Sundays)
    if [ "$DAY_OF_WEEK" -eq 7 ]; then
        log "Performing weekly backup..."
        cp "$daily_backup" "$WEEKLY_DIR/"
        cp "${daily_backup}.sha256" "$WEEKLY_DIR/" 2>/dev/null || true
    fi
    
    # Monthly backup (on 1st of month)
    if [ "$DAY_OF_MONTH" -eq 01 ]; then
        log "Performing monthly backup..."
        cp "$daily_backup" "$MONTHLY_DIR/"
        cp "${daily_backup}.sha256" "$MONTHLY_DIR/" 2>/dev/null || true
    fi
    
    # Upload to cloud storage
    upload_to_cloud "$daily_backup"
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_backup_report "$start_time"
    
    log "Backup completed successfully!"
    send_notification "✅ Backup Successful" "Database backup completed in $(($(date +%s) - start_time))s" "success"
}

# Run main function
main "$@"
```

### 2. Make Script Executable

```bash
sudo chmod +x /opt/nutrivault/scripts/backup-database.sh
sudo chown nutrivault:nutrivault /opt/nutrivault/scripts/backup-database.sh
```

### 3. Create Backup Directories

```bash
sudo mkdir -p /var/backups/nutrivault/database/{daily,weekly,monthly}
sudo chown -R nutrivault:nutrivault /var/backups/nutrivault
sudo chmod 700 /var/backups/nutrivault
```

### 4. Schedule with Cron

```bash
sudo crontab -e -u nutrivault
```

Add the following entries:

```cron
# NutriVault Database Backups
# Daily backup at 2 AM
0 2 * * * /opt/nutrivault/scripts/backup-database.sh >> /var/log/nutrivault/backup.log 2>&1

# Backup verification at 3 AM
0 3 * * * /opt/nutrivault/scripts/verify-backup.sh >> /var/log/nutrivault/backup-verify.log 2>&1

# Weekly full backup on Sunday at 1 AM
0 1 * * 0 /opt/nutrivault/scripts/backup-database.sh >> /var/log/nutrivault/backup.log 2>&1

# Monthly backup status report
0 9 1 * * /opt/nutrivault/scripts/backup-report.sh | mail -s "Monthly Backup Report" admin@yourdomain.com
```

---

## Manual Backups

### Quick Backup Before Deployment

```bash
#!/bin/bash
# Quick pre-deployment backup

cd /opt/nutrivault
source backend/.env.production

BACKUP_FILE="/var/backups/nutrivault/manual/pre_deploy_$(date +%Y%m%d_%H%M%S).dump"

mkdir -p /var/backups/nutrivault/manual

PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -F c \
    -f "$BACKUP_FILE" \
    "$DB_NAME"

echo "Backup created: $BACKUP_FILE"
```

### Schema-Only Backup

```bash
# Backup only database structure (no data)
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -s \
    -f schema_only_$(date +%Y%m%d).sql \
    "$DB_NAME"
```

### Data-Only Backup

```bash
# Backup only data (no schema)
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -a \
    -F c \
    -f data_only_$(date +%Y%m%d).dump \
    "$DB_NAME"
```

### Specific Tables Backup

```bash
# Backup specific tables only
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -t patients \
    -t visits \
    -t billing \
    -F c \
    -f critical_tables_$(date +%Y%m%d).dump \
    "$DB_NAME"
```

---

## Backup Verification

### 1. Backup Verification Script

```bash
sudo nano /opt/nutrivault/scripts/verify-backup.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/nutrivault/database/daily"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.dump.gz | head -1)
TEST_DB="nutrivault_test_restore"

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backup found!"
    exit 1
fi

echo "Verifying backup: $LATEST_BACKUP"

# Verify checksum
if [ -f "${LATEST_BACKUP%.gz}.sha256" ]; then
    gunzip -c "$LATEST_BACKUP" | sha256sum -c "${LATEST_BACKUP%.gz}.sha256"
    if [ $? -eq 0 ]; then
        echo "✓ Checksum verified"
    else
        echo "✗ Checksum verification failed!"
        exit 1
    fi
fi

# Test restore to temporary database
source /opt/nutrivault/backend/.env.production

echo "Creating test database..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS $TEST_DB;" \
    -c "CREATE DATABASE $TEST_DB;"

echo "Restoring backup to test database..."
gunzip -c "$LATEST_BACKUP" | PGPASSWORD="$DB_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$TEST_DB" \
    --no-owner \
    --no-acl

if [ $? -eq 0 ]; then
    echo "✓ Test restore successful"
    
    # Verify data
    ROW_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$TEST_DB" \
        -t -c "SELECT COUNT(*) FROM patients;")
    
    echo "✓ Patients table has $ROW_COUNT rows"
    
    # Cleanup
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE $TEST_DB;"
    
    echo "✓ Backup verification completed successfully"
    exit 0
else
    echo "✗ Test restore failed!"
    exit 1
fi
```

Make it executable:

```bash
sudo chmod +x /opt/nutrivault/scripts/verify-backup.sh
```

---

## Restoration Procedures

### Full Database Restore

```bash
#!/bin/bash
# Full database restore from backup

# CAUTION: This will drop and recreate the database!

BACKUP_FILE="$1"
DB_NAME="nutrivault_prod"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

source /opt/nutrivault/backend/.env.production

echo "⚠️  WARNING: This will DROP and RECREATE the database!"
echo "Database: $DB_NAME"
echo "Backup: $BACKUP_FILE"
read -p "Are you sure? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Stop application
pm2 stop nutrivault-api

# Drop and recreate database
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};
EOF

# Restore from backup
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" pg_restore \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        -v
else
    PGPASSWORD="$DB_PASSWORD" pg_restore \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-acl \
        -v \
        "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully"
    
    # Restart application
    pm2 restart nutrivault-api
    
    echo "✓ Application restarted"
else
    echo "✗ Restore failed!"
    exit 1
fi
```

### Point-in-Time Recovery (PITR)

For point-in-time recovery, you need continuous WAL archiving enabled:

```bash
# In postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/backups/nutrivault/wal/%f'
archive_timeout = 300  # 5 minutes

# Restore to specific point in time
pg_restore ... --target-time '2026-01-07 14:30:00'
```

---

## Disaster Recovery

### Complete Disaster Recovery Plan

1. **Assess the situation**
   - Determine data loss extent
   - Identify last valid backup
   - Estimate downtime

2. **Prepare new environment**
   ```bash
   # Set up new server
   # Install PostgreSQL
   # Configure network/security
   ```

3. **Restore database**
   ```bash
   # Get backup from cloud storage
   aws s3 cp s3://your-bucket/backups/latest.dump.gz .
   
   # Restore
   gunzip -c latest.dump.gz | pg_restore -d nutrivault_prod
   ```

4. **Verify data integrity**
   ```bash
   # Check row counts
   psql -d nutrivault_prod -c "SELECT COUNT(*) FROM patients;"
   
   # Verify recent records
   psql -d nutrivault_prod -c "SELECT * FROM patients ORDER BY created_at DESC LIMIT 10;"
   ```

5. **Update DNS/routing**
   - Point domain to new server
   - Update load balancer
   - Test connectivity

6. **Resume operations**
   - Start application
   - Monitor logs
   - Notify users

### Recovery Time Objectives (RTO/RPO)

| Scenario | RTO | RPO |
|----------|-----|-----|
| Server failure | 1 hour | 24 hours |
| Database corruption | 2 hours | 6 hours |
| Data center outage | 4 hours | 24 hours |
| Ransomware attack | 6 hours | 24 hours |

---

## Backup Monitoring

### Backup Status Dashboard Script

```bash
sudo nano /opt/nutrivault/scripts/backup-status.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/nutrivault/database"

echo "=== NutriVault Backup Status ==="
echo "Date: $(date)"
echo ""

# Check last backup
LAST_BACKUP=$(ls -t $BACKUP_DIR/daily/*.dump.gz 2>/dev/null | head -1)
if [ -n "$LAST_BACKUP" ]; then
    echo "✓ Last backup: $(basename $LAST_BACKUP)"
    echo "  Size: $(du -h $LAST_BACKUP | cut -f1)"
    echo "  Age: $(find $LAST_BACKUP -mtime 0 && echo "< 24h" || echo "> 24h")"
else
    echo "✗ No backups found!"
fi

echo ""
echo "Backup counts:"
echo "  Daily: $(ls -1 $BACKUP_DIR/daily/*.dump.gz 2>/dev/null | wc -l)"
echo "  Weekly: $(ls -1 $BACKUP_DIR/weekly/*.dump.gz 2>/dev/null | wc -l)"
echo "  Monthly: $(ls -1 $BACKUP_DIR/monthly/*.dump.gz 2>/dev/null | wc -l)"

echo ""
echo "Disk usage: $(du -sh $BACKUP_DIR | cut -f1)"

# Check for backup failures
FAILURES=$(grep -i "error\|fail" /var/log/nutrivault/backup.log | tail -5)
if [ -n "$FAILURES" ]; then
    echo ""
    echo "⚠️  Recent failures:"
    echo "$FAILURES"
fi
```

---

## Compliance & Security

### Encryption

```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 backup.dump
gpg --output backup.dump --decrypt backup.dump.gpg
```

### Access Control

```bash
# Secure backup directory
chmod 700 /var/backups/nutrivault
chown -R nutrivault:nutrivault /var/backups/nutrivault

# Secure backup scripts
chmod 750 /opt/nutrivault/scripts/*.sh
```

### Audit Trail

All backup operations are logged to:
- `/var/log/nutrivault/backup.log` - Detailed backup logs
- `/var/log/nutrivault/backup-verify.log` - Verification logs
- Syslog - System-level events

---

## Backup Checklist

### Daily
- [ ] Verify automated backup completed
- [ ] Check backup log for errors
- [ ] Verify disk space availability

### Weekly
- [ ] Run backup verification script
- [ ] Review backup retention policy
- [ ] Test restore procedure (sample data)

### Monthly
- [ ] Full restore test to staging environment
- [ ] Review and update disaster recovery plan
- [ ] Audit backup access logs
- [ ] Verify cloud backup uploads

### Quarterly
- [ ] Disaster recovery drill
- [ ] Review and update RTO/RPO targets
- [ ] Backup strategy review

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-07  
**Maintained By**: DevOps Team
