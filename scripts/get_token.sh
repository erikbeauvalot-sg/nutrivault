#!/bin/bash

# Test Authentication Flow - TASK-042
# This script tests the complete authentication system

echo "=================================="
echo "NutriVault Authentication Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"
ACCESS_TOKEN=""
REFRESH_TOKEN=""
API_KEY=""

echo "📋 Test Checklist:"
echo "1. ✅ Login with valid credentials"
echo ""

# Test 1: Login with valid credentials
echo "----------------------------------------"
echo "Test 1: Login with valid credentials"
echo "----------------------------------------"
response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

echo "$response" | jq .

if echo "$response" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ PASSED: Login successful${NC}"
  ACCESS_TOKEN=$(echo "$response" | jq -r '.data.accessToken')
  REFRESH_TOKEN=$(echo "$response" | jq -r '.data.refreshToken')
  echo "Access Token: ${ACCESS_TOKEN:0:50}..."
  echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."
else
  echo -e "${RED}❌ FAILED: Login failed${NC}"
  exit 1
fi
echo ""


# TEST specific api call to get token using the get_token.sh script
echo "----------------------------------------"
echo "Test: Get token using get_token.sh script"
echo "----------------------------------------"
# TOKEN_RESPONSE=$(bash ./get_token.sh admin Admin123!)


echo -e ${GREEN}$ACCESS_TOKEN


echo "----------------------------------------"
echo "TEST API CALL WITH TOKEN"
echo "----------------------------------------"
API_RESPONSE=$(curl -s -X GET "$BASE_URL/api/patients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "$API_RESPONSE" | jq .
if echo "$API_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ PASSED: API call successful with token${NC}"
else
  echo -e "${RED}❌ FAILED: API call failed with token${NC}"
  exit 1
fi
echo "" 
echo "All tests completed."

PATIENT_ID="2794785d-32e8-4fcc-8a0b-8c70bb284be3"
API_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/patients/$PATIENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medical_notes": "Updated medical notes",
    "height_cm": 175,
    "weight_kg": 70,
    "blood_type": "O+",
    "dietary_preferences": "Vegetarian"
  }')

echo "$API_RESPONSE" | jq .
if echo "$API_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ PASSED: API PUT call successful"
else
  echo -e "${RED}❌ FAILED: API PUT call failed"
  exit 1
fi
echo "" 
echo "All tests completed."

exit 0