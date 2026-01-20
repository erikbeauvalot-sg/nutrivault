#!/bin/bash

# NutriVault POC - Start Script

echo "🚀 Starting NutriVault POC..."
echo ""

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Dependencies installed"
echo ""
echo "🔧 Starting backend server on http://localhost:3001..."
cd backend && node src/server.js &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 3

echo ""
echo "🎨 Starting frontend server on http://localhost:5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "✅ NutriVault POC is running!"
echo "================================"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "📡 Backend:  http://localhost:3001"
echo "🏥 Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
