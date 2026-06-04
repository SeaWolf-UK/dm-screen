#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)"

# If server.js isn't next to us, assume we're the Desktop copy and jump to the project folder
if [ ! -f "$SCRIPT_PATH/server.js" ]; then
    PROJECT="${PROJECT_BASE:-$HOME/Projects/DM_Screen}"
    if [ -f "$PROJECT/server.js" ]; then
        SCRIPT_PATH="$PROJECT"
    else
        echo "ERROR: Cannot find server.js in $SCRIPT_PATH or $PROJECT" >&2
        read -rp "Press ENTER to close..."
        exit 1
    fi
fi

cd "$SCRIPT_PATH"

msg() { echo "[$(date +%H:%M:%S)] $*"; }
error() { msg "ERROR: $*" >&2; }

# ===== Kill any previous DM Cockpit sessions =====
PORT="${PORT:-8765}"

# 1) Kill by port
OLD_PIDS=$(lsof -t -iTCP:$PORT 2>/dev/null || true)
if [ -n "$OLD_PIDS" ]; then
    msg "Stopping old server(s) on port $PORT (PIDs: $OLD_PIDS)..."
    kill $OLD_PIDS 2>/dev/null || true
    sleep 2
    # Force-kill any stragglers
    for pid in $OLD_PIDS; do
        kill -0 $pid 2>/dev/null && kill -9 $pid 2>/dev/null || true
    done
fi

# 2) Also kill any node processes running server.js from this folder
OLD_NODE_PIDS=$(pgrep -f "node.*$SCRIPT_PATH/server\.js" 2>/dev/null || true)
if [ -n "$OLD_NODE_PIDS" ]; then
    msg "Stopping old node server.js processes..."
    kill $OLD_NODE_PIDS 2>/dev/null || true
    sleep 1
    for pid in $OLD_NODE_PIDS; do
        kill -0 $pid 2>/dev/null && kill -9 $pid 2>/dev/null || true
    done
fi

# Wait until port is actually free
for i in {1..10}; do
    if ! lsof -iTCP:$PORT >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done
msg "Port $PORT – OK"

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
    cat > "$CAMPAIGN/party_inventory.json" << 'JSONEOF'
{"items":[{"item":"Potion of Healing","qty":3,"weight":0.5},{"item":"Rope (hempen, 50 ft)","qty":1,"weight":10},{"item":"Adventurer's Pack","qty":4,"weight":7},{"item":"Torch","qty":6,"weight":1},{"item":"Rations (1 day)","qty":10,"weight":2},{"item":"Thieves' Tools","qty":1,"weight":1},{"item":"Scroll of Identify","qty":1,"weight":0}],"currency":{"gp":247,"sp":89,"cp":312}}
JSONEOF
fi
msg "Campaign base – OK"

# -- 5. Launch --
msg "Starting server on port $PORT ..."
msg "Browser will open automatically. Close this window to stop."
echo ""
(sleep 2 && xdg-open "http://localhost:$PORT") &
node server.js
