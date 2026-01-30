#!/bin/bash
# Script to rebuild Docker containers with the latest release version
# This script works with the current local Docker setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Validate Docker and docker-compose
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose is not installed or not in PATH"
        exit 1
    fi

    log_info "Docker version: $(docker --version)"
    log_info "Docker Compose version: $(docker-compose --version)"
}

# Backup current environment
backup_environment() {
    local version=$1
    local backup_dir="backup-$(date +%Y%m%d-%H%M%S)-v$version"

    log_info "Creating backup directory: $backup_dir"
    mkdir -p "$backup_dir"

    # Backup database if it exists
    if [ -f "nutrivault.db" ]; then
        cp nutrivault.db "$backup_dir/"
        log_info "Database backed up"
    fi

    # Backup uploads if they exist
    if [ -d "uploads" ] && [ "$(ls -A uploads 2>/dev/null)" ]; then
        cp -r uploads "$backup_dir/"
        log_info "Uploads backed up"
    fi

    # Backup docker-compose.yml
    cp docker-compose.yml "$backup_dir/"
    log_info "Docker compose configuration backed up"

    echo "$backup_dir" > .last_backup
    log_success "Backup completed: $backup_dir"
}

# Pull latest code
pull_latest_code() {
    local version=$1

    if [ -d ".git" ]; then
        log_info "Pulling latest code from git..."
        git pull origin main
        log_info "Current commit: $(git rev-parse --short HEAD)"
        log_info "Latest tag: $(git describe --tags --abbrev=0 2>/dev/null || echo 'No tags found')"
    else
        log_warning "Not a git repository, skipping git pull"
    fi
}

# Clean up old containers and images
cleanup_docker() {
    log_info "Cleaning up old Docker containers and images..."

    # Stop and remove containers
    docker-compose down --remove-orphans 2>/dev/null || true

    # Remove unused images (optional, commented out by default)
    # log_warning "Removing unused Docker images..."
    # docker image prune -f

    # Remove build cache
    log_info "Cleaning Docker build cache..."
    docker builder prune -f

    log_success "Docker cleanup completed"
}

# Build and deploy containers
build_and_deploy() {
    local version=$1

    log_info "Building and deploying NutriVault v$version..."

    # Build images with version info
    log_info "Building Docker images..."
    DOCKER_BUILDKIT=1 docker-compose build \
        --build-arg VERSION="$version" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
        --no-cache

    # Start containers
    log_info "Starting containers..."
    docker-compose up -d

    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 15

    # Check container status
    log_info "Container status:"
    docker-compose ps

    # Check service health
    log_info "Checking service health..."
    if docker-compose exec -T backend node -e "
        const http = require('http');
        const options = { hostname: 'localhost', port: 3001, path: '/health', method: 'GET' };
        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Backend health check passed');
                process.exit(0);
            } else {
                console.log('❌ Backend health check failed:', res.statusCode);
                process.exit(1);
            }
        });
        req.on('error', (e) => {
            console.log('❌ Backend health check error:', e.message);
            process.exit(1);
        });
        req.end();
    " 2>/dev/null; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed - check logs with: docker-compose logs backend"
    fi

    log_success "Deployment completed for version $version"
}

# Show deployment info
show_deployment_info() {
    local version=$1

    echo ""
    echo "========================================"
    log_success "NutriVault v$version deployed successfully!"
    echo ""
    echo "🌐 Frontend: http://localhost"
    echo "🔧 Backend API: http://localhost:3001"
    echo "📊 Health Check: http://localhost:3001/health"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose logs -f              # Follow logs"
    echo "  docker-compose logs backend         # Backend logs"
    echo "  docker-compose logs frontend        # Frontend logs"
    echo "  docker-compose restart              # Restart services"
    echo "  docker-compose down                 # Stop services"
    echo ""
    if [ -f ".last_backup" ]; then
        echo "Last backup: $(cat .last_backup)"
    fi
    echo "========================================"
}

# Show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --version VERSION    Specify version (default: read from package.json)"
    echo "  --no-backup          Skip backup creation"
    echo "  --no-cleanup         Skip Docker cleanup"
    echo "  --help, -h           Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy with version from package.json"
    echo "  $0 --version 5.0.0-alpha   # Deploy specific version"
    echo "  $0 --no-backup             # Skip backup (not recommended)"
    echo ""
    echo "This script will:"
    echo "  1. Check Docker installation"
    echo "  2. Create backup of current state"
    echo "  3. Pull latest code from git"
    echo "  4. Clean up old containers"
    echo "  5. Build and deploy new containers"
    echo "  6. Verify deployment"
}

# Main script
main() {
    local version=""
    local skip_backup=false
    local skip_cleanup=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version)
                version="$2"
                shift 2
                ;;
            --no-backup)
                skip_backup=true
                shift
                ;;
            --no-cleanup)
                skip_cleanup=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Get version if not specified
    if [ -z "$version" ]; then
        version=$(get_version)
        log_info "Using version from package.json: $version"
    fi

    log_info "Starting Docker deployment for NutriVault v$version"

    # Pre-flight checks
    check_docker

    # Backup (unless skipped)
    if [ "$skip_backup" = false ]; then
        backup_environment "$version"
    else
        log_warning "Skipping backup as requested"
    fi

    # Pull latest code
    pull_latest_code "$version"

    # Cleanup (unless skipped)
    if [ "$skip_cleanup" = false ]; then
        cleanup_docker
    else
        log_warning "Skipping Docker cleanup as requested"
        # Still stop containers
        docker-compose down --remove-orphans 2>/dev/null || true
    fi

    # Build and deploy
    build_and_deploy "$version"

    # Show deployment info
    show_deployment_info "$version"
}

# Run main function
main "$@"