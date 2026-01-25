# Docker Deployment Scripts

This directory contains scripts to manage Docker deployments for NutriVault releases.

## Scripts Overview

### `deploy-release.sh`
**Purpose**: Deploy the current release version to Docker containers (local development)

**Features**:
- Automatically reads version from `package.json`
- Creates backups of database and uploads
- Pulls latest code from git
- Cleans up old Docker containers and cache
- Builds and deploys new containers
- Performs health checks
- Provides deployment status and useful commands

**Usage**:
```bash
# Deploy current version from package.json
./deploy-release.sh

# Deploy specific version
./deploy-release.sh --version 5.0.0-alpha

# Skip backup (not recommended)
./deploy-release.sh --no-backup

# Skip cleanup
./deploy-release.sh --no-cleanup

# Show help
./deploy-release.sh --help
```

### `update-docker-version.sh`
**Purpose**: Advanced Docker management for production deployments with versioned images

**Features**:
- Builds versioned Docker images from the root directory
- Pushes images to container registries
- Updates docker-compose.yml to use versioned images
- Supports different deployment actions

**Build Context**: Builds from the project root directory (`.`) to ensure Dockerfiles can access all necessary files (models/, migrations/, config/, etc.)

**Usage**:
```bash
# Full pipeline (build -> push -> deploy)
./update-docker-version.sh 5.0.0-alpha all

# Only build images
./update-docker-version.sh 5.0.0-alpha build

# Only push images
./update-docker-version.sh 5.0.0-alpha push

# Only deploy (update compose and restart)
./update-docker-version.sh 5.0.0-alpha deploy

# Use version from package.json
./update-docker-version.sh all

# Show help
./update-docker-version.sh --help
```

### `ci-cd-deploy.sh`
**Purpose**: Automated CI/CD deployment script for GitHub Actions and other CI/CD systems

**Features**:
- Auto-detects version from git tags or package.json
- Supports multiple environments (production, staging, development)
- Builds and pushes images to container registries from the root directory
- Environment-specific deployments with health checks
- Generates deployment reports
- Supports GitHub Container Registry (GHCR) and other registries

**Build Context**: Builds from the project root directory (`.`) to ensure Dockerfiles can access all necessary files and dependencies

**Environment Variables**:
- `VERSION`: Release version (auto-detected if not set)
- `ENVIRONMENT`: Target environment (production, staging, development)
- `DOCKER_REGISTRY`: Container registry (default: ghcr.io)
- `DOCKER_REPO`: Repository name (default: erikbeauvalot-sg/nutrivault)
- `DOCKER_USERNAME`/`DOCKER_PASSWORD`: Registry credentials
- `GITHUB_TOKEN`: GitHub token for GHCR authentication
- `BACKUP_ENABLED`: Enable backups (default: true)

**Usage**:
```bash
# Run full CI/CD pipeline
./ci-cd-deploy.sh

# Deploy to staging
ENVIRONMENT=staging ./ci-cd-deploy.sh

# Deploy specific version
VERSION=5.0.0-alpha ./ci-cd-deploy.sh

# Use different registry
DOCKER_REGISTRY=docker.io DOCKER_REPO=myorg/nutrivault ./ci-cd-deploy.sh
```

**GitHub Actions Example**:
```yaml
- name: Deploy to Production
  run: ./ci-cd-deploy.sh
  env:
    ENVIRONMENT: production
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    BACKUP_ENABLED: true
```

## Environment Variables

For `update-docker-version.sh`:

- `DOCKER_REGISTRY`: Docker registry (default: `nutrivault`)
- `DOCKER_REPO`: Docker repository (default: `erikbeauvalot-sg/nutrivault`)

Example:
```bash
export DOCKER_REGISTRY=myregistry.com
export DOCKER_REPO=myorg/nutrivault
./update-docker-version.sh 5.0.0-alpha all
```

## Docker Compose Configuration

The scripts expect a `docker-compose.yml` file in the root directory. The compose file supports both **development mode** (build from source) and **production mode** (use pre-built images).

### Development Mode (Build from Source)
```bash
# Build and run from source code
docker-compose up --build

# Or with specific version
VERSION=5.0.0-alpha docker-compose up --build
```

### Production Mode (Pre-built Images)
```bash
# Use pre-built images (after running deployment scripts)
VERSION=5.0.0-alpha docker-compose up

# With custom registry
VERSION=5.0.0-alpha DOCKER_REGISTRY=ghcr.io DOCKER_REPO=user/repo docker-compose up

# With local registry
VERSION=5.0.0-alpha DOCKER_REGISTRY=localhost:5000 docker-compose up
```

