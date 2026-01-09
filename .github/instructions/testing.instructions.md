---
description: 'Testing practices and guidelines for NutriVault, including server management for API and UI testing'
applyTo: '**/*.test.js, **/*.test.ts, **/*.spec.js, **/*.spec.ts, **/test-*.sh, **/test-*.js'
---

# Testing Instructions for NutriVault

## Overview

This document provides comprehensive testing guidelines for the NutriVault application, with special focus on managing backend and frontend servers during testing.

---

## Server Management for Testing

### Critical Rules for Server-Based Testing

When testing requires running backend and/or frontend servers:

1. **Always check port availability first**
2. **Kill any processes using required ports**
3. **Start servers in fresh terminal sessions**
4. **Wait for servers to be fully ready before testing**
5. **Clean up servers after testing**

### Port Configuration

**Backend Server**:
- Default port: `3001`
- Environment variable: `PORT`
- Check command: `lsof -ti:3001`

**Frontend Server**:
- Default port: `5173` (Vite)
- Environment variable: `VITE_PORT`
- Check command: `lsof -ti:5173`

---

## Pre-Test Server Setup

### Step 1: Check and Kill Existing Processes

**Before starting any test that requires servers**, always clean up existing processes:

```bash
# Kill backend server (port 3001)
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill frontend server (port 5173)
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Alternative: Kill all node processes (use with caution)
pkill -9 node 2>/dev/null || true
```

**Best Practice**: Create a cleanup function in test scripts:

```bash
#!/bin/bash

cleanup_servers() {
  echo "🧹 Cleaning up existing servers..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  sleep 1
}

# Call at start of script
cleanup_servers
```

### Step 2: Start Servers in Fresh Terminals

**CRITICAL**: Always use `run_in_terminal` tool with `isBackground=true` to start servers.

**Backend Server**:
```bash
# Start backend in background
cd /Users/erik/Documents/Dev/Diet/nutrivault/backend && npm run dev
```

**Frontend Server**:
```bash
# Start frontend in background
cd /Users/erik/Documents/Dev/Diet/nutrivault/frontend && npm run dev
```

**Example using run_in_terminal**:
```javascript
// Start backend server
run_in_terminal({
  command: "cd /Users/erik/Documents/Dev/Diet/nutrivault/backend && npm run dev",
  explanation: "Start backend development server on port 3001",
  isBackground: true
})

// Start frontend server
run_in_terminal({
  command: "cd /Users/erik/Documents/Dev/Diet/nutrivault/frontend && npm run dev",
  explanation: "Start frontend development server on port 5173",
  isBackground: true
})
```

### Step 3: Wait for Servers to be Ready

**After starting servers, always wait before testing**:

```bash
# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 5

# Verify backend is responding
curl -s http://localhost:3001/health > /dev/null && echo "✅ Backend ready" || echo "❌ Backend not ready"

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to start..."
sleep 3

# Verify frontend is responding
curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend ready" || echo "❌ Frontend not ready"
```

**Recommended wait times**:
- Backend (with database sync): 5-7 seconds
- Frontend (Vite): 3-4 seconds
- Both together: 8-10 seconds

### Step 4: Run Tests

Once servers are confirmed ready, proceed with tests:

```bash
# API endpoint testing
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}'

# Frontend E2E testing
npm run test:e2e
```

### Step 5: Cleanup After Testing

**Always clean up after tests complete**:

```bash
# At end of test script
cleanup_servers() {
  echo "🧹 Cleaning up servers..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
}

# Trap to ensure cleanup on script exit
trap cleanup_servers EXIT
```

---

## Complete Test Script Template

```bash
#!/bin/bash

# Test Script Template
# Usage: ./test-feature.sh

set -e  # Exit on error

BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cleanup function
cleanup_servers() {
  echo -e "${YELLOW}🧹 Cleaning up servers...${NC}"
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
  sleep 1
}

# Trap cleanup on exit
trap cleanup_servers EXIT

# Step 1: Clean up existing processes
echo "=================================="
echo "Test Setup"
echo "=================================="
cleanup_servers

# Step 2: Start backend server (in background via run_in_terminal)
echo -e "${YELLOW}🚀 Starting backend server...${NC}"
# Use run_in_terminal tool with isBackground=true here

# Step 3: Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 5

# Verify backend is responding
if curl -s "$BASE_URL/health" > /dev/null; then
  echo -e "${GREEN}✅ Backend ready${NC}"
else
  echo -e "${RED}❌ Backend failed to start${NC}"
  exit 1
fi

# Step 4: Run tests
echo "=================================="
echo "Running Tests"
echo "=================================="

# Your test logic here
response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

if echo "$response" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ Test passed${NC}"
else
  echo -e "${RED}❌ Test failed${NC}"
  exit 1
fi

# Step 5: Cleanup happens automatically via trap
echo -e "${GREEN}🎉 All tests completed${NC}"
```

