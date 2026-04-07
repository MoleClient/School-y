#!/bin/bash
# Double-click this file in Finder to start School-y + Cloudflare Tunnel
# If double-click doesn't work: drag this file onto Terminal and press Enter

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Self-heal: fix permissions on all scripts so double-click works from now on
chmod +x "$0" start.sh tunnel-start.sh start.command 2>/dev/null

clear
echo "============================================"
echo "  School-y -- Cloudflare Tunnel"
echo "============================================"
echo ""

# Check Node
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js is not installed."
  echo "Download it from https://nodejs.org then try again."
  read -p "Press Enter to close..."
  exit 1
fi

# Install packages if needed
if [ ! -d "node_modules" ]; then
  echo "Installing packages (first time only, ~1 minute)..."
  npm install
  echo ""
fi

# Find or download cloudflared
CF=""
if command -v cloudflared &>/dev/null; then
  CF="cloudflared"
elif [ -f "./cloudflared" ]; then
  CF="./cloudflared"
else
  echo "Downloading Cloudflare Tunnel tool..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
  else
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
  fi
  curl -L --progress-bar "$URL" -o cloudflared.tgz
  tar -xzf cloudflared.tgz 2>/dev/null
  rm -f cloudflared.tgz
  # the tgz may extract as just "cloudflared" or with path
  if [ ! -f "./cloudflared" ]; then
    # fallback: download the plain binary
    if [ "$ARCH" = "arm64" ]; then
      curl -L --progress-bar "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64" -o cloudflared
    else
      curl -L --progress-bar "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64" -o cloudflared
    fi
  fi
  chmod +x ./cloudflared
  # Remove macOS quarantine so it can run without a security popup
  xattr -d com.apple.quarantine ./cloudflared 2>/dev/null || true
  CF="./cloudflared"
  echo "Done."
  echo ""
fi

# Start School-y server in background
echo "Starting School-y server..."
npm run dev > server.log 2>&1 &
SERVER_PID=$!
sleep 4

echo ""
echo "============================================"
echo "  YOUR TUNNEL URL WILL APPEAR BELOW"
echo "  Look for the green https:// link and"
echo "  send it to whoever needs School-y"
echo "============================================"
echo ""

# Kill server when this script exits
trap "kill $SERVER_PID 2>/dev/null" EXIT INT TERM

$CF tunnel --url http://localhost:5000
