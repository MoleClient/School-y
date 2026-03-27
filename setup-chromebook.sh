#!/bin/bash
# Run this ONCE on your Chromebook to add School-y to your app launcher.
# After running this, you can double-click the School-y icon like any other app.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo " School-y Chromebook Setup"
echo " =========================="
echo ""

# ── Install Node.js if needed ────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo " Installing Node.js..."
    sudo apt-get update -qq
    sudo apt-get install -y nodejs npm
    echo " Node.js installed: $(node -v)"
else
    echo " Node.js: $(node -v) (already installed)"
fi

# ── Install npm packages ─────────────────────────────────────────────────────
echo " Installing packages..."
cd "$SCRIPT_DIR"
npm install --silent
echo " Packages installed."

# ── Create a wrapper launcher script ─────────────────────────────────────────
LAUNCHER="$HOME/.local/bin/schooly-launcher.sh"
mkdir -p "$HOME/.local/bin"

cat > "$LAUNCHER" << LAUNCHEOF
#!/bin/bash
cd "$SCRIPT_DIR"

# Start server if not already running
if ! curl -s http://localhost:5000/api/auth/me > /dev/null 2>&1; then
    nohup npm run dev > "$SCRIPT_DIR/server.log" 2>&1 &
    # Wait for server to be ready
    for i in \$(seq 1 30); do
        if curl -s http://localhost:5000/api/auth/me > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
fi

# Open Chrome OS browser at localhost
xdg-open "http://localhost:5000" 2>/dev/null || \
/usr/bin/garcon-url-handler "http://localhost:5000" 2>/dev/null || \
google-chrome "http://localhost:5000" 2>/dev/null
LAUNCHEOF

chmod +x "$LAUNCHER"

# ── Create .desktop shortcut ──────────────────────────────────────────────────
DESKTOP_DIR="$HOME/.local/share/applications"
mkdir -p "$DESKTOP_DIR"

cat > "$DESKTOP_DIR/schooly.desktop" << DESKEOF
[Desktop Entry]
Type=Application
Name=School-y
Comment=Browse freely
Exec=$LAUNCHER
Terminal=false
Categories=Network;WebBrowser;
StartupNotify=false
DESKEOF

chmod +x "$DESKTOP_DIR/schooly.desktop"

# Refresh app list
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo ""
echo " ✓ Setup complete!"
echo ""
echo " School-y is now in your Chromebook app launcher."
echo " Search for 'School-y' in your apps, or look in the Linux apps folder."
echo " Just click it to launch — no terminal needed from now on."
echo ""
