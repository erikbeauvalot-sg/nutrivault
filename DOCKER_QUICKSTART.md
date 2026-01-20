# Docker Quick Start

Deploy NutriVault with Docker in 3 steps.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Deployment

### Step 1: Configure Environment

```bash
# Copy template
cp .env.docker .env

# Generate secrets
openssl rand -base64 48  # Use for JWT_SECRET
openssl rand -base64 48  # Use for REFRESH_TOKEN_SECRET

# Edit .env and paste the secrets
nano .env
```

### Step 2: Deploy

```bash
./docker-start.sh
```

### Step 3: Access

Open http://localhost:3001

**Default credentials:**
- Username: `admin`
- Password: `Admin123!`

⚠️ **Change password immediately!**

## Common Commands

```bash
# View status
docker-compose ps

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Backup database
docker cp nutrivault:/app/backend/data/nutrivault_prod.db ./backup.db
```

## Troubleshooting

### Can't access application

```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs nutrivault

# Restart
docker-compose restart
```

### Database errors

```bash
# Re-run migrations
docker-compose exec nutrivault npm run db:reset
```

## Full Documentation

See [DOCKER.md](DOCKER.md) for comprehensive documentation.

## Production Setup

For production deployment with SSL/HTTPS, see the "Production Deployment" section in [DOCKER.md](DOCKER.md).
