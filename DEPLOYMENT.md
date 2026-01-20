# NutriVault Production Deployment Guide

This guide covers deploying NutriVault in a production environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Requirements](#server-requirements)
- [Quick Start](#quick-start)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Process Management (PM2)](#process-management-pm2)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Database Management](#database-management)
- [Monitoring & Logs](#monitoring--logs)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18.x LTS or higher
- **npm**: v9.x or higher
- **PM2**: Process manager for Node.js
- **Nginx**: Web server and reverse proxy
- **Git**: Version control

### Optional (Recommended)

- **PostgreSQL**: For production database (or use SQLite for simple deployments)
- **Certbot**: For SSL certificates (Let's Encrypt)

---

## Server Requirements

### Minimum Specifications

- **CPU**: 1 core
- **RAM**: 1 GB
- **Storage**: 10 GB
- **OS**: Ubuntu 20.04/22.04 LTS or similar Linux distribution

### Recommended Specifications

- **CPU**: 2+ cores
- **RAM**: 2 GB+
- **Storage**: 20 GB+ (SSD recommended)
- **OS**: Ubuntu 22.04 LTS

---

## Quick Start

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Create application user (recommended)
sudo adduser --system --group nutrivault
```

### 2. Clone Repository

```bash
# Clone as nutrivault user
sudo su - nutrivault
cd ~
git clone https://github.com/YOUR_USERNAME/nutrivault.git
cd nutrivault
```

### 3. Install Dependencies

```bash
# Install root dependencies (for database commands)
npm install

# Install backend dependencies
cd backend
npm install --production

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Backend Deployment

### 1. Environment Configuration

Create production environment file:

```bash
# From project root
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001

# Database - Choose SQLite OR PostgreSQL
DB_DIALECT=sqlite
DB_STORAGE=./backend/data/nutrivault_prod.db

# For PostgreSQL (uncomment and configure)
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=nutrivault_prod
# DB_USER=nutrivault_user
# DB_PASSWORD=SECURE_PASSWORD_HERE

# JWT Secrets (MUST be 32+ characters)
# Generate with: openssl rand -base64 48
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_MIN_32_CHARS
REFRESH_TOKEN_SECRET=REPLACE_WITH_DIFFERENT_SECURE_STRING_32_CHARS

# Security
BCRYPT_ROUNDS=12

# CORS (your production domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
EOF

# Generate secure secrets
echo "Generate these secrets and add to .env:"
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "REFRESH_TOKEN_SECRET=$(openssl rand -base64 48)"
```

### 2. Database Setup

```bash
# From project root (NOT backend/)
mkdir -p backend/data

# Run migrations
npm run db:migrate

# Seed initial data (roles, permissions, admin user)
npm run db:seed

# Set correct permissions
chmod 600 .env
chmod 700 backend/data
```

### 3. Test Backend

```bash
# Test backend starts correctly
cd backend
NODE_ENV=production node src/server.js

# Check output shows:
# - Correct database file
# - Environment: production
# - Server running on port 3001

# Press Ctrl+C to stop
```

---

## Frontend Deployment

### 1. Frontend Environment Configuration

```bash
# Create frontend/.env
cat > frontend/.env << 'EOF'
VITE_API_URL=https://api.yourdomain.com
VITE_ENV=production
EOF
```

### 2. Build Frontend

```bash
cd frontend

# Build for production
npm run build

# Output will be in frontend/dist/
# This folder contains static HTML/JS/CSS files
```

### 3. Frontend Deployment Options

#### Option A: Nginx Serves Frontend (Recommended)

The built files will be served by Nginx (see Nginx configuration below).

#### Option B: Serve with Node.js (Alternative)

```bash
# Install serve globally
npm install -g serve

# Serve the build folder
serve -s dist -p 3000
```

---

## Process Management (PM2)

### 1. PM2 Setup

Create PM2 ecosystem file:

```bash
# From project root
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'nutrivault-backend',
      cwd: './backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
```

### 2. Start with PM2

```bash
# Create logs directory
mkdir -p backend/logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions from the output
```

### 3. PM2 Commands

```bash
# View running apps
pm2 list

# View logs
pm2 logs nutrivault-backend

# Monitor resources
pm2 monit

# Restart app
pm2 restart nutrivault-backend

# Stop app
pm2 stop nutrivault-backend

# Delete app from PM2
pm2 delete nutrivault-backend
```

---

## Nginx Reverse Proxy

### 1. Nginx Configuration

Create Nginx configuration:

```bash
sudo cat > /etc/nginx/sites-available/nutrivault << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (after certbot setup)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Frontend static files
    root /home/nutrivault/nutrivault/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Max upload size (for documents)
    client_max_body_size 20M;
}
EOF
```

### 2. Enable Nginx Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nutrivault /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Create webroot directory
sudo mkdir -p /var/www/certbot

# Obtain certificate
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Update Nginx config with SSL paths (already in config above)
sudo nginx -t
sudo systemctl reload nginx

# Auto-renewal (certbot sets this up automatically)
# Test renewal
sudo certbot renew --dry-run
```

---

## Database Management

### SQLite (Default)

```bash
# Backup database
cp backend/data/nutrivault_prod.db backend/data/nutrivault_prod.db.backup-$(date +%Y%m%d)

# Restore database
cp backend/data/nutrivault_prod.db.backup-YYYYMMDD backend/data/nutrivault_prod.db

# Automated daily backups (crontab)
crontab -e
# Add:
# 0 2 * * * cp /home/nutrivault/nutrivault/backend/data/nutrivault_prod.db /home/nutrivault/backups/nutrivault_prod.db.$(date +\%Y\%m\%d)
```

### PostgreSQL (Optional)

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE nutrivault_prod;
CREATE USER nutrivault_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nutrivault_prod TO nutrivault_user;
\q

# Update .env with PostgreSQL settings
# DB_DIALECT=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=nutrivault_prod
# DB_USER=nutrivault_user
# DB_PASSWORD=secure_password

# Run migrations
npm run db:migrate
npm run db:seed

# Backup PostgreSQL
pg_dump -U nutrivault_user nutrivault_prod > nutrivault_backup_$(date +%Y%m%d).sql

# Restore PostgreSQL
psql -U nutrivault_user nutrivault_prod < nutrivault_backup_YYYYMMDD.sql
```

---

## Monitoring & Logs

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs nutrivault-backend --lines 100

# Flush logs
pm2 flush

# Log rotation (automatic with PM2)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### Application Logs

```bash
# Backend logs (via PM2)
tail -f backend/logs/output.log
tail -f backend/logs/error.log
```

---

## Security Checklist

### Essential Security Steps

- [ ] **Environment Variables**: All secrets are strong and unique (32+ chars)
- [ ] **File Permissions**: `.env` is chmod 600, database directory is restricted
- [ ] **Firewall**: Only ports 80, 443, and SSH are open
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```
- [ ] **SSL/HTTPS**: Valid SSL certificate installed and auto-renewal configured
- [ ] **Database**: Regular backups configured
- [ ] **System Updates**: Server is up-to-date
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```
- [ ] **SSH Security**: Password authentication disabled, key-based only
- [ ] **CORS**: Only production domains in ALLOWED_ORIGINS
- [ ] **Node.js**: Running LTS version
- [ ] **Dependencies**: No known vulnerabilities
  ```bash
  cd backend && npm audit
  cd ../frontend && npm audit
  ```

### Optional Security Enhancements

- [ ] **Fail2ban**: Protection against brute force attacks
- [ ] **Rate Limiting**: Nginx rate limiting for API endpoints
- [ ] **Database Encryption**: Encrypt SQLite database at rest
- [ ] **Monitoring**: Setup monitoring (e.g., Uptime Robot, Prometheus)
- [ ] **Backups**: Off-site backup storage

---

## Troubleshooting

### Backend Won't Start

```bash
# Check PM2 logs
pm2 logs nutrivault-backend --lines 50

# Common issues:
# 1. Database connection - check .env DB settings
# 2. Port in use - check if port 3001 is available
sudo lsof -i :3001

# 3. Missing dependencies
cd backend && npm install --production

# 4. File permissions
ls -la backend/data
```

### Frontend 404 Errors

```bash
# Ensure build exists
ls -la frontend/dist/

# Rebuild if needed
cd frontend
npm run build

# Check Nginx config
sudo nginx -t

# Check Nginx is serving correct directory
sudo nano /etc/nginx/sites-available/nutrivault
# Verify: root /home/nutrivault/nutrivault/frontend/dist;
```

### Database Errors

```bash
# Check database file exists
ls -la backend/data/

# Check database permissions
chmod 644 backend/data/nutrivault_prod.db
chmod 755 backend/data/

# Re-run migrations
npm run db:migrate

# Check database integrity (SQLite)
sqlite3 backend/data/nutrivault_prod.db "PRAGMA integrity_check;"
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

---

## Updates and Maintenance

### Updating the Application

```bash
# Stop application
pm2 stop nutrivault-backend

# Backup database
cp backend/data/nutrivault_prod.db backend/data/nutrivault_prod.db.backup-$(date +%Y%m%d)

# Pull latest changes
git pull origin main

# Install dependencies
npm install
cd backend && npm install --production
cd ../frontend && npm install

# Run migrations (if any)
npm run db:migrate

# Rebuild frontend
cd frontend && npm run build && cd ..

# Restart application
pm2 restart nutrivault-backend

# Verify
pm2 logs nutrivault-backend --lines 20
```

---

## Support

For issues or questions:
- Check the [README.md](README.md) for general documentation
- Check the [CLAUDE.md](CLAUDE.md) for architecture details
- Review the troubleshooting section above
- Create an issue on GitHub

---

**Last Updated**: January 20, 2026
