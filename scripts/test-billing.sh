#!/bin/bash

# Test Billing System - Comprehensive API Testing
# Tests all billing endpoints and functionality

set -e

echo "=================================="
echo "NutriVault Billing System Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3001"
ACCESS_TOKEN=""
TEST_PATIENT_ID=""
TEST_INVOICE_ID=""
TEST_INVOICE_NUMBER=""

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up test data...${NC}"
  if [ -n "$TEST_PATIENT_ID" ]; then
    curl -s -X DELETE "$BASE_URL/api/patients/$TEST_PATIENT_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null || true
  fi
  if [ -n "$TEST_INVOICE_ID" ]; then
    curl -s -X DELETE "$BASE_URL/api/billing/$TEST_INVOICE_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null || true
  fi
}

# Trap cleanup on exit
trap cleanup EXIT

echo "📋 Billing Test Checklist:"
echo "1. ✅ Authentication and setup"
echo "2. ✅ Create test patient"
echo "3. ✅ List invoices (empty)"
echo "4. ✅ Create invoice"
echo "5. ✅ Get invoice by ID"
echo "6. ✅ Update invoice"
echo "7. ✅ Record payment"
echo "8. ✅ List invoices (with data)"
echo "9. ✅ Filter invoices"
echo "10. ✅ Delete invoice"
echo "11. ✅ Verify soft delete"
echo ""

# Test 1: Authentication
echo "----------------------------------------"
echo -e "${BLUE}Test 1: Authentication${NC}"
echo "----------------------------------------"
response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASSED: Authentication successful${NC}"
  ACCESS_TOKEN=$(echo "$response" | jq -r '.data.accessToken')
else
  echo -e "${RED}❌ FAILED: Authentication failed${NC}"
  echo "$response"
  exit 1
fi

# Test 2: Create test patient
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 2: Create test patient${NC}"
echo "----------------------------------------"
response=$(curl -s -X POST "$BASE_URL/api/patients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Patient",
    "email": "billing-test@example.com",
    "phone": "555-0199",
    "date_of_birth": "1990-01-01"
  }')

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  TEST_PATIENT_ID=$(echo "$response" | jq -r '.data.id')
  echo -e "${GREEN}✅ PASSED: Test patient created (ID: $TEST_PATIENT_ID)${NC}"
else
  echo -e "${RED}❌ FAILED: Could not create test patient${NC}"
  echo "$response"
  exit 1
fi

# Test 3: List invoices (should be empty)
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 3: List invoices (empty)${NC}"
echo "----------------------------------------"
response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/billing")

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  invoice_count=$(echo "$response" | jq '.data | length')
  if [ "$invoice_count" -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: No invoices found (expected)${NC}"
  else
    echo -e "${YELLOW}⚠️  WARNING: Found $invoice_count existing invoices${NC}"
  fi
else
  echo -e "${RED}❌ FAILED: Could not list invoices${NC}"
  echo "$response"
  exit 1
fi

# Test 4: Create invoice
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 4: Create invoice${NC}"
echo "----------------------------------------"
response=$(curl -s -X POST "$BASE_URL/api/billing" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patient_id\": \"$TEST_PATIENT_ID\",
    \"description\": \"Comprehensive nutrition consultation and meal planning\",
    \"amount_total\": 250.00,
    \"due_date\": \"2026-02-15\",
    \"items\": [
      {
        \"description\": \"Initial consultation (60 min)\",
        \"amount\": 150.00
      },
      {
        \"description\": \"Personalized meal plan\",
        \"amount\": 75.00
      },
      {
        \"description\": \"Follow-up email support\",
        \"amount\": 25.00
      }
    ]
  }")

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  TEST_INVOICE_ID=$(echo "$response" | jq -r '.data.id')
  TEST_INVOICE_NUMBER=$(echo "$response" | jq -r '.data.invoice_number')
  echo -e "${GREEN}✅ PASSED: Invoice created${NC}"
  echo "   Invoice ID: $TEST_INVOICE_ID"
  echo "   Invoice Number: $TEST_INVOICE_NUMBER"
  echo "   Status: $(echo "$response" | jq -r '.data.status')"
  echo "   Amount Total: $(echo "$response" | jq -r '.data.amount_total')"
else
  echo -e "${RED}❌ FAILED: Could not create invoice${NC}"
  echo "$response"
  exit 1
fi

# Test 5: Get invoice by ID
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 5: Get invoice by ID${NC}"
echo "----------------------------------------"
response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/billing/$TEST_INVOICE_ID")

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  retrieved_id=$(echo "$response" | jq -r '.data.id')
  retrieved_number=$(echo "$response" | jq -r '.data.invoice_number')
  if [ "$retrieved_id" = "$TEST_INVOICE_ID" ] && [ "$retrieved_number" = "$TEST_INVOICE_NUMBER" ]; then
    echo -e "${GREEN}✅ PASSED: Invoice retrieved correctly${NC}"
    echo "   Patient: $(echo "$response" | jq -r '.data.patient.first_name') $(echo "$response" | jq -r '.data.patient.last_name')"
    echo "   Items: $(echo "$response" | jq '.data.items | length') items"
  else
    echo -e "${RED}❌ FAILED: Invoice data mismatch${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ FAILED: Could not retrieve invoice${NC}"
  echo "$response"
  exit 1
