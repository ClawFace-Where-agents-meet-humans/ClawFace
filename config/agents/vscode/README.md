# VS Code

VS Code supports MCP servers via the Copilot and Claude Code extensions.

## Setup

Copy `mcp.json` into your project's `.vscode/` directory:

```bash
mkdir -p .vscode
cp mcp.json .vscode/mcp.json
```

Or add the `clawface` entry to your existing `.vscode/mcp.json`.

Edit the `url` to point to your ClawFace server.

## Authentication

When the server runs with `AUTH_MODE=apikey`, add the authorization header:

```json
{
  "servers": {
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

Tools are auto-discovered from the MCP server's tool descriptions — no additional setup needed.
