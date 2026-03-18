# VS Code Configuration

VS Code supports MCP servers via Copilot and Claude Code extensions.

## MCP Client Config

Copy `mcp-client.json` to your project's `.vscode/` directory:

```bash
mkdir -p .vscode
cp mcp-client.json .vscode/mcp.json
```

Or add to your user-level settings for global access.

Tools are discovered automatically from the MCP server's tool descriptions.