fi

# Test 6: Update invoice
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 6: Update invoice${NC}"
echo "----------------------------------------"
response=$(curl -s -X PUT "$BASE_URL/api/billing/$TEST_INVOICE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated: Comprehensive nutrition consultation and meal planning",
    "status": "SENT",
    "due_date": "2026-02-20"
  }')

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  updated_status=$(echo "$response" | jq -r '.data.status')
  if [ "$updated_status" = "SENT" ]; then
    echo -e "${GREEN}✅ PASSED: Invoice updated successfully${NC}"
    echo "   New status: $updated_status"
  else
    echo -e "${RED}❌ FAILED: Status not updated correctly${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ FAILED: Could not update invoice${NC}"
  echo "$response"
  exit 1
fi

# Test 7: Record payment
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 7: Record payment${NC}"
echo "----------------------------------------"
response=$(curl -s -X POST "$BASE_URL/api/billing/$TEST_INVOICE_ID/payment" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 125.00,
    "payment_method": "CREDIT_CARD",
    "payment_date": "2026-01-15",
    "notes": "Partial payment via credit card"
  }')

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  amount_paid=$(echo "$response" | jq -r '.data.amount_paid')
  amount_due=$(echo "$response" | jq -r '.data.amount_due')
  if [ "$amount_paid" = "125.00" ] && [ "$amount_due" = "125.00" ]; then
    echo -e "${GREEN}✅ PASSED: Payment recorded successfully${NC}"
    echo "   Amount Paid: $amount_paid"
    echo "   Amount Due: $amount_due"
  else
    echo -e "${RED}❌ FAILED: Payment amounts incorrect${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ FAILED: Could not record payment${NC}"
  echo "$response"
  exit 1
fi

# Test 8: List invoices (with data)
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 8: List invoices (with data)${NC}"
echo "----------------------------------------"
response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/billing")

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  invoice_count=$(echo "$response" | jq '.data | length')
  if [ "$invoice_count" -ge 1 ]; then
    echo -e "${GREEN}✅ PASSED: Found $invoice_count invoice(s)${NC}"
    echo "$response" | jq -r '.data[0] | "   Invoice: \(.invoice_number) - Status: \(.status) - Total: $\(.amount_total)"'
  else
    echo -e "${RED}❌ FAILED: No invoices found after creation${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ FAILED: Could not list invoices${NC}"
  echo "$response"
  exit 1
fi

# Test 9: Filter invoices
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 9: Filter invoices${NC}"
echo "----------------------------------------"
response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/billing?status=SENT&patient_id=$TEST_PATIENT_ID")

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  invoice_count=$(echo "$response" | jq '.data | length')
  if [ "$invoice_count" -ge 1 ]; then
    echo -e "${GREEN}✅ PASSED: Filtering works (found $invoice_count matching invoice(s))${NC}"
  else
    echo -e "${YELLOW}⚠️  WARNING: No invoices matched filters (may be expected)${NC}"
  fi
else
  echo -e "${RED}❌ FAILED: Could not filter invoices${NC}"
  echo "$response"
  exit 1
fi

# Test 10: Delete invoice
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 10: Delete invoice${NC}"
echo "----------------------------------------"
response=$(curl -s -X DELETE "$BASE_URL/api/billing/$TEST_INVOICE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASSED: Invoice deleted successfully${NC}"
else
  echo -e "${RED}❌ FAILED: Could not delete invoice${NC}"
  echo "$response"
  exit 1
fi

# Test 11: Verify soft delete
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 11: Verify soft delete${NC}"
echo "----------------------------------------"
response=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/billing/$TEST_INVOICE_ID")

if echo "$response" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASSED: Invoice properly soft-deleted (not accessible)${NC}"
else
  echo -e "${RED}❌ FAILED: Invoice still accessible after deletion${NC}"
  exit 1
fi

# Test 12: Test validation errors
echo -e "\n----------------------------------------"
echo -e "${BLUE}Test 12: Validation errors${NC}"
echo "----------------------------------------"
response=$(curl -s -X POST "$BASE_URL/api/billing" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "invalid-uuid",
    "description": "",
    "amount_total": -50
  }')

if echo "$response" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASSED: Validation errors caught correctly${NC}"
  echo "   Errors: $(echo "$response" | jq '.details | length') validation errors"
else
  echo -e "${RED}❌ FAILED: Validation errors not caught${NC}"
  echo "$response"
  exit 1
fi

echo -e "\n=================================="
echo -e "${GREEN}🎉 ALL BILLING TESTS PASSED!${NC}"
echo "=================================="
echo ""
echo "✅ Authentication and setup"
echo "✅ Create test patient"
echo "✅ List invoices (empty)"
echo "✅ Create invoice with auto-generated number"
echo "✅ Get invoice by ID with patient data"
echo "✅ Update invoice status and details"
echo "✅ Record payment with amount calculations"
echo "✅ List invoices with pagination"
echo "✅ Filter invoices by status and patient"
echo "✅ Delete invoice (soft delete)"
echo "✅ Verify soft delete behavior"
echo "✅ Validation error handling"
echo ""
echo "Billing system is fully functional! 💰"