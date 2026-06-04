#!/usr/bin/env bash
set -euo pipefail

# ── resolve project path ──────────────────
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_PATH"

# ── helpers ───────────────────────────────
msg() { echo "[$(date +%H:%M:%S)] $*"; }
error() { msg "ERROR: $*" >&2; }

# ── 1. Node.js ────────────────────────────
if ! command -v node &>/dev/null; then
    msg "Node.js is missing. Attempting auto-install..."

    if command -v apt-get &>/dev/null; then
        # try graphical sudo first, then terminal sudo
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

# ── 2. server.js syntax check ─────────────
node --check server.js || {
    error "server.js has syntax errors. Aborting."
    read -rp "Press ENTER to close..."
    exit 1
}
msg "server.js – OK"

# ── 3. dndbeyond-mcp warning ────────────
MCP="${DNDBEYOND_MCP_PATH:-/home/adrian/dndbeyond-mcp}"
[ ! -e "$MCP" ] && msg "WARN: dndbeyond-mcp not found at $MCP (campaign list will be empty)"

# ── 4. campaign scaffold ─────────────────
CAMPAIGN="${CAMPAIGN_BASE:-$SCRIPT_PATH/campaign}"
mkdir -p "$CAMPAIGN"/{Bestiary,Factions,NPCs,Locations}
[ ! -f "$CAMPAIGN/party_inventory.json" ] && cat > "$CAMPAIGN/party_inventory.json" << 'INVENTORY'
{"items":[{"item":"Potion of Healing","qty":3,"weight":0.5},{"item":"Rope (hempen, 50 ft)","qty":1,"weight":10},{"item":"Adventurer's Pack","qty":4,"weight":7},{"item":"Torch","qty":6,"weight":1},{"item":"Rations (1 day)","qty":10,"weight":2},{"item":"Thieves' Tools","qty":1,"weight":1},{"item":"Scroll of Identify","qty":1,"weight":0}],"currency":{"gp":247,"sp":89,"cp":312}}
INVENTORY
msg "Campaign base – OK"

# ── 5. Launch ─────────────────────────────
PORT="${PORT:-8765}"
msg "Starting server on port $PORT ..."
msg "The browser will open automatically once ready."
msg "Close this window to stop the server."
echo ""

# open browser after a short delay so the server is listening
(sleep 2 && xdg-open "http://localhost:$PORT") &

node server.js
