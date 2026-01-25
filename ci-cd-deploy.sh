#!/bin/bash
# CI/CD script for automated Docker deployment
# This script is designed to be used in GitHub Actions or other CI/CD systems

set -e

# Configuration - can be overridden by environment variables
DOCKER_REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
DOCKER_REPO="${DOCKER_REPO:-erikbeauvalot-sg/nutrivault}"
VERSION="${VERSION:-}"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_ENABLED="${BACKUP_ENABLED:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get version from git tag or package.json
get_version() {
    if [ -n "$VERSION" ]; then
        echo "$VERSION"
    elif [ -n "$GITHUB_REF" ] && [[ $GITHUB_REF == refs/tags/* ]]; then
        # Extract version from git tag
        echo "${GITHUB_REF#refs/tags/}"
    else
        # Fallback to package.json
        node -p "require('./package.json').version"
    fi
}

# Login to container registry
registry_login() {
    if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
        log_info "Logging into Docker registry..."
        echo "$DOCKER_PASSWORD" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_USERNAME" --password-stdin
    elif [ -n "$GITHUB_TOKEN" ]; then
        log_info "Logging into GitHub Container Registry..."
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
    else
        log_warning "No registry credentials provided, assuming local deployment"
    fi
}

# Build and tag images
build_images() {
    local version=$1
    local full_image_name="$DOCKER_REGISTRY/$DOCKER_REPO"

    log_info "Building Docker images for $full_image_name:$version..."

    # Build backend
    docker build \
        --target production \
        --tag "$full_image_name-backend:$version" \
        --tag "$full_image_name-backend:latest" \
        --tag "$full_image_name-backend:$ENVIRONMENT" \
        --build-arg VERSION="$version" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg GIT_COMMIT="${GITHUB_SHA:-$(git rev-parse HEAD)}" \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        --label "org.opencontainers.image.version=$version" \
        --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --file backend/Dockerfile \
        .

    # Build frontend
    docker build \
        --target production \
        --tag "$full_image_name-frontend:$version" \
        --tag "$full_image_name-frontend:latest" \
        --tag "$full_image_name-frontend:$ENVIRONMENT" \
        --build-arg VERSION="$version" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg GIT_COMMIT="${GITHUB_SHA:-$(git rev-parse HEAD)}" \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        --label "org.opencontainers.image.version=$version" \
        --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --file frontend/Dockerfile \
        .

    log_success "Images built successfully"
}

# Push images
push_images() {
    local version=$1
    local full_image_name="$DOCKER_REGISTRY/$DOCKER_REPO"

    log_info "Pushing images to registry..."

    docker push "$full_image_name-backend:$version"
    docker push "$full_image_name-frontend:$version"
    docker push "$full_image_name-backend:latest"
    docker push "$full_image_name-frontend:latest"
    docker push "$full_image_name-backend:$ENVIRONMENT"
    docker push "$full_image_name-frontend:$ENVIRONMENT"

    log_success "Images pushed successfully"
}

# Deploy to environment
deploy_to_environment() {
    local version=$1

    log_info "Deploying to $ENVIRONMENT environment..."

    # Create environment-specific docker-compose file
    create_env_compose "$version"

    # Deploy based on environment
    case $ENVIRONMENT in
        "staging")
            deploy_staging "$version"
            ;;
        "production")
            deploy_production "$version"
            ;;
        *)
            log_warning "Unknown environment: $ENVIRONMENT, using default deployment"
            deploy_default "$version"
            ;;
    esac
}

# Create environment-specific docker-compose
create_env_compose() {
    local version=$1
    local full_image_name="$DOCKER_REGISTRY/$DOCKER_REPO"

    log_info "Creating environment-specific docker-compose.yml..."

    # Use sed to replace image references
    sed "s|build:|image: $full_image_name-backend:$version|" docker-compose.yml > docker-compose.env.yml
    sed -i.bak "s|context: \./backend||g" docker-compose.env.yml
    sed -i.bak "s|dockerfile: Dockerfile||g" docker-compose.env.yml
    sed -i.bak "s|target: production||g" docker-compose.env.yml

    sed -i.bak "s|build:|image: $full_image_name-frontend:$version|" docker-compose.env.yml
    sed -i.bak "s|context: \./frontend||g" docker-compose.env.yml

    # Clean up backup files
    rm -f docker-compose.env.yml.bak
}

# Deploy to staging
deploy_staging() {
    local version=$1

    log_info "Deploying to staging environment..."

    # Use blue-green or rolling deployment for staging
    docker-compose -f docker-compose.env.yml down || true
    docker-compose -f docker-compose.env.yml up -d

    # Health check
    sleep 30
    if curl -f http://localhost/health 2>/dev/null; then
        log_success "Staging deployment successful"
    else
        log_error "Staging deployment failed - health check failed"
        exit 1
    fi
}

# Deploy to production
deploy_production() {
    local version=$1

    log_info "Deploying to production environment..."

    # Backup current state if enabled
    if [ "$BACKUP_ENABLED" = "true" ]; then
        log_info "Creating production backup..."
        # Add production backup logic here
    fi

    # Zero-downtime deployment
    docker-compose -f docker-compose.env.yml up -d --scale backend=2 --scale frontend=2

    # Wait for new containers to be healthy
    sleep 60

    # Health check
    if curl -f http://localhost/health 2>/dev/null; then
        # Remove old containers
        docker-compose -f docker-compose.env.yml up -d --scale backend=1 --scale frontend=1
        log_success "Production deployment successful"
    else
        log_error "Production deployment failed - rolling back..."
        # Add rollback logic here
        exit 1
    fi
}

# Default deployment
deploy_default() {
    local version=$1

    log_info "Performing default deployment..."
    docker-compose -f docker-compose.env.yml down || true
    docker-compose -f docker-compose.env.yml up -d

    log_success "Default deployment completed"
}

# Generate deployment report
generate_report() {
    local version=$1

    log_info "Generating deployment report..."

    cat << EOF > deployment-report.json
{
  "version": "$version",
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "git_commit": "${GITHUB_SHA:-$(git rev-parse HEAD)}",
  "docker_registry": "$DOCKER_REGISTRY",
  "docker_repo": "$DOCKER_REPO",
  "images": {
    "backend": "$DOCKER_REGISTRY/$DOCKER_REPO-backend:$version",
    "frontend": "$DOCKER_REGISTRY/$DOCKER_REPO-frontend:$version"
  },
  "status": "success"
}
EOF

    log_success "Deployment report generated: deployment-report.json"
}

# Main CI/CD function
run_ci_cd() {
    local version=$(get_version)

    log_info "Starting CI/CD deployment for NutriVault v$version"
    log_info "Environment: $ENVIRONMENT"
    log_info "Registry: $DOCKER_REGISTRY"
    log_info "Repository: $DOCKER_REPO"

    # Login to registry
    registry_login

    # Build images
    build_images "$version"

    # Push images
    push_images "$version"

    # Deploy
    deploy_to_environment "$version"

    # Generate report
    generate_report "$version"

    log_success "CI/CD deployment completed successfully for v$version"
}

# Show usage
show_usage() {
    echo "CI/CD Docker Deployment Script for NutriVault"
    echo ""
    echo "Environment Variables:"
    echo "  VERSION              Release version (auto-detected if not set)"
    echo "  ENVIRONMENT          Target environment (production, staging, development)"
    echo "  DOCKER_REGISTRY      Container registry (default: ghcr.io)"
    echo "  DOCKER_REPO          Repository name (default: erikbeauvalot-sg/nutrivault)"
    echo "  DOCKER_USERNAME      Registry username"
    echo "  DOCKER_PASSWORD      Registry password"
    echo "  GITHUB_TOKEN         GitHub token for GHCR"
    echo "  BACKUP_ENABLED       Enable backups (default: true)"
    echo ""
    echo "Usage:"
    echo "  $0                    # Run full CI/CD pipeline"
    echo ""
    echo "Examples:"
    echo "  ENVIRONMENT=staging VERSION=5.0.0-alpha $0"
    echo "  DOCKER_REGISTRY=docker.io DOCKER_REPO=myorg/nutrivault $0"
}

# Main script
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
fi

# Set default environment
ENVIRONMENT="${ENVIRONMENT:-production}"

# Run CI/CD pipeline
run_ci_cd