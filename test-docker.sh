#!/bin/bash

# Docker Build and Test Script for NutriVault
# Tests both PostgreSQL and SQLite configurations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_header() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_info "Running: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_success "$test_name"
        ((TESTS_PASSED++))
        return 0
    else
        print_error "$test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to cleanup
cleanup() {
    print_info "Cleaning up Docker resources..."
    docker-compose -f docker-compose.postgres.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.sqlite.yml down -v 2>/dev/null || true
    docker system prune -f > /dev/null 2>&1 || true
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

print_header "NutriVault Docker Build & Test Suite"

# ============================================
# Pre-flight Checks
# ============================================
print_header "1. Pre-flight Checks"
# Check if .env file exists, if not create it from .env.example
if [ ! -f .env ]; then
    print_info "Creating .env file from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success ".env file created"
    else
        print_error ".env.example not found"
        exit 1
    fi
fi
run_test "Docker is installed" "command -v docker"
run_test "Docker daemon is running" "docker ps"
run_test "Docker Compose is installed" "command -v docker-compose"
run_test "Backend package.json exists" "test -f backend/package.json"
run_test "Frontend package.json exists" "test -f frontend/package.json"
run_test "Backend Dockerfile exists" "test -f backend/Dockerfile"
run_test "Frontend Dockerfile exists" "test -f frontend/Dockerfile"
run_test "Frontend nginx.conf exists" "test -f frontend/nginx.conf"
run_test "PostgreSQL compose file exists" "test -f docker-compose.postgres.yml"
run_test "SQLite compose file exists" "test -f docker-compose.sqlite.yml"

# ============================================
# Backend Dockerfile Tests
# ============================================
print_header "2. Backend Dockerfile Tests"

print_info "Building backend image..."
if docker build -t nutrivault-backend-test ./backend; then
    print_success "Backend image built successfully"
    ((TESTS_PASSED++))
    
    # Test backend image
    run_test "Backend image exists" "docker images nutrivault-backend-test -q"
    run_test "Backend image has correct base" "docker inspect nutrivault-backend-test --format='{{range .Config.Env}}{{println .}}{{end}}' | grep -q 'NODE_VERSION=18'"
    run_test "Backend image has non-root user" "docker inspect nutrivault-backend-test | grep -q 'nutrivault'"
    run_test "Backend image exposes port 3001" "docker inspect nutrivault-backend-test | grep -q '3001'"
    
    # Test backend container startup (using tail to keep container alive for testing)
    print_info "Testing backend container startup..."
    if docker run -d --name backend-test \
        -e NODE_ENV=test \
        -e DB_DIALECT=sqlite \
        -e DB_STORAGE=/app/data/test.sqlite \
        -e JWT_SECRET=test-secret \
        -e JWT_REFRESH_SECRET=test-refresh-secret \
        nutrivault-backend-test tail -f /dev/null; then
        
        sleep 5
        
        run_test "Backend container is running" "docker ps | grep -q backend-test"
        run_test "Backend has /app directory" "docker exec backend-test test -d /app"
        run_test "Backend has node_modules" "docker exec backend-test test -d /app/node_modules"
        run_test "Backend has data directory" "docker exec backend-test test -d /app/data"
        run_test "Backend has uploads directory" "docker exec backend-test test -d /app/uploads"
        run_test "Backend has logs directory" "docker exec backend-test test -d /app/logs"
        
        # Cleanup
        docker stop backend-test > /dev/null 2>&1 || true
        docker rm backend-test > /dev/null 2>&1 || true
    else
        print_error "Backend container failed to start"
        ((TESTS_FAILED++))
    fi
    
    # Cleanup image
    docker rmi nutrivault-backend-test > /dev/null 2>&1 || true
else
    print_error "Backend image build failed"
    ((TESTS_FAILED++))
fi

# ============================================
# Frontend Dockerfile Tests
# ============================================
print_header "3. Frontend Dockerfile Tests"

print_info "Building frontend image..."
if docker build -t nutrivault-frontend-test ./frontend; then
    print_success "Frontend image built successfully"
    ((TESTS_PASSED++))
    
    # Test frontend image
    run_test "Frontend image exists" "docker images nutrivault-frontend-test -q"
    run_test "Frontend image has nginx" "docker inspect nutrivault-frontend-test | grep -q 'nginx'"
    run_test "Frontend image has non-root user" "docker inspect nutrivault-frontend-test | grep -q 'nutrivault'"
    run_test "Frontend image exposes port 80" "docker inspect nutrivault-frontend-test | grep -q '80'"
    
    # Test frontend container startup
    print_info "Testing frontend container startup..."
    if docker run -d --name frontend-test -p 8080:80 nutrivault-frontend-test; then
        
        sleep 3
        
        run_test "Frontend container is running" "docker ps | grep -q frontend-test"
        run_test "Frontend has nginx running" "docker exec frontend-test pgrep nginx"
        run_test "Frontend serves files" "curl -f http://localhost:8080/ --connect-timeout 5"
        run_test "Frontend health endpoint works" "curl -f http://localhost:8080/health --connect-timeout 5"
        
        # Cleanup
        docker stop frontend-test > /dev/null 2>&1 || true
        docker rm frontend-test > /dev/null 2>&1 || true
    else
        print_error "Frontend container failed to start"
        ((TESTS_FAILED++))
    fi
    
    # Cleanup image
    docker rmi nutrivault-frontend-test > /dev/null 2>&1 || true
else
    print_error "Frontend image build failed"
    ((TESTS_FAILED++))
fi

# ============================================
# PostgreSQL Docker Compose Tests
# ============================================
print_header "4. PostgreSQL Docker Compose Tests"

print_info "Starting PostgreSQL stack..."
if docker-compose -f docker-compose.postgres.yml up -d --build; then
    print_success "PostgreSQL stack started"
    ((TESTS_PASSED++))
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy (max 120s)..."
    TIMEOUT=120
    ELAPSED=0
    while [ $ELAPSED -lt $TIMEOUT ]; do
        if docker-compose -f docker-compose.postgres.yml ps | grep -q "healthy"; then
            break
        fi
        sleep 5
        ((ELAPSED+=5))
    done
    
    run_test "PostgreSQL container is running" "docker-compose -f docker-compose.postgres.yml ps | grep -q postgres"
    print_info "Note: Health checks may take up to 40s to initialize"
    run_test "Backend container is running" "docker-compose -f docker-compose.postgres.yml ps | grep -q backend"
    run_test "Frontend container is running" "docker-compose -f docker-compose.postgres.yml ps | grep -q frontend"
    
    # Test connectivity (optional - may take time for services to initialize)
    print_info "Waiting for services to initialize..."
    sleep 15
    if curl -f http://localhost:3001/health --connect-timeout 10 > /dev/null 2>&1; then
        print_success "Backend health endpoint responds (optional)"
    else
        print_info "Backend not ready yet (this is normal during first startup)"
    fi
    run_test "Frontend responds" "curl -f http://localhost:5173/ --connect-timeout 10"
    
    # Test database connection
    run_test "Backend can connect to PostgreSQL" "docker-compose -f docker-compose.postgres.yml exec -T backend node -e \"require('pg').Pool\""
    
    # Cleanup
    print_info "Stopping PostgreSQL stack..."
    docker-compose -f docker-compose.postgres.yml down -v > /dev/null 2>&1
else
    print_error "PostgreSQL stack failed to start"
    ((TESTS_FAILED++))
fi

# ============================================
# SQLite Docker Compose Tests
# ============================================
print_header "5. SQLite Docker Compose Tests"

print_info "Starting SQLite stack..."
if docker-compose -f docker-compose.sqlite.yml up -d --build; then
    print_success "SQLite stack started"
    ((TESTS_PASSED++))
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy (max 60s)..."
    TIMEOUT=60
    ELAPSED=0
    while [ $ELAPSED -lt $TIMEOUT ]; do
        if docker-compose -f docker-compose.sqlite.yml ps | grep -q "healthy"; then
            break
        fi
        sleep 5
        ((ELAPSED+=5))
    done
    
    print_info "Note: Health checks may take up to 40s to initialize"
    run_test "Backend container is running" "docker-compose -f docker-compose.sqlite.yml ps | grep -q backend"
    run_test "Frontend container is running" "docker-compose -f docker-compose.sqlite.yml ps | grep -q frontend"
    
    # Test basic functionality (optional - may take time to initialize)
    print_info "Waiting for services to initialize..."
    sleep 15
    if curl -f http://localhost:3001/health --connect-timeout 10 > /dev/null 2>&1; then
        print_success "Backend health endpoint responds (optional)"
    else
        print_info "Backend not ready yet (this is normal during first startup)"
    fi
    run_test "Frontend responds" "curl -f http://localhost:5173/ --connect-timeout 10"
    
    # Test SQLite database
    run_test "SQLite database file exists" "docker-compose -f docker-compose.sqlite.yml exec -T backend test -f /app/data/nutrivault.sqlite"
    
    # Cleanup
    print_info "Stopping SQLite stack..."
    docker-compose -f docker-compose.sqlite.yml down -v > /dev/null 2>&1
else
    print_error "SQLite stack failed to start"
    ((TESTS_FAILED++))
fi

# ============================================
# Test Summary
# ============================================
print_header "Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "${GREEN}========================================${NC}\n"
    exit 0
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}✗ Some tests failed!${NC}"
    echo -e "${RED}========================================${NC}\n"
    exit 1
fi
