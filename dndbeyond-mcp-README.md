# DM Screen - dndbeyond-mcp Integration

This project requires the [dndbeyond-mcp](https://github.com/anthropics/dndbeyond-mcp) server for D&D Beyond creature lookups.

## Setup Instructions

1. **Install dndbeyond-mcp**:
   ```bash
   npm install -g dndbeyond-mcp
   ```

2. **Configure dndbeyond-mcp**:
   
   Create or update your Claude settings file at `~/.claude/settings.local.json` with:
   ```json
   {
     "mcpServers": [
       {
         "command": "npx",
         "args": ["-y", "dndbeyond-mcp"]
       }
     ]
   }
   ```

3. **Restart the server** after configuration.

## Requirements

- dndbeyond-mcp must be running for full creature lookup functionality
- Without it, the app can still parse adventure files but won't resolve D&D Beyond creatures
