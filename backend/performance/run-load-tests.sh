#!/bin/bash
#
# NutriVault Performance Testing Suite
# Run all performance tests and generate reports
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "  NutriVault Performance Test Suite  "
echo "======================================"
echo ""

# Check if server is running
echo -e "${YELLOW}Checking if backend server is running...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}Error: Backend server is not running on port 3001${NC}"
    echo "Please start the server first: npm start"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Create results directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="performance/results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

echo -e "${YELLOW}Results will be saved to: $RESULTS_DIR${NC}"
echo ""

# Test 1: Authentication Flow
echo "======================================"
echo "Test 1: Authentication Flow"
echo "======================================"
echo "Testing login and protected endpoints..."
echo ""

artillery run performance/load-tests/auth-flow.yml \
    --output "$RESULTS_DIR/auth-flow.json" \
    | tee "$RESULTS_DIR/auth-flow.log"

echo ""
echo -e "${GREEN}✓ Authentication flow test complete${NC}"
echo ""

# Test 2: API CRUD Operations
echo "======================================"
echo "Test 2: API CRUD Operations"
echo "======================================"
echo "Testing patient, visit, billing, and report endpoints..."
echo ""

artillery run performance/load-tests/api-crud.yml \
    --output "$RESULTS_DIR/api-crud.json" \
    | tee "$RESULTS_DIR/api-crud.log"

echo ""
echo -e "${GREEN}✓ API CRUD operations test complete${NC}"
echo ""

# Generate HTML reports
echo "======================================"
echo "Generating HTML Reports"
echo "======================================"
echo ""

artillery report "$RESULTS_DIR/auth-flow.json" \
    --output "$RESULTS_DIR/auth-flow-report.html"

artillery report "$RESULTS_DIR/api-crud.json" \
    --output "$RESULTS_DIR/api-crud-report.html"

echo -e "${GREEN}✓ HTML reports generated${NC}"
echo ""

# Summary
echo "======================================"
echo "Performance Test Summary"
echo "======================================"
echo ""
echo "Results location: $RESULTS_DIR"
echo ""
echo "Reports generated:"
echo "  - auth-flow-report.html"
echo "  - api-crud-report.html"
echo ""
echo -e "${GREEN}All tests complete!${NC}"
echo ""
echo "To view reports:"
echo "  open $RESULTS_DIR/auth-flow-report.html"
echo "  open $RESULTS_DIR/api-crud-report.html"
echo ""
