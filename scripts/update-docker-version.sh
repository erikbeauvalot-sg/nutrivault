#!/bin/bash
# Script to update Docker containers based on release version
# Usage: ./update-docker-version.sh [version] [action]
# Actions: build, push, deploy, all
# If no version specified, reads from package.json

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-nutrivault}"
DOCKER_REPO="${DOCKER_REPO:-erikbeauvalot-sg/nutrivault}"
COMPOSE_FILE="docker-compose.yml"

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

# Get version from package.json
get_version() {
    if [ -f "package.json" ]; then
        VERSION=$(node -p "require('./package.json').version")
        echo "$VERSION"
    else
        log_error "package.json not found"
        exit 1
    fi
}

# Validate version format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        log_error "Invalid version format: $version"
        log_error "Expected format: x.y.z or x.y.z-prerelease"
        exit 1
    fi
}

# Build Docker images with version tags
build_images() {
    local version=$1
    log_info "Building Docker images for version $version..."

    # Build backend image
    log_info "Building backend image..."
    docker build \
        --target production \
        --tag "$DOCKER_REGISTRY/$DOCKER_REPO-backend:$version" \
        --tag "$DOCKER_REGISTRY/$DOCKER_REPO-backend:latest" \
        --build-arg VERSION="$version" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg GIT_COMMIT="$(git rev-parse HEAD)" \
        --file backend/Dockerfile \
        .

    # Build frontend image
    log_info "Building frontend image..."
    docker build \
        --target production \
        --tag "$DOCKER_REGISTRY/$DOCKER_REPO-frontend:$version" \
        --tag "$DOCKER_REGISTRY/$DOCKER_REPO-frontend:latest" \
        --build-arg VERSION="$version" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg GIT_COMMIT="$(git rev-parse HEAD)" \
        --file frontend/Dockerfile \
        .

    log_success "Images built successfully"
}

# Push images to registry
push_images() {
    local version=$1
    log_info "Pushing images to registry for version $version..."

    # Push backend images
    log_info "Pushing backend images..."
    docker push "$DOCKER_REGISTRY/$DOCKER_REPO-backend:$version"
    docker push "$DOCKER_REGISTRY/$DOCKER_REPO-backend:latest"

    # Push frontend images
    log_info "Pushing frontend images..."
    docker push "$DOCKER_REGISTRY/$DOCKER_REPO-frontend:$version"
    docker push "$DOCKER_REGISTRY/$DOCKER_REPO-frontend:latest"

    log_success "Images pushed successfully"
}

# Update docker-compose.yml with versioned images
update_compose_file() {
    local version=$1
    log_info "Updating docker-compose.yml with version $version..."

    # Create backup
    cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup"

    # Update backend image - replace the image line with versioned image
    sed -i.bak "s|image: \${DOCKER_REGISTRY}/\${DOCKER_REPO}-backend:\${VERSION:-latest}|image: $DOCKER_REGISTRY/$DOCKER_REPO-backend:$version|" "$COMPOSE_FILE"

    # Update frontend image - replace the image line with versioned image
    sed -i.bak "s|image: \${DOCKER_REGISTRY}/\${DOCKER_REPO}-frontend:\${VERSION:-latest}|image: $DOCKER_REGISTRY/$DOCKER_REPO-frontend:$version|" "$COMPOSE_FILE"

    log_success "docker-compose.yml updated"
}

# Deploy containers
deploy_containers() {
    local version=$1
    log_info "Deploying containers for version $version..."

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down || true

    # Start new containers
    log_info "Starting containers..."
    docker-compose up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check container status
    log_info "Container status:"
    docker-compose ps

    log_success "Deployment completed"
}

# Show usage
show_usage() {
    echo "Usage: $0 [version] [action]"
    echo ""
    echo "Arguments:"
    echo "  version    Release version (e.g., 5.0.0-alpha). If not specified, reads from package.json"
    echo "  action     Action to perform: build, push, deploy, all"
    echo ""
    echo "Actions:"
    echo "  build      Build Docker images with version tags"
    echo "  push       Push images to registry"
    echo "  deploy     Update docker-compose.yml and deploy containers"
    echo "  all        Perform all actions (build -> push -> deploy)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build and deploy using version from package.json"
    echo "  $0 5.0.0-alpha all   # Full pipeline for specific version"
    echo "  $0 5.0.0 build       # Only build images"
    echo "  $0 5.0.0 push        # Only push images"
    echo "  $0 5.0.0 deploy      # Only deploy containers"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY    Docker registry (default: nutrivault)"
    echo "  DOCKER_REPO        Docker repository (default: erikbeauvalot-sg/nutrivault)"
}

# Main script
main() {
    local version=""
    local action="all"

    # Parse arguments
    if [ $# -ge 1 ]; then
        if [[ $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
            version=$1
            if [ $# -ge 2 ]; then
                action=$2
            fi
        else
            action=$1
        fi
    fi

    # Get version if not specified
    if [ -z "$version" ]; then
        version=$(get_version)
        log_info "Using version from package.json: $version"
    fi

    # Validate version
    validate_version "$version"

    log_info "Starting Docker update for NutriVault v$version"
    log_info "Action: $action"

    case $action in
        "build")
            build_images "$version"
            ;;
        "push")
            push_images "$version"
            ;;
        "deploy")
            update_compose_file "$version"
            deploy_containers "$version"
            ;;
        "all")
            build_images "$version"
            push_images "$version"
            update_compose_file "$version"
            deploy_containers "$version"
            ;;
        *)
            log_error "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac

    log_success "Docker update completed for version $version"
}

# Check if help is requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"