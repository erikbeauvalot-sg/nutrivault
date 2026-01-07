#!/bin/bash

###############################################################################
# Node.js Performance Profiling Script
# Phase 5.4 - TASK-031: Profile and Optimize Slow Endpoints
#
# This script runs the backend with Node.js profiling enabled using multiple
# profiling tools to identify CPU and memory bottlenecks.
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_PORT=${SERVER_PORT:-3001}
PROFILE_DURATION=${PROFILE_DURATION:-60}  # seconds
RESULTS_DIR="./performance/results/profiling"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Node.js Performance Profiling${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Server Port: $SERVER_PORT"
echo "Profile Duration: ${PROFILE_DURATION}s"
echo "Results: $RESULTS_DIR/$TIMESTAMP"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR/$TIMESTAMP"

# Check if server is already running
if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}Error: Server is already running on port $SERVER_PORT${NC}"
    echo "Please stop the server first: pkill -f 'node.*server.js'"
    exit 1
fi

###############################################################################
# 1. CPU Profiling with Node.js --prof
###############################################################################

echo -e "${YELLOW}[1/3] Running CPU profiling (--prof)...${NC}"
echo "Starting server with --prof flag..."

# Start server with profiling
node --prof src/server.js &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server started successfully
if ! lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}Error: Server failed to start${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo "Server started (PID: $SERVER_PID)"
echo "Generating load for ${PROFILE_DURATION}s..."

# Generate load using Artillery
artillery quick --count 10 --num 100 "http://localhost:$SERVER_PORT/api/health" > "$RESULTS_DIR/$TIMESTAMP/artillery-load.log" 2>&1

echo "Load generation complete. Stopping server..."
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true

# Find and process the isolate file
ISOLATE_FILE=$(ls -t isolate-*.log | head -1)
if [ -f "$ISOLATE_FILE" ]; then
    echo "Processing profile: $ISOLATE_FILE"
    node --prof-process "$ISOLATE_FILE" > "$RESULTS_DIR/$TIMESTAMP/cpu-profile.txt"
    mv "$ISOLATE_FILE" "$RESULTS_DIR/$TIMESTAMP/"
    echo -e "${GREEN}✓ CPU profile saved: $RESULTS_DIR/$TIMESTAMP/cpu-profile.txt${NC}"
else
    echo -e "${RED}Warning: No isolate file found${NC}"
fi

sleep 3

###############################################################################
# 2. Memory Profiling with Clinic.js Heap
###############################################################################

echo ""
echo -e "${YELLOW}[2/3] Running memory profiling (clinic heap)...${NC}"

if ! command -v clinic &> /dev/null; then
    echo -e "${RED}Clinic.js not found. Skipping memory profiling.${NC}"
    echo "Install with: npm install -g clinic"
else
    echo "Starting server with clinic heap..."
    
    # Run clinic heap in background
    clinic heap --dest "$RESULTS_DIR/$TIMESTAMP/heap" -- node src/server.js &
    CLINIC_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Check if server started
    if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "Generating load for ${PROFILE_DURATION}s..."
        artillery quick --count 10 --num 100 "http://localhost:$SERVER_PORT/api/health" > /dev/null 2>&1
        
        echo "Stopping clinic heap..."
        kill -SIGINT $CLINIC_PID 2>/dev/null || true
        wait $CLINIC_PID 2>/dev/null || true
        
        echo -e "${GREEN}✓ Memory profile saved: $RESULTS_DIR/$TIMESTAMP/heap/${NC}"
    else
        echo -e "${RED}Error: Server failed to start with clinic heap${NC}"
        kill $CLINIC_PID 2>/dev/null || true
    fi
    
    sleep 3
fi

###############################################################################
# 3. Performance Profiling with Clinic.js Doctor
###############################################################################

echo ""
echo -e "${YELLOW}[3/3] Running performance profiling (clinic doctor)...${NC}"

if ! command -v clinic &> /dev/null; then
    echo -e "${RED}Clinic.js not found. Skipping performance profiling.${NC}"
else
    echo "Starting server with clinic doctor..."
    
    # Run clinic doctor in background
    clinic doctor --dest "$RESULTS_DIR/$TIMESTAMP/doctor" -- node src/server.js &
    CLINIC_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Check if server started
    if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "Generating load for ${PROFILE_DURATION}s..."
        artillery quick --count 10 --num 100 "http://localhost:$SERVER_PORT/api/health" > /dev/null 2>&1
        
        echo "Stopping clinic doctor..."
        kill -SIGINT $CLINIC_PID 2>/dev/null || true
        wait $CLINIC_PID 2>/dev/null || true
        
        echo -e "${GREEN}✓ Performance profile saved: $RESULTS_DIR/$TIMESTAMP/doctor/${NC}"
    else
        echo -e "${RED}Error: Server failed to start with clinic doctor${NC}"
        kill $CLINIC_PID 2>/dev/null || true
    fi
fi

###############################################################################
# Summary
###############################################################################

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Profiling Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Results location: $RESULTS_DIR/$TIMESTAMP"
echo ""
echo "Files generated:"
echo "  1. CPU Profile:"
echo "     - cpu-profile.txt (flame graph data)"
echo "     - isolate-*.log (raw v8 profile)"
echo ""
echo "  2. Memory Profile (if clinic.js installed):"
echo "     - heap/*.html (open in browser)"
echo ""
echo "  3. Performance Profile (if clinic.js installed):"
echo "     - doctor/*.html (open in browser)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review cpu-profile.txt for CPU-intensive functions"
echo "  2. Open heap/*.html to analyze memory usage"
echo "  3. Open doctor/*.html to identify event loop delays"
echo "  4. Focus optimization on top functions (>5% CPU time)"
echo ""
echo "Documentation: docs/performance/profiling-guide.md"
echo ""
