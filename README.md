# DM Screen - Tactical DM Cockpit

A comprehensive Dungeon Master's screen for managing D&D 5e campaigns with real-time integration to D&D Beyond.

## Overview

The Tactical DM Cockpit provides a unified interface for managing:
- **Character Tracking** - Real-time party telemetry from D&D Beyond
- **Encounter Builder** - Build and run combat encounters with bestiary integration
- **Lore Management** - Browse campaign wiki and documentation
- **Adventure Processing** - AI-powered extraction of encounters from adventure text

## Requirements

### Required Dependencies

1. **D&D Beyond MCP** - The application requires the dndbeyond-mcp server from:
   - **Repository:** https://github.com/AlexWorland/dndbeyond-mcp
   - **Installation:** Follow the setup instructions in that repository
   - **Path:** By default expects `/home/adrian/dndbeyond-mcp`

2. **D&D Beyond Account** - A valid D&D Beyond account is required:
   - Used for authenticating with D&D Beyond's API
   - Campaign access requires appropriate D&D Beyond subscriptions

3. **Node.js** - Version 18 or higher
   - Required for running the local server
   - The startup script will attempt to auto-install if missing

## Installation

1. **Clone or download** this repository

2. **Install D&D Beyond MCP:**
   ```bash
   git clone https://github.com/AlexWorland/dndbeyond-mcp.git
   cd dndbeyond-mcp
   # Follow the MCP's installation instructions
   ```

3. **Configure the DM Screen:**
   - The app will auto-detect the dndbeyond-mcp location
   - Alternatively, set the `DNDBEYOND_MCP_PATH` environment variable:
     ```bash
     export DNDBEYOND_MCP_PATH=/path/to/dndbeyond-mcp
     ```

## Usage

### Starting the Application

**Via Desktop Shortcut:**
- Double-click "Start DM Cockpit.desktop" on your desktop
- This launches the server and opens your default browser

**Via Command Line:**
```bash
cd /path/to/DM_Screen
./START_COCKPIT.sh
```

The application will:
1. Check for and install Node.js if missing
2. Verify dndbeyond-mcp is available
3. Start the server on port 8765 (configurable via PORT environment variable)
4. Open your default browser automatically

### Initial Setup

On first launch, you'll see the **Splash Screen**:

1. **Select Campaign** - Choose your D&D Beyond campaign from the dropdown
2. **Choose AI Provider** - Select your preferred AI service:
   - ollama_local
   - ollama_cloud
   - openai
   - claude
   - openrouter
3. **Enter API Details** - Provide endpoint URL and API key for your chosen provider
4. **Click "CONFIRM & INITIALIZE COCKPIT"**

### Workspaces

Once initialized, use the workspace tabs at the top:

#### F1 - Characters Workspace
- View real-time party telemetry (refreshes every 60 seconds)
- Character cards show: HP, AC, spell slots, conditions
- Click any character for detailed stats (saving throws, skills, features)
- Manage shared inventory and currency

#### F2 - Encounters Workspace
**Staging Mode:**
- **Monster Database Search:**
  - Search by name
  - Filter by CR (Challenge Rating)
  - Filter by Environment (Arctic, Forest, Urban, etc.)
  - Filter by Source Book (Monster Manual, Volo's Guide, etc.)
  - Click ↻ to refresh the book list from D&D Beyond
- Add monsters to the encounter pool
- Select party members for difficulty calculation
- View encounter difficulty (Easy, Medium, Hard, Deadly)
- **Random Encounter Generator:** Select terrain and CR range, then click 🎲 ROLL

**Engagement Mode:**
- Initiative ladder with turn tracking
- HP tracking with damage/heal controls
- Quick-reference stat blocks
- Condition tracking

#### F3 - Lore Workspace
- Browse campaign documentation
- Navigate Bestiary, Factions, NPCs, Locations folders
- View markdown files with live rendering

#### F4 - Adventures Workspace
- Upload adventure markdown files
- AI-powered extraction of encounters from narrative text
- View extracted timeline and player handouts
- Copy handouts to clipboard for sharing

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8765 |
| `CAMPAIGN_BASE` | Path to campaign data | `./campaign` |
| `DNDBEYOND_MCP_PATH` | Path to dndbeyond-mcp | `/home/adrian/dndbeyond-mcp` |

### Campaign Data Structure

The app expects this folder structure in your campaign directory:
```
campaign/
├── Bestiary/         # Monster stat blocks
├── Factions/         # Organization lore
├── NPCs/             # Character profiles
├── Locations/        # Place descriptions
└── party_inventory.json
```

## Troubleshooting

### "Cannot connect to dndbeyond-mcp"
- Verify the dndbeyond-mcp is installed and running
- Check the `DNDBEYOND_MCP_PATH` environment variable
- Ensure your D&D Beyond credentials are valid

### "Campaign list is empty"
- Verify your D&D Beyond account has access to campaigns
- Check that you're logged into D&D Beyond in your browser
- Ensure the dndbeyond-mcp server is running

### "Monster search returns no results"
- Check your dndbeyond-mcp connection
- Try broader search terms
- Verify filters (CR, Environment, Source) aren't too restrictive

### Application won't start
- Check Node.js is installed: `node --version`
- Verify port 8765 isn't in use: `lsof -i :8765`
- Check the server logs for errors

## Security Notes

- API keys are stored encrypted locally in `~/.dm-cockpit/config.json`
- D&D Beyond credentials are handled by the dndbeyond-mcp
- The application runs locally - no data is sent to external servers except via your configured AI provider and D&D Beyond

## Credits

- **D&D Beyond MCP:** https://github.com/AlexWorland/dndbeyond-mcp
- **D&D Beyond:** https://www.dndbeyond.com
- **Built with:** Node.js, vanilla HTML/JS, D&D Beyond API

## License

This project is for personal use with your own D&D Beyond campaigns.

---

**Note:** This application is not affiliated with or endorsed by D&D Beyond or Wizards of the Coast. D&D Beyond is a trademark of Fandom, Inc.
