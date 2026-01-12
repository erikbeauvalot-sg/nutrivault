#!/bin/bash

# Test export functionality
echo "🧪 Testing NutriVault Export Functionality"
echo "=========================================="

BASE_URL="http://localhost:3001"

# Test login
echo "🔐 Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Login successful"

  # Extract token (simple extraction)
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

  if [ -n "$TOKEN" ]; then
    echo "🔑 Token obtained"

    # Test patients export
    echo "📊 Testing patients CSV export..."
    CSV_RESPONSE=$(curl -s -X GET "$BASE_URL/api/export/patients?format=csv" \
      -H "Authorization: Bearer $TOKEN")

    if echo "$CSV_RESPONSE" | grep -q "Content-Type.*text/csv"; then
      echo "✅ Patients CSV export successful"
    else
      echo "❌ Patients CSV export failed"
      echo "Response: $CSV_RESPONSE"
    fi

    # Test visits export
    echo "📅 Testing visits Excel export..."
    EXCEL_RESPONSE=$(curl -s -X GET "$BASE_URL/api/export/visits?format=excel" \
      -H "Authorization: Bearer $TOKEN")

    if echo "$EXCEL_RESPONSE" | grep -q "Content-Type.*application/vnd.openxmlformats"; then
      echo "✅ Visits Excel export successful"
    else
      echo "❌ Visits Excel export failed"
      echo "Response: $EXCEL_RESPONSE"
    fi

    # Test billing export
    echo "💰 Testing billing PDF export..."
    PDF_RESPONSE=$(curl -s -X GET "$BASE_URL/api/export/billing?format=pdf" \
      -H "Authorization: Bearer $TOKEN")

    if echo "$PDF_RESPONSE" | grep -q "Content-Type.*application/pdf"; then
      echo "✅ Billing PDF export successful"
    else
      echo "❌ Billing PDF export failed"
      echo "Response: $PDF_RESPONSE"
    fi

  else
    echo "❌ Failed to extract token"
  fi

else
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
fi

echo "=========================================="
echo "🎉 Export testing completed"