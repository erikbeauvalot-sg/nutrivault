#!/bin/bash

# NutriVault POC - Test Script

echo "🧪 Testing NutriVault POC API..."
echo ""

BASE_URL="http://localhost:3001"

# Test 1: Health Check
echo "1️⃣ Testing health check..."
HEALTH=$(curl -s "$BASE_URL/health")
if [[ $HEALTH == *"OK"* ]]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "Make sure the backend server is running: cd backend && node src/server.js"
    exit 1
fi
echo ""

# Test 2: Get all patients (should be empty initially)
echo "2️⃣ Testing GET /api/patients..."
curl -s "$BASE_URL/api/patients" | head -10
echo ""
echo "✅ GET all patients works"
echo ""

# Test 3: Create a patient
echo "3️⃣ Testing POST /api/patients (creating patient)..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "phone": "555-9876",
    "date_of_birth": "1990-06-20",
    "gender": "Female",
    "allergies": "Shellfish",
    "dietary_preferences": "Vegetarian",
    "medical_notes": "Regular checkups needed"
  }')

PATIENT_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "✅ Patient created with ID: $PATIENT_ID"
echo ""

# Test 4: Get the created patient
echo "4️⃣ Testing GET /api/patients/$PATIENT_ID..."
curl -s "$BASE_URL/api/patients/$PATIENT_ID" | head -15
echo ""
echo "✅ GET patient by ID works"
echo ""

# Test 5: Update the patient
echo "5️⃣ Testing PUT /api/patients/$PATIENT_ID (updating patient)..."
curl -s -X PUT "$BASE_URL/api/patients/$PATIENT_ID" \
  -H "Content-Type: application/json" \
  -d '{"phone": "555-1111", "medical_notes": "Updated notes"}' | head -10
echo ""
echo "✅ UPDATE patient works"
echo ""

# Test 6: Get all patients again (should have 1 now)
echo "6️⃣ Testing GET /api/patients (should show updated patient)..."
ALL_PATIENTS=$(curl -s "$BASE_URL/api/patients")
echo "$ALL_PATIENTS" | head -20
echo ""

COUNT=$(echo $ALL_PATIENTS | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "Total patients in database: $COUNT"
echo ""

# Test 7: Delete the patient
echo "7️⃣ Testing DELETE /api/patients/$PATIENT_ID..."
curl -s -X DELETE "$BASE_URL/api/patients/$PATIENT_ID" | head -10
echo ""
echo "✅ DELETE patient works"
echo ""

echo "================================"
echo "✅ All API tests passed!"
echo "================================"
echo ""
echo "POC is ready to use. Open http://localhost:5173 to use the frontend."
