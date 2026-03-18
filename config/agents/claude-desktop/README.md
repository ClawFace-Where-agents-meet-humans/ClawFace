# Claude Desktop

[Claude Desktop](https://claude.ai/download) has native MCP support — no bridge or workspace files needed.

## Setup

Merge `mcp.json` into your Claude Desktop config:

| OS | Config path |
|----|-------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

```bash
# macOS — view what to add
cat mcp.json
# Add the "clawface" entry to your existing mcpServers block
```

Edit the `url` to point to your ClawFace server.

## Authentication

When the server runs with `AUTH_MODE=apikey`, add the authorization header:

```json
{
  "mcpServers": {
    "clawface": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer cf_your-api-key-here"
      }
    }
  }
}
```

When `AUTH_MODE=none` (default), no auth header is needed.

## How it works

Claude Desktop discovers all 10 ClawFace tools automatically from the MCP server's tool descriptions. The tool descriptions include schema metadata rules, type compatibility, and usage instructions — no workspace files needed.
