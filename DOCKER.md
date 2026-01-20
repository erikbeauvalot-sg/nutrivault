# NutriVault Docker Deployment Guide

This guide covers deploying NutriVault using Docker with a single container containing all services (database, backend, and frontend).

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Building and Running](#building-and-running)
- [Management Commands](#management-commands)
- [Data Persistence](#data-persistence)
- [Production Deployment](#production-deployment)
- [Nginx Reverse Proxy](#nginx-reverse-proxy-optional)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Automated Deployment

```bash
# 1. Copy environment template
cp .env.docker .env

# 2. Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "REFRESH_TOKEN_SECRET=$(openssl rand -base64 48)"

# 3. Edit .env and paste the secrets
nano .env

# 4. Run deployment script
./docker-start.sh
```

### Manual Deployment

```bash
# 1. Setup environment
cp .env.docker .env
nano .env  # Update JWT secrets

# 2. Build and start
docker-compose build
docker-compose up -d

# 3. Initialize database
docker-compose exec nutrivault npm run db:migrate
docker-compose exec nutrivault npm run db:seed

# 4. Access application
open http://localhost:3001
```

**Default Credentials:**
- Username: `admin`
- Password: `Admin123!`

---

## Prerequisites

### Required Software

- **Docker**: 20.10+
- **Docker Compose**: 2.0+ (or Docker with built-in compose)

### Installation

**Ubuntu/Debian:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose (if not included)
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**macOS:**
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

**Windows:**
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

---

## Architecture

### Single Container Design

The Docker container includes:
- **Frontend**: Pre-built React app (served by backend)
- **Backend**: Node.js/Express API server
- **Database**: SQLite (file-based, persisted in volume)

### Multi-Stage Build

```
Stage 1: Frontend Build
  ↓ Build React app

Stage 2: Backend Build
  ↓ Install Node.js dependencies

Stage 3: Production Image
  ↓ Combine frontend + backend
  ↓ Setup non-root user
  ↓ Configure health checks
```

### Ports

- **3001**: Backend API and frontend (combined)
- **80/443**: (Optional) Nginx reverse proxy

### Volumes

- `nutrivault-data`: Database files
- `nutrivault-uploads`: Uploaded documents
- `nutrivault-logs`: Application logs

---

## Configuration

### Environment Variables

Create `.env` file:

```bash
# Required: JWT Secrets (32+ characters)
JWT_SECRET=your-generated-secret-here-min-32-chars
REFRESH_TOKEN_SECRET=different-secret-here-min-32-chars

# Optional: CORS Configuration
ALLOWED_ORIGINS=http://localhost:3001,https://yourdomain.com
```

**Generate Secure Secrets:**

```bash
# Generate two different secrets
openssl rand -base64 48
openssl rand -base64 48
```

### Docker Compose Configuration

The `docker-compose.yml` is pre-configured with:
- Automatic restart policy
- Volume mounts for data persistence
- Health checks
- Network isolation

To customize:

```yaml
# Edit docker-compose.yml
services:
  nutrivault:
    ports:
      - "8080:3001"  # Change host port
    environment:
      - BCRYPT_ROUNDS=14  # Increase security
```

---

## Building and Running

### Build Image

```bash
# Build the Docker image
docker-compose build

# Build without cache (fresh build)
docker-compose build --no-cache

# Build with specific tag
docker build -t nutrivault:v1.0 .
```

### Start Application

```bash
# Start in background (detached mode)
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service
docker-compose up nutrivault
```

### Initialize Database

**First time setup:**

```bash
# Run migrations
docker-compose exec nutrivault npm run db:migrate

# Seed initial data (roles, permissions, admin user)
docker-compose exec nutrivault npm run db:seed
```

**Reset database:**

```bash
# Complete reset (undo → migrate → seed)
docker-compose exec nutrivault npm run db:reset
```

---

## Management Commands

### Container Management

```bash
# View running containers
docker-compose ps

# View container logs
docker-compose logs -f nutrivault

# View last 100 log lines
docker-compose logs --tail=100 nutrivault

# Restart container
docker-compose restart nutrivault

# Stop containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (⚠️ deletes data)
docker-compose down -v
```

### Application Commands

```bash
# Execute command in running container
docker-compose exec nutrivault <command>

# Examples:
docker-compose exec nutrivault npm run db:migrate
docker-compose exec nutrivault npm run db:seed
docker-compose exec nutrivault node -v
docker-compose exec nutrivault ls -la backend/data

# Open shell in container
docker-compose exec nutrivault sh

# Run command as root (for debugging)
docker-compose exec --user root nutrivault sh
```

### Database Management

```bash
# Backup database
docker-compose exec nutrivault sh -c 'cp /app/backend/data/nutrivault_prod.db /app/backend/data/nutrivault_backup_$(date +%Y%m%d).db'

# Copy backup to host
docker cp nutrivault:/app/backend/data/nutrivault_backup_20260120.db ./backup.db

# Restore database
docker cp ./backup.db nutrivault:/app/backend/data/nutrivault_prod.db
docker-compose restart nutrivault
```

### Health Checks

```bash
# Check container health
docker-compose ps

# Manual health check
curl http://localhost:3001/health

# View health check logs
docker inspect nutrivault --format='{{json .State.Health}}'
```

---

## Data Persistence

NutriVault supports two storage options:

1. **Docker Volumes** (default) - Managed by Docker
2. **External Storage** (recommended for production) - Host directories

### Option 1: Docker Volumes (Default)

Data is persisted in Docker volumes:

| Volume | Purpose | Location in Container |
|--------|---------|----------------------|
| `nutrivault-data` | SQLite database | `/app/backend/data` |
| `nutrivault-uploads` | Document uploads | `/app/backend/uploads` |
| `nutrivault-logs` | Application logs | `/app/backend/logs` |

### Option 2: External Storage (Recommended for Production)

Store data in host directories for easy backup and access.

**Quick Setup:**
```bash
# Setup external storage structure
./setup-external-storage.sh

# Deploy with external storage
docker-compose -f docker-compose.external-storage.yml up -d
```

**Benefits:**
- ✅ Easy backups (simple file copy)
- ✅ Direct access to database files
- ✅ Network storage support (NFS, SMB)
- ✅ Better control and troubleshooting

**See [DOCKER_EXTERNAL_STORAGE.md](DOCKER_EXTERNAL_STORAGE.md) for complete guide.**

### Backup Strategy

**Manual Backup:**

```bash
# Create backup script
cat > backup-docker.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup database
docker cp nutrivault:/app/backend/data/nutrivault_prod.db "$BACKUP_DIR/database.db"

# Backup uploads
docker cp nutrivault:/app/backend/uploads "$BACKUP_DIR/"

echo "Backup complete: $BACKUP_DIR"
EOF

chmod +x backup-docker.sh
./backup-docker.sh
```

**Automated Backup (Cron):**

```bash
# Add to crontab (daily at 2 AM)
crontab -e

# Add line:
0 2 * * * cd /path/to/nutrivault && ./backup-docker.sh
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect nutrivault-data

# Backup volume
docker run --rm -v nutrivault-data:/data -v $(pwd):/backup alpine tar czf /backup/nutrivault-data-backup.tar.gz /data

# Restore volume
docker run --rm -v nutrivault-data:/data -v $(pwd):/backup alpine tar xzf /backup/nutrivault-data-backup.tar.gz -C /
```

---

## Production Deployment

### Basic Production Setup

```bash
# 1. Create production .env
cat > .env << 'EOF'
JWT_SECRET=<STRONG-SECRET-HERE>
REFRESH_TOKEN_SECRET=<DIFFERENT-STRONG-SECRET>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
EOF

# 2. Build and start
docker-compose up -d

# 3. Initialize database
docker-compose exec nutrivault npm run db:migrate
docker-compose exec nutrivault npm run db:seed

# 4. Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Production Checklist

- [ ] Strong JWT secrets (48+ characters)
- [ ] CORS configured with production domains
- [ ] Regular database backups configured
- [ ] SSL/HTTPS configured (via Nginx)
- [ ] Firewall configured
- [ ] Health monitoring setup
- [ ] Log rotation configured
- [ ] Admin password changed from default

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  nutrivault:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## Nginx Reverse Proxy (Optional)

The docker-compose includes an optional Nginx service for production deployments.

### Enable Nginx

```bash
# Start with Nginx profile
docker-compose --profile with-nginx up -d
```

### Nginx Configuration

Create `nginx/conf.d/nutrivault.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates (mount via volume)
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Proxy to NutriVault
    location / {
        proxy_pass http://nutrivault:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 20M;
}
```

### SSL with Let's Encrypt

```bash
# Install certbot on host
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to volume
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Start with Nginx
docker-compose --profile with-nginx up -d
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs nutrivault

# Common issues:
# 1. Port already in use
sudo lsof -i :3001
docker-compose down

# 2. Missing .env file
cp .env.docker .env

# 3. Build errors
docker-compose build --no-cache
```

### Database Errors

```bash
# Check if database file exists
docker-compose exec nutrivault ls -la /app/backend/data/

# Re-run migrations
docker-compose exec nutrivault npm run db:reset

# Check permissions
docker-compose exec nutrivault ls -la /app/backend/

# Restore from backup
docker cp ./backup.db nutrivault:/app/backend/data/nutrivault_prod.db
docker-compose restart
```

### Health Check Failures

```bash
# View health status
docker inspect nutrivault | grep -A 10 Health

# Test health endpoint
curl http://localhost:3001/health

# Check container logs
docker-compose logs --tail=50 nutrivault
```

### Network Issues

```bash
# Inspect network
docker network inspect nutrivault_nutrivault-network

# Restart networking
docker-compose down
docker-compose up -d

# Test connectivity
docker-compose exec nutrivault curl http://localhost:3001/health
```

### Permission Issues

```bash
# Check file permissions in container
docker-compose exec nutrivault ls -la /app/backend/data

# Fix permissions (run as root)
docker-compose exec --user root nutrivault chown -R nutrivault:nutrivault /app/backend/data
docker-compose restart
```

### Memory Issues

```bash
# Check container stats
docker stats nutrivault

# View memory usage
docker inspect nutrivault | grep -i memory

# Increase memory limit in docker-compose.yml
```

---

## Updates and Maintenance

### Updating Application

```bash
# 1. Stop containers
docker-compose down

# 2. Backup database (volumes persist)
docker cp nutrivault:/app/backend/data/nutrivault_prod.db ./backup_before_update.db

# 3. Pull latest code
git pull origin main

# 4. Rebuild image
docker-compose build --no-cache

# 5. Start updated containers
docker-compose up -d

# 6. Run new migrations
docker-compose exec nutrivault npm run db:migrate

# 7. Verify
docker-compose logs --tail=20 nutrivault
curl http://localhost:3001/health
```

### Log Rotation

```bash
# Configure Docker log rotation
# Edit /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker
```

---

## Docker Image Registry

### Build for Production

```bash
# Build with version tag
docker build -t nutrivault:1.0.0 .

# Tag for registry
docker tag nutrivault:1.0.0 yourusername/nutrivault:1.0.0
docker tag nutrivault:1.0.0 yourusername/nutrivault:latest
```

### Push to Registry

```bash
# Login to Docker Hub
docker login

# Push images
docker push yourusername/nutrivault:1.0.0
docker push yourusername/nutrivault:latest
```

### Pull and Run

```bash
# Pull from registry
docker pull yourusername/nutrivault:latest

# Run directly
docker run -d \
  -p 3001:3001 \
  -e JWT_SECRET="your-secret" \
  -e REFRESH_TOKEN_SECRET="another-secret" \
  -v nutrivault-data:/app/backend/data \
  yourusername/nutrivault:latest
```

---

## Useful Scripts

All scripts are in the project root:

| Script | Purpose |
|--------|---------|
| `docker-start.sh` | Automated deployment |
| `docker-stop.sh` | Stop containers |
| `docker-compose.yml` | Container configuration |
| `.env.docker` | Environment template |

---

## Support

For issues:
- Check logs: `docker-compose logs nutrivault`
- Review [Troubleshooting](#troubleshooting) section
- See [README.md](README.md) for general documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for non-Docker deployment

---

**Last Updated**: January 20, 2026
