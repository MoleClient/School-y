#!/bin/bash

# Get the real directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo " =========================================="
echo "  School-y - Starting..."
echo " =========================================="
echo ""

# ── Detect Chrome OS ────────────────────────────────────────────────────────
IS_CHROMEBOOK=false
if [ -d "/sys/firmware/chromeos" ] || grep -qi "chromeos\|cros" /proc/version 2>/dev/null; then
    IS_CHROMEBOOK=true
fi

# ── Check / install Node.js ──────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo " Node.js not found. Installing..."
    if $IS_CHROMEBOOK || command -v apt-get &> /dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y nodejs npm
    elif command -v brew &> /dev/null; then
        brew install node
    else
        echo " Please install Node.js from https://nodejs.org and try again."
        exit 1
    fi
fi

echo " Node.js: $(node -v)"

# ── Install dependencies ─────────────────────────────────────────────────────
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo " Installing packages (first time, may take a minute)..."
    npm install --silent
fi
echo " Packages ready."

# ── Start server in background ───────────────────────────────────────────────
echo " Starting server..."
nohup npm run dev > "$SCRIPT_DIR/server.log" 2>&1 &
SERVER_PID=$!

# ── Wait for server to respond ───────────────────────────────────────────────
echo " Waiting for server..."
for i in $(seq 1 30); do
    if curl -s "http://localhost:5000/api/auth/me" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# ── Open browser ─────────────────────────────────────────────────────────────
echo " Opening browser..."
if $IS_CHROMEBOOK; then
    # On Chromebook, open the system Chrome browser (outside Linux container)
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5000" 2>/dev/null &
    elif [ -f "/usr/bin/google-chrome" ]; then
        /usr/bin/google-chrome "http://localhost:5000" 2>/dev/null &
    else
        # Fallback: use Chrome OS garcon helper to open URL in Chrome
        if [ -f "/usr/bin/garcon-url-handler" ]; then
            /usr/bin/garcon-url-handler "http://localhost:5000" &
        fi
    fi
elif command -v open &> /dev/null; then
    open "http://localhost:5000"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5000"
fi

echo ""
echo " School-y is running at http://localhost:5000"
echo " Keep this window open. Press Ctrl+C to stop."
echo ""

wait $SERVER_PID