### Configuration

```yaml
version: '3.8'

services:
  backend:
    # Uses pre-built image if VERSION is set, otherwise builds from source
    image: ${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${VERSION:-latest}
    build:
      context: .
      dockerfile: backend/Dockerfile
      target: production
      args:
        VERSION: ${VERSION}
        BUILD_DATE: ${BUILD_DATE}
        GIT_COMMIT: ${GIT_COMMIT}
    # ... rest of configuration

  frontend:
    # Same logic as backend
    image: ${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${VERSION:-latest}
    build:
      context: .
      dockerfile: frontend/Dockerfile
      target: production
      args:
        VERSION: ${VERSION}
        BUILD_DATE: ${BUILD_DATE}
        GIT_COMMIT: ${GIT_COMMIT}
```

### Environment Variables

See `env.example` for all available environment variables. Key variables:

- `VERSION`: Application version (used for image tagging)
- `DOCKER_REGISTRY`: Container registry (default: `nutrivault`)
- `DOCKER_REPO`: Repository name (default: `erikbeauvalot-sg/nutrivault`)
- `BUILD_DATE`: Build timestamp (set by deployment scripts)
- `GIT_COMMIT`: Git commit hash (set by deployment scripts)

**Important**: All Docker builds use the project root (`.`) as the build context. This allows Dockerfiles to access shared files like `models/`, `migrations/`, `config/`, and other directories that are outside the individual service directories.

## Naming Conventions

All scripts follow consistent naming conventions for Docker images:

### Image Naming Format
```
{DOCKER_REGISTRY}/{DOCKER_REPO}-{service}:{version}
```

### Examples
- Backend: `nutrivault/erikbeauvalot-sg/nutrivault-backend:5.0.0-alpha`
- Frontend: `nutrivault/erikbeauvalot-sg/nutrivault-frontend:5.0.0-alpha`
- Latest tags: `nutrivault/erikbeauvalot-sg/nutrivault-backend:latest`

### Environment Variables
- `DOCKER_REGISTRY`: Container registry (default: `nutrivault`)
- `DOCKER_REPO`: Repository name (default: `erikbeauvalot-sg/nutrivault`)
- `VERSION`: Application version for image tagging

This ensures all scripts (`update-docker-version.sh`, `ci-cd-deploy.sh`, and `docker-compose.yml`) use identical image names.

## Workflow Examples

### Development Deployment
```bash
# Quick local deployment
./deploy-release.sh

# Deploy specific version
./deploy-release.sh --version 5.0.0-alpha
```

### Production Deployment
```bash
# Build and push versioned images
./update-docker-version.sh 5.0.0-alpha build
./update-docker-version.sh 5.0.0-alpha push

# On production server
./update-docker-version.sh 5.0.0-alpha deploy
```

### Release Process
```bash
# 1. Update version in package.json files
# 2. Commit and tag the release
git tag -a v5.0.0-alpha -m "Release v5.0.0-alpha"

# 3. Deploy locally for testing
./deploy-release.sh

# 4. For production with registry
./update-docker-version.sh 5.0.0-alpha all
```

## Backup and Recovery

The `deploy-release.sh` script automatically creates backups in directories named:
`backup-YYYYMMDD-HHMMSS-v{VERSION}`

To restore from backup:
```bash
# Stop containers
docker-compose down

# Restore database
cp backup-20240125-143000-v5.0.0-alpha/nutrivault.db ./

# Restore uploads
cp -r backup-20240125-143000-v5.0.0-alpha/uploads ./

# Restart containers
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80 and 3001 are available
2. **Permission issues**: Run with appropriate Docker permissions
3. **Build failures**: Check Docker build logs with `docker-compose logs`
4. **Health check failures**: Wait longer or check service logs

### Useful Commands

```bash
# View logs
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart

# View container status
docker-compose ps

# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# Clean up everything
docker-compose down -v --remove-orphans
docker system prune -f
```

## Security Notes

- Never commit `.env` files to version control
- Use strong JWT secrets in production
- Regularly update base Docker images
- Monitor container logs for security issues
- Use Docker secrets for sensitive configuration

## Version Management

Versions are read from `package.json` and should follow semantic versioning:
- `x.y.z` for stable releases
- `x.y.z-alpha`, `x.y.z-beta` for pre-releases

The scripts automatically use the version for:
- Docker image tags
- Build arguments
- Backup directory names
- Logging and status messages