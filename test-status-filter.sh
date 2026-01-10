#!/bin/bash

# Test User Status Filter Fix
# This script tests that "All Status" shows both active and inactive users

BASE_URL="http://localhost:3002"

echo "=================================="
echo "Testing User Status Filter Fix"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Login and get token
echo -e "${YELLOW}🔐 Logging in as admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Login successful${NC}"

  # Extract token (simple extraction)
  TOKEN=$(echo "$LOGIN_RESPONSE" | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')

  if [ -z "$TOKEN" ] || [ "$TOKEN" = "$LOGIN_RESPONSE" ]; then
    echo -e "${RED}❌ Failed to extract token${NC}"
    exit 1
  fi

  echo "Token obtained: ${TOKEN:0:20}..."

else
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"

# Test 1: All Status (empty string)
echo -e "\n${YELLOW}📊 Testing 'All Status' filter (is_active=)...${NC}"
ALL_RESPONSE=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/users?is_active=")

if echo "$ALL_RESPONSE" | grep -q '"success":true'; then
  ALL_COUNT=$(echo "$ALL_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
  echo -e "${GREEN}✅ All Status: Found $ALL_COUNT users${NC}"

  # Count active/inactive
  ACTIVE_COUNT=$(echo "$ALL_RESPONSE" | grep -o '"is_active":true' | wc -l)
  INACTIVE_COUNT=$(echo "$ALL_RESPONSE" | grep -o '"is_active":false' | wc -l)
  echo "   Active: $ACTIVE_COUNT, Inactive: $INACTIVE_COUNT"
else
  echo -e "${RED}❌ All Status filter failed${NC}"
  echo "$ALL_RESPONSE"
  exit 1
fi

# Test 2: Active only
echo -e "\n${YELLOW}📊 Testing 'Active only' filter (is_active=true)...${NC}"
ACTIVE_RESPONSE=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/users?is_active=true")

if echo "$ACTIVE_RESPONSE" | grep -q '"success":true'; then
  ACTIVE_COUNT_RESP=$(echo "$ACTIVE_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
  echo -e "${GREEN}✅ Active only: Found $ACTIVE_COUNT_RESP users${NC}"

  # Verify all are active
  FALSE_COUNT=$(echo "$ACTIVE_RESPONSE" | grep -o '"is_active":false' | wc -l)
  if [ "$FALSE_COUNT" -eq 0 ]; then
    echo "   ✅ All users are active"
  else
    echo -e "${RED}   ❌ Found $FALSE_COUNT inactive users in active filter${NC}"
  fi
else
  echo -e "${RED}❌ Active only filter failed${NC}"
  echo "$ACTIVE_RESPONSE"
  exit 1
fi

# Test 3: Inactive only
echo -e "\n${YELLOW}📊 Testing 'Inactive only' filter (is_active=false)...${NC}"
INACTIVE_RESPONSE=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/users?is_active=false")

if echo "$INACTIVE_RESPONSE" | grep -q '"success":true'; then
  INACTIVE_COUNT_RESP=$(echo "$INACTIVE_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
  echo -e "${GREEN}✅ Inactive only: Found $INACTIVE_COUNT_RESP users${NC}"

  # Verify all are inactive
  TRUE_COUNT=$(echo "$INACTIVE_RESPONSE" | grep -o '"is_active":true' | wc -l)
  if [ "$TRUE_COUNT" -eq 0 ]; then
    echo "   ✅ All users are inactive"
  else
    echo -e "${RED}   ❌ Found $TRUE_COUNT active users in inactive filter${NC}"
  fi
else
  echo -e "${RED}❌ Inactive only filter failed${NC}"
  echo "$INACTIVE_RESPONSE"
  exit 1
fi

# Test 4: Default (no filter)
echo -e "\n${YELLOW}📊 Testing default behavior (no is_active filter)...${NC}"
DEFAULT_RESPONSE=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/api/users")

if echo "$DEFAULT_RESPONSE" | grep -q '"success":true'; then
  DEFAULT_COUNT=$(echo "$DEFAULT_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
  echo -e "${GREEN}✅ Default: Found $DEFAULT_COUNT users${NC}"

  # Count active/inactive in default
  DEFAULT_ACTIVE=$(echo "$DEFAULT_RESPONSE" | grep -o '"is_active":true' | wc -l)
  DEFAULT_INACTIVE=$(echo "$DEFAULT_RESPONSE" | grep -o '"is_active":false' | wc -l)
  echo "   Active: $DEFAULT_ACTIVE, Inactive: $DEFAULT_INACTIVE"
else
  echo -e "${RED}❌ Default filter failed${NC}"
  echo "$DEFAULT_RESPONSE"
  exit 1
fi

echo "=================================="
echo -e "${GREEN}🎉 Status filter test completed!${NC}"
echo "=================================="
echo "Summary:"
echo "- All Status (empty): $ALL_COUNT users ($ACTIVE_COUNT active, $INACTIVE_COUNT inactive)"
echo "- Active only: $ACTIVE_COUNT_RESP users"
echo "- Inactive only: $INACTIVE_COUNT_RESP users"
echo "- Default: $DEFAULT_COUNT users ($DEFAULT_ACTIVE active, $DEFAULT_INACTIVE inactive)"

if [ "$INACTIVE_COUNT" -gt 0 ]; then
  echo -e "\n${GREEN}✅ SUCCESS: 'All Status' filter now shows both active and inactive users!${NC}"
else
  echo -e "\n${YELLOW}⚠️  Note: No inactive users found in database to test with${NC}"
  echo -e "${YELLOW}   The fix is applied, but you'll need inactive users to see the difference.${NC}"
fi