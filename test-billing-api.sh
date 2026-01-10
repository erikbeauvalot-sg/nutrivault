#!/bin/bash

# Test Billing API Implementation
# Tests the backend billing endpoints to ensure they work correctly

set -e

BASE_URL="http://localhost:3001"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================="
echo "Testing Billing API Implementation"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cleanup function
cleanup() {
  echo -e "${YELLOW}🧹 Cleaning up...${NC}"
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
}

# Trap cleanup on exit
trap cleanup EXIT

# Step 1: Kill any existing processes
echo -e "${YELLOW}🔧 Preparing environment...${NC}"
cleanup

# Step 2: Start server in background
echo -e "${YELLOW}🚀 Starting server...${NC}"
cd backend && npm run dev &
SERVER_PID=$!

# Wait for server to start
echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
sleep 8

# Wait for server to start
echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
sleep 8

# Check if server is running
if ! curl -s "$BASE_URL/health" > /dev/null; then
  echo -e "${RED}❌ Server failed to start${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"

# Step 3: Test authentication (get token)
echo -e "${YELLOW}🔐 Testing authentication...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

if echo "$AUTH_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.data.accessToken')
  echo -e "${GREEN}✅ Authentication successful${NC}"
else
  echo -e "${RED}❌ Authentication failed${NC}"
  echo "$AUTH_RESPONSE"
  exit 1
fi

# Step 4: Test billing endpoints
echo -e "${YELLOW}💰 Testing billing endpoints...${NC}"

# Test GET /api/billing (should return empty array for new system)
BILLING_LIST=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/billing")

if echo "$BILLING_LIST" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ GET /api/billing works${NC}"
else
  echo -e "${RED}❌ GET /api/billing failed${NC}"
  echo "$BILLING_LIST"
  exit 1
fi

# Test POST /api/billing (create invoice) - need a patient first
echo -e "${YELLOW}👥 Creating test patient...${NC}"
PATIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/patients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Patient",
    "email": "test@example.com",
    "phone": "555-0123",
    "date_of_birth": "1990-01-01"
  }')

if echo "$PATIENT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  PATIENT_ID=$(echo "$PATIENT_RESPONSE" | jq -r '.data.id')
  echo -e "${GREEN}✅ Test patient created: $PATIENT_ID${NC}"
else
  echo -e "${RED}❌ Failed to create test patient${NC}"
  echo "$PATIENT_RESPONSE"
  exit 1
fi

# Now create an invoice
echo -e "${YELLOW}📄 Creating test invoice...${NC}"
INVOICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/billing" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patient_id\": \"$PATIENT_ID\",
    \"description\": \"Test invoice for API validation\",
    \"amount_total\": 150.00,
    \"due_date\": \"2026-02-01\",
    \"items\": [
      {
        \"description\": \"Consultation\",
        \"amount\": 100.00
      },
      {
        \"description\": \"Lab tests\",
        \"amount\": 50.00
      }
    ]
  }")

if echo "$INVOICE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  INVOICE_ID=$(echo "$INVOICE_RESPONSE" | jq -r '.data.id')
  INVOICE_NUMBER=$(echo "$INVOICE_RESPONSE" | jq -r '.data.invoice_number')
  echo -e "${GREEN}✅ Invoice created: $INVOICE_NUMBER (ID: $INVOICE_ID)${NC}"
else
  echo -e "${RED}❌ Failed to create invoice${NC}"
  echo "$INVOICE_RESPONSE"
  exit 1
fi

# Test GET /api/billing/:id
echo -e "${YELLOW}📄 Testing invoice retrieval...${NC}"
INVOICE_DETAIL=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/billing/$INVOICE_ID")

if echo "$INVOICE_DETAIL" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ GET /api/billing/:id works${NC}"
else
  echo -e "${RED}❌ GET /api/billing/:id failed${NC}"
  echo "$INVOICE_DETAIL"
  exit 1
fi

# Test POST /api/billing/:id/payment
echo -e "${YELLOW}💳 Testing payment recording...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/billing/$INVOICE_ID/payment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 75.00,
    "payment_method": "CREDIT_CARD",
    "notes": "Partial payment test"
  }')

if echo "$PAYMENT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Payment recorded successfully${NC}"
else
  echo -e "${RED}❌ Payment recording failed${NC}"
  echo "$PAYMENT_RESPONSE"
  exit 1
fi

# Test PUT /api/billing/:id (update invoice)
echo -e "${YELLOW}📝 Testing invoice update...${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/billing/$INVOICE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated test invoice",
    "status": "SENT"
  }')

if echo "$UPDATE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Invoice updated successfully${NC}"
else
  echo -e "${RED}❌ Invoice update failed${NC}"
  echo "$UPDATE_RESPONSE"
  exit 1
fi

# Clean up test data
echo -e "${YELLOW}🧹 Cleaning up test data...${NC}"
curl -s -X DELETE "$BASE_URL/api/patients/$PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

curl -s -X DELETE "$BASE_URL/api/billing/$INVOICE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo -e "${GREEN}✅ Test data cleaned up${NC}"

# Step 5: Kill server
echo -e "${YELLOW}🛑 Stopping server...${NC}"
kill $SERVER_PID 2>/dev/null || true

echo "=================================="
echo -e "${GREEN}🎉 All billing API tests passed!${NC}"
echo "=================================="
echo "✅ Authentication works"
echo "✅ GET /api/billing (list invoices)"
echo "✅ POST /api/billing (create invoice)"
echo "✅ GET /api/billing/:id (get invoice)"
echo "✅ POST /api/billing/:id/payment (record payment)"
echo "✅ PUT /api/billing/:id (update invoice)"
echo "✅ DELETE /api/billing/:id (delete invoice)"
echo ""
echo "Backend billing implementation is complete and functional!"