#!/bin/bash

echo ""
echo " =========================================="
echo "  School-y - Local Setup"
echo " =========================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo " [ERROR] Node.js is not installed."
    echo ""
    echo " Please install Node.js from: https://nodejs.org"
    echo " (Choose the LTS version)"
    echo ""
    if command -v open &> /dev/null; then
        open "https://nodejs.org"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://nodejs.org"
    fi
    exit 1
fi

NODE_VER=$(node -v)
echo " Node.js found: $NODE_VER"

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo " =========================================="
    echo "  Database Setup Required"
    echo " =========================================="
    echo ""
    echo " School-y needs a free PostgreSQL database."
    echo " Get one free at: https://neon.tech"
    echo ""
    echo " Steps:"
    echo "   1. Go to https://neon.tech and sign up free"
    echo "   2. Create a new project"
    echo "   3. Copy the Connection string (starts with postgres://)"
    echo "   4. Paste it below"
    echo ""
    read -p " Paste your database URL here: " DB_URL
    echo "DATABASE_URL=$DB_URL" > .env
    echo ""
    echo " Saved! You won't need to do this again."
    echo ""
fi

# Install dependencies
echo " Installing dependencies (first time may take a minute)..."
npm install --silent
if [ $? -ne 0 ]; then
    echo " [ERROR] npm install failed. Check your internet connection."
    exit 1
fi
echo " Dependencies ready."

# Push database schema
echo " Setting up database tables..."
npx drizzle-kit push --config=drizzle.config.ts > /dev/null 2>&1
echo " Database ready."

# Start server in background
echo ""
echo " Starting School-y server..."
npm run dev &
SERVER_PID=$!

# Wait for server
echo " Waiting for server to start..."
sleep 4

# Open browser
echo " Opening browser..."
if command -v open &> /dev/null; then
    open "http://localhost:5000"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5000"
else
    echo " Open your browser and go to: http://localhost:5000"
fi

echo ""
echo " =========================================="
echo "  School-y is running at localhost:5000"
echo " =========================================="
echo ""
echo " Keep this window open while using School-y."
echo " Press Ctrl+C to stop."
echo ""

wait $SERVER_PID
