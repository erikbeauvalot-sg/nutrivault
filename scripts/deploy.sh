#!/bin/bash
#
# NutriVault Deployment Script
# Automates versioned deployments with database backup and rollback support
#
# Usage:
#   ./scripts/deploy.sh                    # Deploy with version from package.json
#   ./scripts/deploy.sh 5.2.0              # Deploy specific version
#   ./scripts/deploy.sh --rollback         # Rollback to previous version
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
DOCKER_COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
MAX_BACKUPS=10

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get version from package.json
get_package_version() {
    node -p "require('${PROJECT_DIR}/backend/package.json').version" 2>/dev/null || echo "1.0.0"
}

# Get current running version
get_running_version() {
    docker exec nutrivault-backend printenv APP_VERSION 2>/dev/null || echo "unknown"
}

# Create backup directory
ensure_backup_dir() {
    mkdir -p "${BACKUP_DIR}"
}

# Backup database
backup_database() {
    local version=$1
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="nutrivault_${version}_${timestamp}.db"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log_info "Creating database backup: ${backup_name}"

    # Check if container is running
    if docker ps --format '{{.Names}}' | grep -q "nutrivault-backend"; then
        # Copy database from container
        docker cp nutrivault-backend:/app/data/nutrivault.db "${backup_path}" 2>/dev/null || {
            log_warn "Could not backup database (might be first deployment)"
            return 0
        }

        # Compress backup
        gzip "${backup_path}"
        log_success "Database backed up to: ${backup_name}.gz"

        # Save version info
        echo "${version}" > "${BACKUP_DIR}/.last_version"

        # Cleanup old backups (keep last MAX_BACKUPS)
        cleanup_old_backups
    else
        log_warn "Backend container not running, skipping backup"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    local count=$(ls -1 "${BACKUP_DIR}"/nutrivault_*.db.gz 2>/dev/null | wc -l)
    if [ "$count" -gt "$MAX_BACKUPS" ]; then
        log_info "Cleaning up old backups (keeping last ${MAX_BACKUPS})"
        ls -1t "${BACKUP_DIR}"/nutrivault_*.db.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    fi
}

# Restore database from backup
restore_database() {
    local backup_file=$1

    if [ -z "$backup_file" ]; then
        # Get most recent backup
        backup_file=$(ls -1t "${BACKUP_DIR}"/nutrivault_*.db.gz 2>/dev/null | head -1)
    fi

    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        log_error "No backup file found"
        return 1
    fi

    log_info "Restoring database from: $(basename ${backup_file})"

    # Stop containers
    docker-compose -f "${DOCKER_COMPOSE_FILE}" stop backend

    # Decompress and restore
    local temp_db="/tmp/nutrivault_restore.db"
    gunzip -c "${backup_file}" > "${temp_db}"

    # Copy to volume
    docker run --rm -v nutrivault-data:/data -v /tmp:/backup alpine \
        cp /backup/nutrivault_restore.db /data/nutrivault.db

    rm -f "${temp_db}"

    log_success "Database restored"
}

# Deploy new version
deploy() {
    local version=$1
    local current_version=$(get_running_version)

    log_info "=========================================="
    log_info "NutriVault Deployment"
    log_info "=========================================="
    log_info "Current version: ${current_version}"
    log_info "Target version:  ${version}"
    log_info "=========================================="

    # Ensure backup directory exists
    ensure_backup_dir

    # Backup current database
    if [ "${current_version}" != "unknown" ]; then
        backup_database "${current_version}"
    fi

    # Set build variables
    export VERSION="${version}"
    export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    export GIT_COMMIT=$(git -C "${PROJECT_DIR}" rev-parse --short HEAD 2>/dev/null || echo "unknown")

    log_info "Building with:"
    log_info "  VERSION:    ${VERSION}"
    log_info "  BUILD_DATE: ${BUILD_DATE}"
    log_info "  GIT_COMMIT: ${GIT_COMMIT}"

    # Pull latest code (if in git repo)
    if [ -d "${PROJECT_DIR}/.git" ]; then
        log_info "Pulling latest changes..."
        git -C "${PROJECT_DIR}" pull --ff-only 2>/dev/null || log_warn "Could not pull (might have local changes)"
    fi

    # Build and deploy
    log_info "Building and deploying containers..."
    docker-compose --env-file .env.production -f "${DOCKER_COMPOSE_FILE}" up -d --build

    # Wait for backend to be healthy
    log_info "Waiting for backend to be healthy..."
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker exec nutrivault-backend node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" 2>/dev/null; then
            log_success "Backend is healthy!"
            break
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo ""

    if [ $attempt -gt $max_attempts ]; then
        log_error "Backend failed to become healthy"
        log_warn "Consider rolling back with: $0 --rollback"
        return 1
    fi

    log_info "Creation of admin user and seeding database..."
    docker exec nutrivault-backend node /app/scripts/create-admin.js
    docker exec -it nutrivault-backend npm run db:seed

    # Show deployment status
    log_info "=========================================="
    log_success "Deployment complete!"
    log_info "=========================================="
    log_info "Version: $(get_running_version)"
    log_info "Backend:  http://localhost:${BACKEND_PORT:-3001}"
    log_info "Frontend: http://localhost:${FRONTEND_PORT:-80}"
    log_info ""
    log_info "View logs: docker-compose logs -f"
    log_info "Rollback:  $0 --rollback"
    log_info "=========================================="
}

# Rollback to previous version
rollback() {
    log_warn "Starting rollback..."

    # Get previous version
    local prev_version="unknown"
    if [ -f "${BACKUP_DIR}/.last_version" ]; then
        prev_version=$(cat "${BACKUP_DIR}/.last_version")
    fi

    log_info "Rolling back to version: ${prev_version}"

    # Restore database
    restore_database

    # Restart containers with previous images (if available)
    docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d

    log_success "Rollback complete"
}

# Show help
show_help() {
    echo "NutriVault Deployment Script"
    echo ""
    echo "Usage:"
    echo "  $0                    Deploy with version from package.json"
    echo "  $0 <version>          Deploy specific version (e.g., 5.2.0)"
    echo "  $0 --rollback         Rollback to previous version"
    echo "  $0 --backup           Create backup only"
    echo "  $0 --status           Show current deployment status"
    echo "  $0 --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 5.2.0              Deploy version 5.2.0"
    echo "  $0                    Deploy using version from package.json"
    echo ""
}

# Show status
show_status() {
    log_info "=========================================="
    log_info "NutriVault Deployment Status"
    log_info "=========================================="

    local running_version=$(get_running_version)
    local package_version=$(get_package_version)

    log_info "Package version: ${package_version}"
    log_info "Running version: ${running_version}"

    echo ""
    log_info "Container status:"
    docker-compose -f "${DOCKER_COMPOSE_FILE}" ps

    echo ""
    log_info "Recent backups:"
    ls -lht "${BACKUP_DIR}"/nutrivault_*.db.gz 2>/dev/null | head -5 || echo "  No backups found"

    log_info "=========================================="
}

# Main
main() {
    cd "${PROJECT_DIR}"

    case "${1:-}" in
        --help|-h)
            show_help
            ;;
        --rollback)
            rollback
            ;;
        --backup)
            ensure_backup_dir
            backup_database "$(get_running_version)"
            ;;
        --status)
            show_status
            ;;
        "")
            # Use version from package.json
            deploy "$(get_package_version)"
            ;;
        *)
            # Use provided version
            deploy "$1"
            ;;
    esac
}

main "$@"
