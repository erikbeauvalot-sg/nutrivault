#!/bin/bash

# PostgreSQL Development Helper Script
# Manages PostgreSQL container for VM development

set -e

COMPOSE_FILE="docker-compose.postgres-only.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if PostgreSQL is running
is_running() {
    docker ps --format '{{.Names}}' | grep -q "nutrivault-postgres-dev"
}

# Start PostgreSQL
start_postgres() {
    print_info "Starting PostgreSQL..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    print_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker exec nutrivault-postgres-dev pg_isready -U nutrivault_user -d nutrivault &>/dev/null; then
            print_success "PostgreSQL is ready!"
            print_info "Connection details:"
            echo "  Host: localhost"
            echo "  Port: 5432"
            echo "  Database: nutrivault"
            echo "  User: nutrivault_user"
            echo "  Password: nutrivault_password"
            return 0
        fi
        sleep 1
    done
    
    print_error "PostgreSQL failed to start within 30 seconds"
    docker-compose -f "$COMPOSE_FILE" logs postgres
    exit 1
}

# Stop PostgreSQL
stop_postgres() {
    print_info "Stopping PostgreSQL..."
    docker-compose -f "$COMPOSE_FILE" down
    print_success "PostgreSQL stopped"
}

# Restart PostgreSQL
restart_postgres() {
    stop_postgres
    start_postgres
}

# Show PostgreSQL logs
logs_postgres() {
    docker-compose -f "$COMPOSE_FILE" logs -f postgres
}

# Show PostgreSQL status
status_postgres() {
    if is_running; then
        print_success "PostgreSQL is running"
        docker-compose -f "$COMPOSE_FILE" ps
        echo ""
        print_info "Connection string:"
        echo "  postgresql://nutrivault_user:nutrivault_password@localhost:5432/nutrivault"
    else
        print_warning "PostgreSQL is not running"
        echo "Run: $0 start"
    fi
}

# Connect to PostgreSQL CLI
psql_connect() {
    if ! is_running; then
        print_error "PostgreSQL is not running"
        exit 1
    fi
    
    print_info "Connecting to PostgreSQL..."
    docker exec -it nutrivault-postgres-dev psql -U nutrivault_user -d nutrivault
}

# Reset database (WARNING: deletes all data)
reset_database() {
    print_warning "This will delete ALL data in the database!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        exit 0
    fi
    
    print_info "Stopping PostgreSQL and removing data..."
    docker-compose -f "$COMPOSE_FILE" down -v
    print_success "Data removed"
    
    start_postgres
}

# Show help
show_help() {
    cat << EOF
PostgreSQL Development Helper

Usage: $0 <command>

Commands:
  start       Start PostgreSQL container
  stop        Stop PostgreSQL container
  restart     Restart PostgreSQL container
  status      Show PostgreSQL status
  logs        Show PostgreSQL logs (follow mode)
  psql        Connect to PostgreSQL CLI
  reset       Reset database (WARNING: deletes all data)
  help        Show this help message

Examples:
  $0 start        # Start PostgreSQL
  $0 logs         # Watch logs
  $0 psql         # Connect to database
  $0 reset        # Reset database (deletes data)

Connection Details:
  Host:     localhost
  Port:     5432
  Database: nutrivault
  User:     nutrivault_user
  Password: nutrivault_password

Environment Variables:
  You can override defaults by creating a .env file with:
    DB_NAME=nutrivault
    DB_USER=nutrivault_user
    DB_PASSWORD=nutrivault_password
    DB_PORT=5432
EOF
}

# Main
case "${1:-}" in
    start)
        start_postgres
        ;;
    stop)
        stop_postgres
        ;;
    restart)
        restart_postgres
        ;;
    logs)
        logs_postgres
        ;;
    status)
        status_postgres
        ;;
    psql)
        psql_connect
        ;;
    reset)
        reset_database
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ -z "${1:-}" ]; then
            status_postgres
            echo ""
        else
            print_error "Unknown command: $1"
            echo ""
        fi
        show_help
        exit 1
        ;;
esac
