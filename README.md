# Tactical DM Cockpit

A self-contained, browser-based Dungeon Master's screen for running D&D 5e campaigns with real-time D&D Beyond party telemetry, an AI-orchestrated encounter builder, campaign lore management, and an integrated TTRPG soundboard.

The app is a single-file frontend (`index.html`) plus a local Node.js server (`server.js`). It runs entirely on your own machine and communicates with D&D Beyond through the [dndbeyond-mcp](https://github.com/AlexWorland/dndbeyond-mcp) server.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Requirements](#requirements)
- [Installation](#installation)
- [First Launch / Initial Setup](#first-launch--initial-setup)
- [Workspaces](#workspaces)
- [Soundboard Integration](#soundboard-integration)
- [Configuration](#configuration)
- [File Layout](#file-layout)
- [Troubleshooting](#troubleshooting)
- [Security & Privacy](#security--privacy)
- [Credits & License](#credits--license)

---

## What It Does

The Tactical DM Cockpit consolidates everything a DM needs for a live session into a single local web app.

| Workspace | Purpose |
|-----------|---------|
| **F1 – Characters** | Real-time party telemetry from D&D Beyond: HP, AC, spell slots, conditions, inventory, currency. Refreshes every 60 seconds. |
| **F2 – Encounters** | Search the D&D Beyond monster database by name, CR, environment and source book; build encounters; calculate difficulty; run initiative-based combat with HP/damage/condition tracking. |
| **F3 – Lore** | Browse local campaign markdown files: Bestiary, Factions, NPCs, Locations. |
| **F4 – Adventures** | Upload adventure markdown and use AI to extract encounters, timeline beats, and player handouts. |
| **F5 – Soundboard** | Integrated TTRPG Soundboard for layered ambiance, one-shot sound effects, saved scenes, and AI-generated soundscapes. |

Key capabilities:

- **D&D Beyond integration** — pull campaign, party, character and monster data via `dndbeyond-mcp`.
- **AI orchestration** — supports Ollama (local/cloud), OpenAI, Anthropic Claude, OpenRouter and Google Gemini for adventure parsing, encounter building and soundscape prompts.
- **Encounter builder** — stage monsters, select party members, view difficulty (Easy / Medium / Hard / Deadly), then run turn-based combat.
- **Random encounter generator** — roll encounters by terrain and CR range.
- **Integrated soundboard** — embeds the full TTRPG Soundboard on F5. The encounter-builder 🎵 button sends a descriptive prompt to the soundboard's AI Scene Generator and switches to F5.
- **Campaign vault** — local markdown lore and a shared `party_inventory.json` ledger.
- **Session management** — the **↩ SESSION** button returns you to the splash screen to switch campaigns or AI providers without restarting the server.

---

## Requirements

### Mandatory

1. **Node.js 18+** — for running `server.js`.
2. **A D&D Beyond account** — the app authenticates through D&D Beyond's unofficial API endpoints.
3. **[dndbeyond-mcp](https://github.com/AlexWorland/dndbeyond-mcp)** — a local Model Context Protocol server that proxies D&D Beyond requests.

### D&D Beyond Subscription

- A **free D&D Beyond account** is sufficient to log in and use basic character/campaign data.
- **Campaign content sharing** (so the whole party can access books the DM owns) requires a **Master Tier** subscription.
- Book content (monsters, spells, magic items) must be purchased separately on D&D Beyond; the subscription tiers only unlock sharing and convenience features.

### AI Provider (optional but recommended)

Choose one provider on the splash screen:

| Provider | Endpoint example | Notes |
|----------|------------------|-------|
| `ollama_local` | `http://localhost:11434/v1/chat/completions` | Free; runs on your own hardware. |
| `ollama_cloud` | your Ollama Cloud URL | Remote Ollama instance. |
| `openai` | `https://api.openai.com/v1/chat/completions` | Requires OpenAI API key and account credit. |
| `claude` | `https://api.anthropic.com/v1/messages` | Requires Anthropic API key. |
| `openrouter` | `https://openrouter.ai/api/v1/chat/completions` | Aggregates many models. |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent` | Google Gemini API. |

The AI provider is used for adventure parsing, random encounter flavor, and soundscape prompt generation. Without an AI provider, the app still runs encounters and the soundboard, but AI-assisted features will not work.

---

## Installation

### 1. Get this repository

```bash
git clone https://github.com/SeaWolf-UK/dm-screen.git
cd dm-screen
```

### 2. Install Node.js

Ubuntu / Debian:

```bash
sudo apt-get install -y nodejs npm
```

macOS:

```bash
brew install node
```

Verify:

```bash
node --version   # should be v18 or higher
```

### 3. Install and configure dndbeyond-mcp

```bash
# Option A: run directly with npx (no install)
npx dndbeyond-mcp setup

# Option B: install globally
npm install -g dndbeyond-mcp
npx dndbeyond-mcp setup
```

The `setup` command opens a browser, lets you log in to D&D Beyond, and saves your session cookie to `~/.dndbeyond-mcp/config.json`.

> **Documentation:** https://github.com/AlexWorland/dndbeyond-mcp/blob/main/README.md  
> The app expects the MCP at `/home/adrian/dndbeyond-mcp` by default. If you cloned it elsewhere, set `DNDBEYOND_MCP_PATH` (see [Configuration](#configuration)).

### 4. (Optional) Build the MCP

If you cloned `dndbeyond-mcp` from source:

```bash
cd /home/adrian/dndbeyond-mcp
npm install
npm run build
```

---

## First Launch / Initial Setup

### Start the server

**From the project directory:**

```bash
./START_COCKPIT.sh
```

Or on systems with the older launcher:

```bash
./Launch.sh
```

The script will:

1. Check Node.js.
2. Validate `server.js` syntax.
3. Warn if `dndbeyond-mcp` is missing.
4. Create the `campaign/` folder scaffold if needed.
5. Start the server on port `8765`.
6. Open your default browser to `http://localhost:8765`.

**Via desktop shortcut:** double-click **▶ Start DM Cockpit** (or **Launch DM Cockpit**).

### Splash screen

On first launch you will see the splash screen:

1. **Select Campaign** — choose a D&D Beyond campaign from the dropdown.
2. **Choose AI Provider** — pick one of the supported providers.
3. **Enter Endpoint URL** and **API Key** (key is optional for Ollama).
4. Click **[ CONFIRM & INITIALIZE COCKPIT ]**.

The app then hides the splash screen and loads the workspaces. Use the **↩ SESSION** button at any time to return to the splash screen and switch campaigns or providers.

---

## Workspaces

### F1 — Characters

- Real-time party telemetry refreshed every 60 seconds.
- Character cards show HP bar, AC, spell-slot checkboxes, conditions.
- Click a card to view saving throws, skills, equipped items and passive senses.
- Shared **Party Inventory & Currency Ledger** reads/writes `campaign/party_inventory.json`.

### F2 — Encounters

**Staging mode:**

- Search the D&D Beyond monster database by name.
- Filter by CR, Environment, and Source Book.
- Add monsters to the encounter pool and adjust quantity.
- Select party members for difficulty calculation.
- View encounter difficulty: Easy / Medium / Hard / Deadly.
- **Random Encounter Generator** — choose terrain and CR range, then click **🎲 ROLL**.

**Engagement mode:**

- Click **[ INITIALIZE ENGAGEMENT MODE ]** to build an initiative ladder.
- Track turns, HP, damage, healing and conditions.
- Quick-ref stat block loads automatically for the active creature.

**Soundscape button:** every saved encounter has a **🎵** button. Clicking it sends a descriptive prompt to the F5 soundboard and switches to F5.

### F3 — Lore

- Navigate the campaign vault: `Bestiary/`, `Factions/`, `NPCs/`, `Locations/`.
- Click any markdown file to render it in the viewer.
- Put your own lore files in `campaign/` and they appear here.

### F4 — Adventures

- Upload an adventure markdown file.
- AI extracts encounters, timeline beats, truth matrix and player handouts.
- Copy handouts to the clipboard with one click.

### F5 — Soundboard

The TTRPG Soundboard is embedded inline via an iframe pointing to `/soundboard`.

- **Audio Library** — import local audio files or folders (dragged/dropped or via file picker).
- **Ambiance Mixer** — layer looping tracks with volume, pitch, solo and mute.
- **FX Deck** — 12 one-shot slots with hotkeys F1–F12.
- **AI Scene Generator** — generate a soundscape from a text prompt using the configured AI provider and the files in your library.
- **Saved Scenes / Playlists / Decks** — save and load complete setups.

When the DM Cockpit sends a prompt to the soundboard, the soundboard automatically enables **Advanced Mode** so the AI Scene Generator section is visible and the prompt is pre-filled.

---

## Soundboard Integration

The soundboard no longer opens in a separate window. It is loaded as an iframe on F5.

How the prompt bridge works:

1. `index.html` defines `sendToSoundboard(enc)`, which builds a prompt from the encounter name, environment, monsters and description.
2. The prompt is sent through:
   - `BroadcastChannel('dm-cockpit-soundboard')` — reaches the iframe and any other same-origin soundboard tabs.
   - `window.postMessage` — fallback for manually opened tabs.
3. `activatePage(5)` switches the cockpit to the F5 workspace.
4. `soundboard.html` listens for `DM_COCKPIT_SET_PROMPT`, enables advanced mode, sets the AI prompt, and scrolls the AI Scene Generator into view.

The server route `/soundboard` sets `X-Frame-Options: SAMEORIGIN` so the iframe can load.

---

## Configuration

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port for the app | `8765` |
| `CAMPAIGN_BASE` | Path to the campaign data directory | `./campaign` |
| `DNDBEYOND_MCP_PATH` | Path to the `dndbeyond-mcp` checkout | `/home/adrian/dndbeyond-mcp` |

Example:

```bash
PORT=8080 DNDBEYOND_MCP_PATH=/opt/dndbeyond-mcp ./START_COCKPIT.sh
```

### Campaign data layout

```
campaign/
├── Bestiary/            # Markdown stat blocks
├── Factions/            # Organization lore
├── NPCs/                # Character profiles
├── Locations/           # Place descriptions
└── party_inventory.json # Shared inventory & currency
```

The launcher creates this scaffold automatically.

---

## File Layout

| File | Purpose |
|------|---------|
| `index.html` | Single-page DM Cockpit frontend. |
| `server.js` | Local Node.js server: static files, MCP proxy, AI proxy, file API. |
| `soundboard.html` | Self-contained TTRPG Soundboard (React + Tailwind + IndexedDB). |
| `START_COCKPIT.sh` | Recommended launcher; validates Node, scaffold and opens browser. |
| `Launch.sh` | Alternative launcher that kills any previous server first. |
| `Start DM Cockpit.desktop` | Desktop shortcut for the network-share version. |
| `Launch DM Cockpit.desktop` | Desktop shortcut for the local git clone. |
| `dndbeyond-mcp-README.md` | Quick setup notes for the dndbeyond-mcp dependency. |
| `PRD.md` | Original product requirements / design notes. |
| `config/shared.js` | Shared constants (XP tables, AI provider defaults, environment monsters). |
| `lib/helpers.js` | Backend helper utilities used by `server.js`. |

---

## Troubleshooting

### "Cannot connect to dndbeyond-mcp" / campaign list is empty

- Run `npx dndbeyond-mcp setup` and log in to D&D Beyond.
- Verify `~/.dndbeyond-mcp/config.json` exists.
- Make sure `DNDBEYOND_MCP_PATH` points to the MCP directory.
- A D&D Beyond **Master Tier** subscription is required for full campaign sharing; free accounts may see limited data.

### Monster search returns no results

- Confirm `dndbeyond-mcp` is running and authenticated.
- Try broader search terms or remove filters.
- Some source books may not be included in your D&D Beyond library.

### AI features do not respond

- Check that the splash screen AI provider, endpoint and key are correct.
- For Ollama, ensure the requested model is pulled: `ollama pull <model>`.
- Verify the endpoint URL matches the provider's API format (OpenAI/Claude/OpenRouter all use different paths).

### Soundboard iframe does not load

- Make sure you are accessing the app through `http://localhost:8765` (or your configured `PORT`).
- The `/soundboard` route must be served from the same origin; `X-Frame-Options: SAMEORIGIN` is set by `server.js`.

### Application won't start

- `node --version` should be v18 or higher.
- Check port `8765` is free: `lsof -i :8765`.
- Run `node --check server.js` for syntax errors.

---

## Security & Privacy

- The app runs entirely locally. No data is sent to external servers except:
  - D&D Beyond API requests (via `dndbeyond-mcp`).
  - AI provider requests (only the provider you configured).
- API keys are stored **encrypted** in `~/.dm-cockpit/config.json`.
- D&D Beyond credentials are handled by `dndbeyond-mcp`; this app never sees your password.
- Do not expose port `8765` to the public internet; the app is designed for localhost use.

---

## Credits & License

- **D&D Beyond MCP:** https://github.com/AlexWorland/dndbeyond-mcp
- **D&D Beyond:** https://www.dndbeyond.com
- **Built with:** Node.js, vanilla HTML/JS, React (inside `soundboard.html`), Tailwind CSS, IndexedDB.

This project is for personal use with your own D&D Beyond campaigns.

**Disclaimer:** This application is not affiliated with or endorsed by D&D Beyond or Wizards of the Coast. D&D Beyond is a trademark of Fandom, Inc.
