# Connect an AI Agent

How to connect your AI agent to ClawFace's MCP server.

## Supported Agents

| Agent | Directory | How it connects | Workspace needed? |
|-------|-----------|-----------------|-------------------|
| [OpenClaw](openclaw/) | `openclaw/` | mcporter bridge | Yes (included) |
| [Claude Desktop](claude-desktop/) | `claude-desktop/` | Native MCP | No |
| [VS Code](vscode/) | `vscode/` | Extension MCP | No |
| NanoClaw | _coming soon_ | mcporter bridge | Yes |
| NemoClaw | _coming soon_ | mcporter bridge | Yes |
| Hermes Agent | _coming soon_ | TBD | TBD |

> **"Workspace needed?"** — Autonomous agents (OpenClaw, NemoClaw, NanoClaw) benefit from workspace templates for persistent behavior, memory, and tool reference. Agents with native MCP support (Claude Desktop, VS Code) discover tools automatically. Workspace files live inside each agent's directory (e.g., [`openclaw/workspace/`](openclaw/workspace/)).

## Generic Setup

Any MCP client supporting [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) can connect:

```
Endpoint:  http://localhost:3000/mcp
Method:    POST
Transport: Streamable HTTP (stateless)
```

The server exposes 10 tools: `list_schemas`, `get_schema`, `define_schema`, `update_schema`, `delete_schema`, `query_records`, `get_record`, `create_record`, `update_record`, `delete_record`.

### Authentication

When the server runs with `AUTH_MODE=apikey`, MCP clients must send an `Authorization` header:

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

In `apikey` mode, the server resolves the userId from the API key and overrides the `userId` tool argument — preventing one user from accessing another user's data.

When `AUTH_MODE=none` (default), no auth headers are needed and `userId` is passed directly in tool arguments. See [`../server/`](../server/#authentication) for details.

## Adding a New Agent

Create a directory under `agents/<agent-name>/` with:

```
agents/my-agent/
├── mcp.json      # MCP client config for this agent
└── README.md     # Setup instructions specific to this agent
```

See any existing agent directory for reference.
