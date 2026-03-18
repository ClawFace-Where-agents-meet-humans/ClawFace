# Claude Desktop Configuration

[Claude Desktop](https://claude.ai/download) has native MCP support via Streamable HTTP.

## MCP Client Config

Merge `mcp-client.json` into your Claude Desktop config:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```bash
# macOS
cat mcp-client.json
# Copy the mcpServers block into your existing config
```

Claude Desktop discovers tools automatically — no workspace files needed. The MCP server's tool descriptions include schema metadata rules, type compatibility, and usage instructions.
