#!/bin/bash
# Double-click this file on Mac to start School-y
# If double-click doesn't work: drag this file onto Terminal and press Enter

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Self-heal: make all scripts executable so double-click works from now on
chmod +x "$0" start.sh tunnel-start.sh School-y-Tunnel.command 2>/dev/null

chmod +x start.sh
./start.sh
