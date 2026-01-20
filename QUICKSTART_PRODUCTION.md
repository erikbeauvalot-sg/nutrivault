# Production Quick Start Guide

This is a simplified guide to get NutriVault running in production quickly. For comprehensive deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Prerequisites

- Ubuntu 20.04/22.04 LTS server
- Domain name pointed to your server
- SSH access with sudo privileges

## One-Command Setup (Ubuntu)

```bash
# Install system dependencies
sudo apt update && sudo apt upgrade -y && \
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
sudo apt install -y nodejs nginx git && \
sudo npm install -g pm2

# Clone repository
cd ~
git clone https://github.com/YOUR_USERNAME/nutrivault.git
cd nutrivault

# Setup environment
cp .env.example .env
nano .env  # Edit JWT secrets and other settings

# Deploy
./deploy.sh
```

## Manual Setup (Step by Step)

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt install -y nginx git
```

### 2. Clone and Setup

```bash
# Clone repository
cd ~
git clone https://github.com/YOUR_USERNAME/nutrivault.git
cd nutrivault

# Install dependencies
npm install
cd backend && npm install --production && cd ..
cd frontend && npm install && cd ..
```

### 3. Configure Environment

```bash
# Copy example environment
cp .env.example .env

# Generate secrets
openssl rand -base64 48

# Edit .env and update:
nano .env
```

**Required changes in `.env`:**
```bash
NODE_ENV=production
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
REFRESH_TOKEN_SECRET=ANOTHER_DIFFERENT_SECRET_HERE
DB_DIALECT=sqlite
DB_STORAGE=./backend/data/nutrivault_prod.db
ALLOWED_ORIGINS=https://yourdomain.com
```

### 4. Setup Database

```bash
# Create data directory
mkdir -p backend/data

# Run migrations
npm run db:migrate

# Seed initial data (admin user, roles, permissions)
npm run db:seed
```

**Default admin credentials:**
- Username: `admin`
- Password: `Admin123!`

⚠️ **Change the admin password immediately after first login!**

### 5. Build Frontend

```bash
cd frontend
npm run build
cd ..
```

### 6. Start Backend with PM2

```bash
# Create logs directory
mkdir -p backend/logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### 7. Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/nutrivault
```

**Basic Nginx configuration (without SSL):**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    root /home/YOUR_USER/nutrivault/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
    }

    client_max_body_size 20M;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nutrivault /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run  # Test renewal
```

### 9. Setup Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Verification

### Check Backend is Running

```bash
pm2 list
pm2 logs nutrivault-backend --lines 20
```

You should see:
```
✅ Database synchronized
📁 Database: SQLite: /path/to/nutrivault_prod.db
🌍 Environment: production
🚀 NutriVault Server Running
```

### Test API

```bash
curl http://localhost:3001/health
# Should return: {"status":"OK","message":"NutriVault POC Server is running"}
```

### Access Application

Open your browser to:
- **http://yourdomain.com** (or https:// if SSL configured)
- Login with: username `admin`, password `Admin123!`

## Common Commands

```bash
# View application status
pm2 list

# View logs
pm2 logs nutrivault-backend

# Restart application
pm2 restart nutrivault-backend

# Update application (after git pull)
./update.sh

# Stop application
pm2 stop nutrivault-backend

# Nginx commands
sudo systemctl status nginx
sudo systemctl reload nginx
sudo nginx -t  # Test config
```

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs nutrivault-backend --lines 50

# Check .env file exists and has correct values
cat .env

# Check database exists
ls -la backend/data/
```

### Can't access from browser

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check Nginx config
sudo nginx -t

# Check firewall
sudo ufw status
```

### API errors

```bash
# Check backend logs
pm2 logs nutrivault-backend

# Check backend is running
pm2 list

# Test backend directly
curl http://localhost:3001/health
```

## Next Steps

- Change admin password
- Create additional user accounts
- Configure automatic backups
- Setup monitoring
- Review security checklist in [DEPLOYMENT.md](DEPLOYMENT.md)

## Full Documentation

For comprehensive deployment instructions, SSL setup, PostgreSQL configuration, monitoring, and more, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [README.md](README.md) - General documentation
- [CLAUDE.md](CLAUDE.md) - Architecture and development guide

---

**Need Help?**
- Check [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
- Review application logs with `pm2 logs`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
