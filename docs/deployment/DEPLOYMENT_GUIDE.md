# NutriVault Deployment Guide

**Version**: 1.0  
**Last Updated**: 2026-01-07  
**Status**: Production Ready

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Post-Deployment Validation](#post-deployment-validation)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### System Requirements

**Backend Server**:
- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- 2GB RAM minimum (4GB recommended)
- 20GB disk space minimum
- Ubuntu 20.04 LTS or higher (recommended)

**Frontend Server** (optional, if serving separately):
- Node.js 18.x or higher
- Nginx 1.18 or higher
- 1GB RAM minimum
- 10GB disk space minimum

### Required Access

- [ ] Server SSH access with sudo privileges
- [ ] Domain name configured with DNS access
- [ ] SSL certificate (Let's Encrypt recommended)
- [ ] PostgreSQL database (RDS, managed, or self-hosted)
- [ ] Email service for notifications (SendGrid, AWS SES, etc.)

---

## Environment Setup

### 1. Create Production User

```bash
# Create dedicated user for the application
sudo adduser nutrivault
sudo usermod -aG sudo nutrivault

# Switch to new user
su - nutrivault
```

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install PM2 for process management
sudo npm install -g pm2

# Verify installations
node --version  # Should be 18.x
npm --version
psql --version
nginx -v
pm2 --version
```

### 3. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/nutrivault
sudo chown nutrivault:nutrivault /opt/nutrivault

# Clone repository
cd /opt/nutrivault
git clone https://github.com/your-org/nutrivault.git .

# Or if using SSH
git clone git@github.com:your-org/nutrivault.git .
```

---

## Database Setup

### 1. Create Production Database

**If using managed database (AWS RDS, DigitalOcean, etc.)**:
- Create PostgreSQL instance via provider console
- Note connection details: host, port, database name, username, password
- Enable automated backups
- Configure security groups to allow access from application server

**If self-hosting**:

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE nutrivault_prod;
CREATE USER nutrivault_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE nutrivault_prod TO nutrivault_user;
ALTER DATABASE nutrivault_prod OWNER TO nutrivault_user;
\q
EOF

# Test connection
psql -h localhost -U nutrivault_user -d nutrivault_prod -W
```

### 2. Configure Database Connection

Create production environment file:

```bash
cd /opt/nutrivault/backend
nano .env.production
```

Add configuration:

```env
# Application
NODE_ENV=production
PORT=3001
API_BASE_URL=https://api.yourdomain.com

# Database
DB_HOST=your-db-host.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=nutrivault_prod
DB_USER=nutrivault_user
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE
DB_SSL=true

# Connection Pool
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Query Timeouts
DB_STATEMENT_TIMEOUT=30000
DB_IDLE_TIMEOUT=30000

# JWT
JWT_SECRET=YOUR_SECURE_JWT_SECRET_HERE_MIN_32_CHARS
JWT_REFRESH_SECRET=YOUR_SECURE_REFRESH_SECRET_HERE_MIN_32_CHARS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# Email (if applicable)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
SMTP_FROM=noreply@yourdomain.com

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

**Security Note**: Never commit `.env.production` to version control!

```bash
# Secure the file
chmod 600 .env.production
```

### 3. Run Migrations

```bash
cd /opt/nutrivault/backend

# Install dependencies
npm ci --production

# Run migrations
NODE_ENV=production npm run db:migrate

# Verify migrations
NODE_ENV=production npx sequelize-cli db:migrate:status
```

### 4. Seed Initial Data (Optional)

```bash
# Create admin user and initial data
NODE_ENV=production npm run db:seed

# Or manually create admin user
NODE_ENV=production node scripts/create-admin.js
```

---

## Backend Deployment

### 1. Install Dependencies

```bash
cd /opt/nutrivault/backend
npm ci --production
```

### 2. Build (if using TypeScript)

```bash
npm run build
```

### 3. Configure PM2

Create PM2 ecosystem file:

```bash
nano /opt/nutrivault/ecosystem.config.js
```

Add configuration:

```javascript
module.exports = {
  apps: [{
    name: 'nutrivault-api',
    cwd: '/opt/nutrivault/backend',
    script: 'src/server.js',
    instances: 2,  // Use 2 instances for load balancing
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    env_file: '/opt/nutrivault/backend/.env.production',
    error_file: '/var/log/nutrivault/api-error.log',
    out_file: '/var/log/nutrivault/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    watch: false,
  }]
};
```

### 4. Create Log Directory

```bash
sudo mkdir -p /var/log/nutrivault
sudo chown -R nutrivault:nutrivault /var/log/nutrivault
```

### 5. Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u nutrivault --hp /home/nutrivault
# Copy and run the command that PM2 outputs

# Check status
pm2 status
pm2 logs nutrivault-api

# Monitor
pm2 monit
```

### 6. Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/nutrivault-api
```

Add configuration:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

upstream nutrivault_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration (will be set up by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/nutrivault-api-access.log;
    error_log /var/log/nginx/nutrivault-api-error.log;

    # File upload size
    client_max_body_size 10M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

        # Proxy settings
        proxy_pass http://nutrivault_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # CORS (if needed)
        add_header Access-Control-Allow-Origin "https://yourdomain.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        add_header Access-Control-Allow-Credentials "true" always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Health check endpoint
    location /health {
        proxy_pass http://nutrivault_backend/health;
        access_log off;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/nutrivault-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Frontend Deployment

### 1. Build Frontend

```bash
cd /opt/nutrivault/frontend

# Install dependencies
npm ci

# Create production environment file
nano .env.production
```

Add configuration:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=NutriVault
VITE_APP_VERSION=1.0.0
```

Build the application:

```bash
# Build for production
npm run build

# Verify build
ls -la dist/
```

### 2. Configure Nginx for Frontend

```bash
sudo nano /etc/nginx/sites-available/nutrivault-frontend
```

Add configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root directory
    root /opt/nutrivault/frontend/dist;
    index index.html;

    # Logging
    access_log /var/log/nginx/nutrivault-frontend-access.log;
    error_log /var/log/nginx/nutrivault-frontend-error.log;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/nutrivault-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate for API
sudo certbot --nginx -d api.yourdomain.com

# Obtain certificate for frontend
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Certbot will automatically renew certificates
# Verify renewal timer is active
sudo systemctl status certbot.timer
```

### Manual SSL Certificate

If using a purchased SSL certificate:

```bash
# Copy certificate files to server
sudo mkdir -p /etc/ssl/nutrivault
sudo cp your-certificate.crt /etc/ssl/nutrivault/
sudo cp your-private-key.key /etc/ssl/nutrivault/
sudo cp your-ca-bundle.crt /etc/ssl/nutrivault/

# Secure the files
sudo chmod 600 /etc/ssl/nutrivault/*
sudo chown root:root /etc/ssl/nutrivault/*

# Update Nginx configuration to point to these files
```

---

## Monitoring & Logging

### 1. PM2 Monitoring

```bash
# View logs in real-time
pm2 logs nutrivault-api

# Monitor CPU and memory
pm2 monit

# Generate status report
pm2 report
```

### 2. Log Rotation

```bash
sudo nano /etc/logrotate.d/nutrivault
```

Add configuration:

```
/var/log/nutrivault/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nutrivault nutrivault
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/nutrivault-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### 3. Health Check Script

```bash
nano /opt/nutrivault/scripts/health-check.sh
```

Add script:

```bash
#!/bin/bash

API_URL="https://api.yourdomain.com/health"
FRONTEND_URL="https://yourdomain.com"

# Check API health
api_status=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
if [ $api_status -eq 200 ]; then
    echo "[$(date)] API is healthy"
else
    echo "[$(date)] API is down! Status: $api_status"
    # Send alert (email, Slack, etc.)
fi

# Check frontend
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
if [ $frontend_status -eq 200 ]; then
    echo "[$(date)] Frontend is healthy"
else
    echo "[$(date)] Frontend is down! Status: $frontend_status"
    # Send alert
fi
```

Make it executable and add to cron:

```bash
chmod +x /opt/nutrivault/scripts/health-check.sh

# Add to crontab (run every 5 minutes)
crontab -e
# Add: */5 * * * * /opt/nutrivault/scripts/health-check.sh >> /var/log/nutrivault/health-check.log 2>&1
```

---

## Backup & Recovery

### Database Backups

See [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) for detailed backup procedures.

Quick setup:

```bash
# Create backup script
nano /opt/nutrivault/scripts/backup-database.sh
```

Add script:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/nutrivault/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="nutrivault_prod"
DB_USER="nutrivault_user"
DB_HOST="your-db-host"

mkdir -p $BACKUP_DIR

# Create backup
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -F c -b -v -f "$BACKUP_DIR/backup_$DATE.dump" $DB_NAME

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.dump" -mtime +7 -delete

echo "[$(date)] Database backup completed: backup_$DATE.dump"
```

Make executable and schedule:

```bash
chmod +x /opt/nutrivault/scripts/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/nutrivault/scripts/backup-database.sh >> /var/log/nutrivault/backup.log 2>&1
```

---

## Post-Deployment Validation

### 1. Backend Validation

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs nutrivault-api --lines 50

# Test API health endpoint
curl https://api.yourdomain.com/health

# Test API authentication
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

### 2. Frontend Validation

```bash
# Test frontend accessibility
curl -I https://yourdomain.com

# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null

# Test routing
curl -I https://yourdomain.com/dashboard
curl -I https://yourdomain.com/patients
```

### 3. Performance Testing

```bash
cd /opt/nutrivault/backend/performance

# Run load tests
./run-load-tests.sh

# Check results
cat reports/load-test-*.json
```

### 4. Security Validation

```bash
# Test SSL configuration
curl https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com

# Check security headers
curl -I https://yourdomain.com

# Test rate limiting
for i in {1..10}; do curl https://api.yourdomain.com/api/patients; done
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Stop current version
pm2 stop nutrivault-api

# Checkout previous version
cd /opt/nutrivault
git checkout <previous-commit-hash>

# Install dependencies
cd backend
npm ci --production

# Restart
pm2 restart nutrivault-api

# Verify
pm2 logs nutrivault-api
```

### Database Rollback

```bash
# Rollback last migration
cd /opt/nutrivault/backend
NODE_ENV=production npx sequelize-cli db:migrate:undo

# Or rollback to specific migration
NODE_ENV=production npx sequelize-cli db:migrate:undo:all --to <migration-name>

# Verify
NODE_ENV=production npx sequelize-cli db:migrate:status
```

### Full System Rollback

1. Stop services: `pm2 stop all`
2. Restore database from backup (see DATABASE_BACKUP.md)
3. Checkout previous code version
4. Reinstall dependencies
5. Restart services: `pm2 restart all`
6. Verify functionality

---

## Troubleshooting

### Backend Issues

**PM2 won't start**:
```bash
# Check logs
pm2 logs nutrivault-api --lines 100

# Check environment
pm2 env 0

# Restart with verbose logging
pm2 restart nutrivault-api --update-env
```

**Database connection errors**:
```bash
# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -W

# Check .env.production file
cat backend/.env.production | grep DB_
```

**High memory usage**:
```bash
# Check PM2 memory
pm2 monit

# Restart if needed
pm2 restart nutrivault-api
```

### Nginx Issues

**502 Bad Gateway**:
```bash
# Check backend is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/nutrivault-api-error.log

# Test backend directly
curl http://localhost:3001/health
```

**SSL errors**:
```bash
# Check certificate validity
sudo certbot certificates

# Renew if needed
sudo certbot renew --force-renewal

# Check Nginx configuration
sudo nginx -t
```

---

## Maintenance Tasks

### Daily
- [ ] Check PM2 status and logs
- [ ] Monitor disk space usage
- [ ] Review error logs

### Weekly
- [ ] Review application performance
- [ ] Check database performance
- [ ] Verify backup completion
- [ ] Update dependencies (security patches)

### Monthly
- [ ] Review and rotate logs
- [ ] Update system packages
- [ ] Performance optimization review
- [ ] Security audit

---

## Support & Resources

- **Documentation**: `/opt/nutrivault/docs/`
- **Logs**: `/var/log/nutrivault/`
- **Backups**: `/var/backups/nutrivault/`
- **PM2 Dashboard**: `pm2 web` (http://localhost:9615)

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2026-01-07  
**Maintained By**: DevOps Team