---

## Testing Best Practices

### 1. API Endpoint Testing

**Always include**:
- Port cleanup before starting
- Server readiness check
- Proper error handling
- Response validation
- Cleanup after completion

**Example**:
```bash
# Clean ports
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Start server (via run_in_terminal with isBackground=true)
# Wait for readiness
sleep 5

# Test endpoint
response=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

# Validate response
if echo "$response" | jq -e '.success == true' > /dev/null; then
  echo "✅ Test passed"
else
  echo "❌ Test failed"
  echo "$response" | jq .
  exit 1
fi

# Cleanup
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
```

### 2. Frontend Testing

**For E2E tests with Playwright/Cypress**:

```bash
# Clean ports
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start both servers (via run_in_terminal with isBackground=true)
# Backend: cd backend && npm run dev
# Frontend: cd frontend && npm run dev

# Wait for both to be ready
sleep 8

# Run E2E tests
npm run test:e2e

# Cleanup
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
```

### 3. Unit Testing

**For unit tests (no server required)**:
```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test
```

### 4. Integration Testing

**For tests requiring database**:
```bash
# Ensure database is in clean state
cd backend
npm run db:migrate
npm run db:seed

# Run integration tests
npm run test:integration
```

---

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find and kill process using port
lsof -ti:3001 | xargs kill -9

# Verify port is free
lsof -i:3001  # Should return nothing

# Restart server
cd backend && npm run dev
```

### Issue 2: Server Not Responding

**Error**: Tests fail with connection refused

**Solution**:
```bash
# Increase wait time
sleep 7  # Instead of sleep 5

# Check server logs
cd backend && npm run dev  # View output for errors

# Verify server is running
lsof -i:3001  # Should show node process

# Check health endpoint
curl http://localhost:3001/health
```

### Issue 3: Tests Hang on Cleanup

**Error**: Script doesn't exit after tests complete

**Solution**:
```bash
# Use kill -9 instead of kill
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Add explicit exit
trap 'cleanup_servers; exit 0' EXIT
```

### Issue 4: Database Not Seeded

**Error**: Tests fail because no admin user exists

**Solution**:
```bash
# Run migrations and seeders before tests
cd backend
npm run db:migrate
npm run db:seed

# Then run tests
./test-auth.sh
```

---

## Test Checklist

Before running any server-based test:

- [ ] Clean up ports (3001, 5173)
- [ ] Kill any existing node processes
- [ ] Start servers using run_in_terminal with isBackground=true
- [ ] Wait appropriate time (5-8 seconds)
- [ ] Verify servers are responding (curl health endpoints)
- [ ] Run tests
- [ ] Capture and validate responses
- [ ] Clean up servers after completion
- [ ] Use trap EXIT for guaranteed cleanup

---

## Agent-Specific Instructions

### When Using run_in_terminal Tool

**For Starting Servers**:
```javascript
// ALWAYS use isBackground=true for servers
run_in_terminal({
  command: "cd /path/to/backend && npm run dev",
  explanation: "Start backend server",
  isBackground: true  // ← CRITICAL
})
```

**For Running Tests**:
```javascript
// Use isBackground=false for test commands
run_in_terminal({
  command: "./test-auth.sh",
  explanation: "Run authentication tests",
  isBackground: false  // ← Wait for completion
})
```

### Sequential Testing Flow

1. **Cleanup** (isBackground=false, quick command)
2. **Start backend** (isBackground=true)
3. **Wait 5s** (isBackground=false)
4. **Verify backend** (isBackground=false)
5. **Start frontend** if needed (isBackground=true)
6. **Wait 3s** (isBackground=false)
7. **Run tests** (isBackground=false)
8. **Cleanup** (isBackground=false)

---

## Environment-Specific Testing

### SQLite (Development)
```bash
# Use existing database
cd backend && npm run dev
```

### PostgreSQL (Production-like)
```bash
# Start PostgreSQL first
docker-compose -f docker-compose.postgres.yml up -d

# Wait for PostgreSQL
sleep 5

# Start backend
cd backend && npm run dev
```

---

## Summary

**Key Takeaways**:
1. **Always** clean ports before starting servers
2. **Always** use `isBackground=true` for npm run dev commands
3. **Always** wait for servers to be ready (5-8 seconds)
4. **Always** verify servers are responding before testing
5. **Always** clean up servers after testing (use trap EXIT)

**Common Command Pattern**:
```bash
# 1. Cleanup
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# 2. Start (via run_in_terminal with isBackground=true)

# 3. Wait
sleep 5

# 4. Verify
curl -s http://localhost:3001/health

# 5. Test
./run-tests.sh

# 6. Cleanup
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
```

This pattern ensures reliable, repeatable testing across all environments.
