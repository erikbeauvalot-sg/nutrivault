#!/bin/bash
#
# NutriVault Bare-Metal Deployment Script
# Runs directly on the VM to update to the latest version.
#
# Usage:
#   ./scripts/deploy-bare-metal.sh           # Deploy latest from git
#   ./scripts/deploy-bare-metal.sh -y        # Skip confirmation
#
# What it does:
#   1. Backs up the SQLite database
#   2. git pull origin main
#   3. npm ci (root, backend, frontend)
#   4. Run migrations (root + backend)
#   5. Build frontend
#   6. Fix file permissions
#   7. Restart backend (systemctl restart nutrivault)
#   8. Health check
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
DB_PATH="${BACKEND_DIR}/data/nutrivault.db"
BACKUP_DIR="${PROJECT_DIR}/backups"
SERVICE_NAME="nutrivault"
SERVICE_USER="www-data"
MAX_BACKUPS=10

# Functions
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}[$1/$TOTAL_STEPS]${NC} $2"; }

get_version() {
    node -p "require('${PROJECT_DIR}/package.json').version" 2>/dev/null || echo "unknown"
}

TOTAL_STEPS=7

main() {
    local AUTO_YES=false
    if [ "$1" == "-y" ] || [ "$1" == "--yes" ]; then
        AUTO_YES=true
    fi

    local CURRENT_VERSION=$(get_version)

    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       NutriVault Bare-Metal Deployment                   ║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  Directory:  ${PROJECT_DIR}"
    echo -e "${CYAN}║${NC}  Current:    v${CURRENT_VERSION}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$AUTO_YES" != true ]; then
        read -p "$(echo -e ${YELLOW}Proceed with deployment? [y/N]:${NC} )" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warn "Deployment cancelled."
            exit 0
        fi
    fi

    local START_TIME=$(date +%s)

    # ── Step 1: Backup database ──────────────────────────────────
    log_step 1 "Backing up database..."
    if [ -f "$DB_PATH" ]; then
        mkdir -p "$BACKUP_DIR"
        local BACKUP_FILE="${BACKUP_DIR}/nutrivault_$(date +%Y%m%d_%H%M%S).db"
        cp "$DB_PATH" "$BACKUP_FILE"
        log_success "Backup saved: $(basename $BACKUP_FILE) ($(du -h "$BACKUP_FILE" | cut -f1))"

        # Cleanup old backups (keep last N)
        local BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/nutrivault_*.db 2>/dev/null | wc -l)
        if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
            ls -1t "$BACKUP_DIR"/nutrivault_*.db | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
            log_info "Cleaned old backups (kept last ${MAX_BACKUPS})"
        fi
    else
        log_warn "No database found at ${DB_PATH} — skipping backup"
    fi

    # ── Step 2: Pull latest code ─────────────────────────────────
    log_step 2 "Pulling latest code..."
    cd "$PROJECT_DIR"
    git pull origin main
    local NEW_VERSION=$(get_version)
    log_success "Code updated: v${CURRENT_VERSION} → v${NEW_VERSION}"

    # ── Step 3: Install dependencies ─────────────────────────────
    log_step 3 "Installing dependencies..."

    log_info "Root dependencies..."
    cd "$PROJECT_DIR" && npm ci --production --silent 2>&1 | tail -1

    log_info "Backend dependencies..."
    cd "$BACKEND_DIR" && npm ci --production --silent 2>&1 | tail -1

    log_info "Frontend dependencies..."
    cd "$FRONTEND_DIR" && npm ci --silent 2>&1 | tail -1

    log_success "All dependencies installed"

    # ── Step 4: Run migrations ───────────────────────────────────
    log_step 4 "Running database migrations..."

    log_info "Root migrations..."
    cd "$PROJECT_DIR" && npx sequelize-cli db:migrate 2>&1 | grep -E "(executed|No migrations)" || true

    log_info "Backend migrations..."
    cd "$BACKEND_DIR" && npx sequelize-cli db:migrate 2>&1 | grep -E "(executed|No migrations)" || true

    log_success "Migrations complete"

    # ── Step 5: Build frontend ───────────────────────────────────
    log_step 5 "Building frontend..."
    cd "$FRONTEND_DIR" && npm run build 2>&1 | tail -3
    log_success "Frontend built"

    # ── Step 6: Fix permissions ──────────────────────────────────
    log_step 6 "Fixing file permissions..."
    chown -R "${SERVICE_USER}:${SERVICE_USER}" "${BACKEND_DIR}/data" 2>/dev/null || true
    chown -R "${SERVICE_USER}:${SERVICE_USER}" "${BACKEND_DIR}/uploads" 2>/dev/null || true
    chown -R "${SERVICE_USER}:${SERVICE_USER}" "${BACKEND_DIR}/logs" 2>/dev/null || true
    log_success "Permissions updated"

    # ── Step 7: Restart backend ──────────────────────────────────
    log_step 7 "Restarting backend service..."
    systemctl restart "$SERVICE_NAME"
    sleep 2

    # Health check
    local RETRIES=5
    local HEALTHY=false
    for i in $(seq 1 $RETRIES); do
        if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
            HEALTHY=true
            break
        fi
        log_info "Waiting for backend to start... (${i}/${RETRIES})"
        sleep 2
    done

    if [ "$HEALTHY" = true ]; then
        log_success "Backend is healthy"
    else
        log_error "Backend health check failed! Check logs:"
        log_error "  tail -50 ${BACKEND_DIR}/logs/backend.log"
        echo ""
        log_warn "Rolling back database..."
        if [ -f "$BACKUP_FILE" ]; then
            systemctl stop "$SERVICE_NAME"
            cp "$BACKUP_FILE" "$DB_PATH"
            chown "${SERVICE_USER}:${SERVICE_USER}" "$DB_PATH"
            systemctl start "$SERVICE_NAME"
            log_warn "Database restored from backup. Backend restarted with old DB."
        fi
        exit 1
    fi

    # ── Done ─────────────────────────────────────────────────────
    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - START_TIME))

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  NutriVault v${NEW_VERSION} deployed successfully!${NC}"
    echo -e "${GREEN}  Duration: ${DURATION}s${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "NutriVault Bare-Metal Deployment Script"
    echo ""
    echo "Usage:"
    echo "  ./scripts/deploy-bare-metal.sh        # Interactive deployment"
    echo "  ./scripts/deploy-bare-metal.sh -y      # Skip confirmation"
    echo ""
    echo "This script must be run ON the VM (not remotely)."
    echo "For remote deployment, use:"
    echo "  ./scripts/deploy-bare-metal-remote.sh"
    echo ""
    exit 0
fi

main "$@"
