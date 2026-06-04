# DM Screen

A D&D 5.5e encounter calculator, combat tracker, and soundboard tool for Dungeon Masters.

## Features

- **Encounter Calculator**: Calculate encounter difficulty using DMG guidelines
- **Combat Tracker**: Manage initiative, hit points, and combat status
- **Soundboard**: Background music and sound effects for sessions
- **Adventure Integration**: Parse adventure modules to extract encounters
- **Creature Library**: Manage and save creatures with full stat blocks

## Installation

### Prerequisites

- Node.js (v16 or higher)
- dndbeyond-mcp server (required for D&D Beyond creature lookup)

### Setup

1. Clone or copy this repository to your local machine

2. Install dndbeyond-mcp (if not already installed):
   ```bash
   npm install -g dndbeyond-mcp
   ```

3. Start the DM Screen server:
   ```bash
   ./server.js
   ```

4. Open your browser to `http://localhost:8765`

### Running

Just run `./server.js` and open `http://localhost:8765` in your browser.

## Usage

1. **Load an Adventure**: Click "Load Adventure File" and select a `.md` file
2. **Create Encounters**: Encounters are auto-extracted from adventure files
3. **Build Combat**: Select creatures to add to your encounter pool
4. **Manage Combat**: Track initiative, HP, and apply effects

## Configuration

The server reads configuration from `~/.claude/settings.local.json` for dndbeyond-mcp integration.

## Troubleshooting

- **Creatures not loading**: Ensure dndbeyond-mcp is running and accessible
- **Encounter parsing issues**: Check that adventure files are in proper markdown format

## License

MIT
