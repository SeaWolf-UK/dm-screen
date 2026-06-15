# dndbeyond-mcp Setup for DM Cockpit

The Tactical DM Cockpit depends on the **[dndbeyond-mcp](https://github.com/AlexWorland/dndbeyond-mcp)** server to talk to D&D Beyond.

## What is dndbeyond-mcp?

`dndbeyond-mcp` is a TypeScript [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes D&D Beyond characters, campaigns, monsters, spells and items through a local stdio JSON-RPC interface. It uses unofficial, reverse-engineered D&D Beyond endpoints and is **not affiliated with D&D Beyond or Wizards of the Coast**.

- **Repository:** https://github.com/AlexWorland/dndbeyond-mcp
- **Documentation:** https://github.com/AlexWorland/dndbeyond-mcp/blob/main/README.md

## Prerequisites

- A free D&D Beyond account.
- A **Master Tier** subscription is recommended if you want to share purchased books/campaign content with your players.
- Node.js 18+ and `npm`.

## Quick Setup

### Option A: Run directly with npx (no install)

```bash
npx dndbeyond-mcp setup
```

### Option B: Install globally

```bash
npm install -g dndbeyond-mcp
npx dndbeyond-mcp setup
```

The `setup` command opens a browser window where you log in to D&D Beyond normally. It captures your session cookie automatically and saves it to `~/.dndbeyond-mcp/config.json`.

### Option C: Clone and build

```bash
git clone https://github.com/AlexWorland/dndbeyond-mcp.git
cd dndbeyond-mcp
npm install
npm run build
```

## Configure DM Cockpit to find it

The app looks for the MCP at `/home/adrian/dndbeyond-mcp` by default. If you put it somewhere else, set the environment variable before launching:

```bash
export DNDBEYOND_MCP_PATH=/path/to/dndbeyond-mcp
./START_COCKPIT.sh
```

On Windows you can launch via:

```powershell
$env:DNDBEYOND_MCP_PATH = "C:\path\to\dndbeyond-mcp"
node server.js
```

## Claude Desktop / MCP Client (optional)

If you also want to use the MCP in Claude Code or Claude Desktop, add it to `~/.claude/settings.local.json`:

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

## Troubleshooting

### Campaign list is empty

- Run `npx dndbeyond-mcp setup` again to refresh the session cookie.
- Confirm you are logged in to D&D Beyond in the browser that opens.
- Free accounts may see limited campaign data; a **Master Tier** subscription unlocks full campaign sharing.

### MCP fails to start

- Check Node.js: `node --version`
- If you built from source, make sure `npm run build` succeeded.
- Look at the console output from `server.js` for `dndbeyond-mcp stderr` lines.

### D&D Beyond subscription requirements

| Feature | Free account | Hero Tier | Master Tier |
|---------|--------------|-----------|-------------|
| Log in & basic character data | ✅ | ✅ | ✅ |
| Campaign listing | ✅ limited | ✅ | ✅ |
| Full campaign sharing (players see DM's books) | ❌ | ❌ | ✅ |
| Share custom/homebrew content with players | ❌ | ❌ | ✅ |
| Unlimited characters | ❌ (up to 6) | ✅ | ✅ |

Book content itself must be purchased on D&D Beyond separately from the subscription.
