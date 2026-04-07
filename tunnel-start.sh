#!/bin/bash
clear
echo "============================================"
echo "  School-y -- Cloudflare Tunnel Launcher"
echo "============================================"
echo ""

# Detect OS
OS="$(uname -s)"

# Check Node
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js is not installed."
  echo "Download from https://nodejs.org and try again."
  exit 1
fi

# Install packages if needed
if [ ! -d "node_modules" ]; then
  echo "Installing packages (first time only)..."
  npm install
  echo ""
fi

# Download cloudflared if missing
if ! command -v cloudflared &>/dev/null && [ ! -f "./cloudflared" ]; then
  echo "Downloading Cloudflare Tunnel tool..."
  if [ "$OS" = "Darwin" ]; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
      URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
    else
      URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
    fi
    curl -L "$URL" -o cloudflared.tgz
    tar -xzf cloudflared.tgz
    rm cloudflared.tgz
    chmod +x cloudflared
  else
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ]; then
      URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
    else
      URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    fi
    curl -L "$URL" -o cloudflared
    chmod +x cloudflared
  fi
  echo "Done."
  echo ""
fi

CF="cloudflared"
if [ ! -f "/usr/local/bin/cloudflared" ] && [ ! -f "/usr/bin/cloudflared" ]; then
  CF="./cloudflared"
fi

# Start School-y server
echo "Starting School-y server..."
npm run dev > server.log 2>&1 &
SERVER_PID=$!
sleep 3

echo ""
echo "============================================"
echo "  SHARE THE URL BELOW WITH YOUR DEVICE"
echo "  (Look for the https://...trycloudflare.com line)"
echo "============================================"
echo ""

# Trap to kill server on exit
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM

$CF tunnel --url http://localhost:5000
