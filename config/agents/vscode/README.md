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

## How it works

Tools are auto-discovered from the MCP server's tool descriptions — no additional setup needed.
