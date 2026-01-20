#!/bin/bash

# Test document upload functionality
echo "🧪 Testing Document Upload Functionality"
echo "========================================"

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 5

# Test login
echo "🔐 Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123!"}')

if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Login successful"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

# Create a test file
echo "📄 Creating test file..."
echo "This is a test document for upload functionality." > test_document.txt

# Test document upload without resource association
echo "📤 Testing document upload (no resource association)..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@test_document.txt" \
  -F "description=Test document upload")

if echo "$UPLOAD_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Document upload successful"
  echo "$UPLOAD_RESPONSE" | jq '.data'
else
  echo "❌ Document upload failed"
  echo "$UPLOAD_RESPONSE" | jq .
  exit 1
fi

# Test document upload with resource association (optional)
echo "📤 Testing document upload (with resource association)..."
UPLOAD_WITH_RESOURCE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@test_document.txt" \
  -F "resource_type=patient" \
  -F "resource_id=123e4567-e89b-12d3-a456-426614174000" \
  -F "description=Test document with resource association")

if echo "$UPLOAD_WITH_RESOURCE_RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Document upload with resource association successful"
  echo "$UPLOAD_WITH_RESOURCE_RESPONSE" | jq '.data'
else
  echo "❌ Document upload with resource association failed"
  echo "$UPLOAD_WITH_RESOURCE_RESPONSE" | jq .
  exit 1
fi

# Clean up
rm test_document.txt

echo "🎉 All document upload tests passed!"
echo "========================================"