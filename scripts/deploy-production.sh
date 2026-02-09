#!/bin/bash
#
# NutriVault Production Deployment Script
# Connects to the production server and deploys the specified version
#
# Usage:
#   ./scripts/deploy-production.sh 5.8.0     # Deploy version 5.8.0
#   ./scripts/deploy-production.sh           # Deploy version from package.json
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="root@nutrivault"
REMOTE_DIR="nutrivault"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get version from package.json if not provided
get_local_version() {
    node -p "require('${PROJECT_DIR}/backend/package.json').version" 2>/dev/null || echo "unknown"
}

# Main
main() {
    local VERSION="${1:-$(get_local_version)}"

    if [ "$VERSION" == "unknown" ]; then
        log_error "Could not determine version. Please specify a version: ./deploy-production.sh 5.8.0"
        exit 1
    fi

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           NutriVault Production Deployment                    ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  Server:     ${SERVER}                                  ║"
    echo "║  Version:    ${VERSION}                                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    # Confirm deployment
    read -p "$(echo -e ${YELLOW}Do you want to proceed with deployment? [y/N]:${NC} )" -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Deployment cancelled."
        exit 0
    fi

    log_info "Connecting to production server..."

    # Execute deployment on remote server
    ssh -t "${SERVER}" "cd ${REMOTE_DIR} && git pull origin main && ./scripts/deploy.sh ${VERSION}"

    if [ $? -eq 0 ]; then
        # On major releases, clean up Docker images if disk usage > 80%
        local MINOR=$(echo "$VERSION" | cut -d. -f2)
        local PATCH=$(echo "$VERSION" | cut -d. -f3)
        if [ "$MINOR" == "0" ] && [ "$PATCH" == "0" ]; then
            local DISK_USAGE=$(ssh "${SERVER}" "df / --output=pcent | tail -1 | tr -d ' %'")
            if [ "$DISK_USAGE" -gt 80 ] 2>/dev/null; then
                log_warn "Disk usage at ${DISK_USAGE}% — pruning unused Docker images..."
                ssh "${SERVER}" "cd ${REMOTE_DIR} && docker image prune -af" 2>/dev/null
                log_success "Docker image cleanup complete."
            fi
        fi

        echo ""
        log_success "═══════════════════════════════════════════════════════════════"
        log_success "  Deployment of v${VERSION} completed successfully!"
        log_success "═══════════════════════════════════════════════════════════════"
        echo ""
    else
        log_error "Deployment failed. Check the server logs for details."
        exit 1
    fi
}

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "NutriVault Production Deployment Script"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deploy-production.sh [VERSION]"
    echo ""
    echo "Arguments:"
    echo "  VERSION    Version to deploy (e.g., 5.8.0)"
    echo "             If not provided, uses version from package.json"
    echo ""
    echo "Examples:"
    echo "  ./scripts/deploy-production.sh 5.8.0"
    echo "  ./scripts/deploy-production.sh"
    echo ""
    exit 0
fi

main "$@"
