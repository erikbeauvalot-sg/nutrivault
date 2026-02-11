#!/bin/bash
#
# NutriVault Bare-Metal Remote Deployment
# Connects to the bare-metal VM via SSH and runs the deploy script.
#
# Usage:
#   ./scripts/deploy-bare-metal-remote.sh              # Deploy latest
#   ./scripts/deploy-bare-metal-remote.sh -y           # Skip local confirmation
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration — adjust these for your setup
SERVER="root@nutrivault"
REMOTE_DIR="/opt/nutrivault"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

get_local_version() {
    node -p "require('${PROJECT_DIR}/package.json').version" 2>/dev/null || echo "unknown"
}

main() {
    local VERSION=$(get_local_version)

    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     NutriVault Bare-Metal Remote Deployment              ║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  Server:   ${SERVER}"
    echo -e "${CYAN}║${NC}  Path:     ${REMOTE_DIR}"
    echo -e "${CYAN}║${NC}  Version:  v${VERSION}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$1" != "-y" ] && [ "$1" != "--yes" ]; then
        read -p "$(echo -e ${YELLOW}Deploy to bare-metal VM? [y/N]:${NC} )" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warn "Deployment cancelled."
            exit 0
        fi
    fi

    log_info "Connecting to ${SERVER}..."

    ssh -t "${SERVER}" "cd ${REMOTE_DIR} && ./scripts/deploy-bare-metal.sh -y"

    if [ $? -eq 0 ]; then
        echo ""
        log_success "═══════════════════════════════════════════════════════════"
        log_success "  Bare-metal deployment completed!"
        log_success "═══════════════════════════════════════════════════════════"
        echo ""
    else
        log_error "Deployment failed. Check server logs:"
        log_error "  ssh ${SERVER} 'tail -50 ${REMOTE_DIR}/backend/logs/backend.log'"
        exit 1
    fi
}

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "NutriVault Bare-Metal Remote Deployment"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deploy-bare-metal-remote.sh       # Interactive"
    echo "  ./scripts/deploy-bare-metal-remote.sh -y    # Skip confirmation"
    echo ""
    echo "Connects via SSH to ${SERVER} and runs deploy-bare-metal.sh"
    echo ""
    exit 0
fi

main "$@"
