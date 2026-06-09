#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_PATH"

msg() { echo "[$(date +%H:%M:%S)] $*"; }
error() { msg "ERROR: $*" >&2; }

# -- 1. Node.js --
if ! command -v node &>/dev/null; then
    msg "Node.js is missing. Attempting auto-install..."
    if command -v apt-get &>/dev/null; then
        if command -v pkexec &>/dev/null; then
            pkexec apt-get install -y nodejs npm || {
                error "Graphical install failed. Please install nodejs manually."
                exit 1
            }
        else
            error "Node.js is not installed."
            error "Please open a terminal and run: sudo apt-get install -y nodejs npm"
            read -rp "Press ENTER to close..."
            exit 1
        fi
    elif command -v brew &>/dev/null; then
        brew install node
    else
        error "No supported package manager found."
        error "Install Node.js from https://nodejs.org and try again."
        read -rp "Press ENTER to close..."
        exit 1
    fi
    if ! command -v node &>/dev/null; then
        error "Node.js still missing after install attempt."
        read -rp "Press ENTER to close..."
        exit 1
    fi
fi

msg "Node.js $(node --version) – OK"

# -- 2. server.js syntax check --
node --check server.js || {
    error "server.js has syntax errors. Aborting."
    read -rp "Press ENTER to close..."
    exit 1
}
msg "server.js – OK"

# -- 3. dndbeyond-mcp warning --
MCP="${DNDBEYOND_MCP_PATH:-/home/adrian/dndbeyond-mcp}"
[ ! -e "$MCP" ] && msg "WARN: dndbeyond-mcp not found at $MCP (campaign list will be empty)"

# -- 4. campaign scaffold --
CAMPAIGN="${CAMPAIGN_BASE:-$SCRIPT_PATH/campaign}"
mkdir -p "$CAMPAIGN"/{Bestiary,Factions,NPCs,Locations}
if [ ! -f "$CAMPAIGN/party_inventory.json" ]; then
    echo '{"items":[{"item":"Potion of Healing","qty":3,"weight":0.5},{"item":"Rope (hempen, 50 ft)","qty":1,"weight":10},{"item":"Adventurer's Pack","qty":4,"weight":7},{"item":"Torch","qty":6,"weight":1},{"item":"Rations (1 day)","qty":10,"weight":2},{"item":"Thieves' Tools","qty":1,"weight":1},{"item":"Scroll of Identify","qty":1,"weight":0}],"currency":{"gp":247,"sp":89,"cp":312}}' > "$CAMPAIGN/party_inventory.json"
fi
msg "Campaign base – OK"

# -- 5. Launch --
PORT="${PORT:-8765}"
msg "Starting server on port $PORT ..."
msg "Browser will open automatically. Close this window to stop."

# Start server in background and keep terminal open
node server.js &
SERVER_PID=$!

# Wait for server to be ready
for i in {1..20}; do
  if curl -s http://localhost:$PORT > /dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

# Open browser
sleep 1
xdg-open "http://localhost:$PORT" || true

msg "Server PID: $SERVER_PID - Running on http://localhost:$PORT"
msg "Press Ctrl+C to stop the server."
echo ""

# Keep script running so terminal stays open
while kill -0 $SERVER_PID 2>/dev/null; do
  sleep 1
done

msg "Server stopped."
