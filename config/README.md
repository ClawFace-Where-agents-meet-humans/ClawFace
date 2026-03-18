# Configuration

This directory contains all configuration templates and references for ClawFace.

## Directory Structure

```
config/
├── README.md               # This file
├── workspace/              # Agent workspace file templates
│   ├── AGENTS.md           # Agent behavior, memory system, safety rules
│   ├── SOUL.md             # Agent identity and core values
│   ├── USER.md             # Template for user profile
│   ├── IDENTITY.md         # Template for agent identity
│   ├── BOOTSTRAP.md        # First-run onboarding flow
│   └── TOOLS.md            # Tool reference (db-mcp calling patterns)
└── examples/               # Per-agent configuration examples
    ├── openclaw/           #   OpenClaw (mcporter-based)
    │   ├── mcp-client.json
    │   └── README.md
    ├── claude-desktop/     #   Claude Desktop (native MCP)
    │   ├── mcp-client.json
    │   └── README.md
    └── vscode/             #   VS Code (Copilot / Claude Code)
        ├── mcp-client.json
        └── README.md
```

---

## 1. MCP Server

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PROVIDER` | Yes | Database backend: `cosmos` (more coming) |
| `COSMOS_CONNECTION_STRING` | Yes (if cosmos) | Azure Cosmos DB connection string |
| `COSMOS_DB_NAME` | Yes (if cosmos) | Cosmos DB database name |
| `PORT` | No | Server port (default: `3000`) |

### Local Development

Copy the example settings file:

```bash
cd packages/mcp-server
cp local.settings.example.json local.settings.json
```

Edit `local.settings.json` with your Cosmos DB credentials:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DB_PROVIDER": "cosmos",
    "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://your-account.documents.azure.com:443/;AccountKey=your-key;",
    "COSMOS_DB_NAME": "your-db-name"
  }
}
```

> **Never commit `local.settings.json`** — it's in `.gitignore`.

### Running the Server

```bash
cd packages/mcp-server
npm run build && npm start
# Server starts on http://localhost:3000
# MCP endpoint: POST /mcp
# REST API:     /api/:userId/schemas/...
# Health:       GET /health
```

---

## 2. Connecting AI Agents

ClawFace's MCP server supports **Streamable HTTP** transport. Point any MCP-compatible client to `http://<host>:<port>/mcp`.

Each agent has its own config directory under `examples/` with a `mcp-client.json` and setup instructions:

| Agent | Directory | Notes |
|-------|-----------|-------|
| [OpenClaw](examples/openclaw/) | `examples/openclaw/` | Uses mcporter bridge, requires workspace files |
| [Claude Desktop](examples/claude-desktop/) | `examples/claude-desktop/` | Native MCP, tools auto-discovered |
| [VS Code](examples/vscode/) | `examples/vscode/` | Copilot / Claude Code extension |
| _NanoClaw_ | `examples/nanoclaw/` | _(coming soon)_ |
| _NemoClaw_ | `examples/nemoclaw/` | _(coming soon)_ |
| _Hermes Agent_ | `examples/hermes-agent/` | _(coming soon)_ |

> **Adding a new agent?** Create a directory under `examples/<agent-name>/` with `mcp-client.json` and `README.md` explaining the agent-specific setup.

### Generic MCP Client

Any client supporting [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) can connect:

```
URL:       http://localhost:3000/mcp
Method:    POST
Transport: Streamable HTTP (stateless)
```

### Remote / Tunneled Access

For agents running in containers or remote environments, expose the server via a tunnel:

```bash
# ngrok
ngrok http 3000

# Then use the tunnel URL
# https://abc123.ngrok-free.app/mcp
```

> **ngrok free tier:** Clients must send `ngrok-skip-browser-warning: true` header to bypass the interstitial page.

---

## 3. React SDK / Demo App

### Provider Configuration

```tsx
import { OpenClawProvider } from "@clawface/react-sdk/react";

<OpenClawProvider
  baseUrl="http://localhost:3000/api"  // REST API base URL
  userId="user-123"                     // User ID for data isolation
  headers={{                            // Optional: extra headers
    "ngrok-skip-browser-warning": "true"
  }}
>
  <App />
</OpenClawProvider>
```

### Demo App

```bash
cd apps/demo
npm run dev
# Opens at http://localhost:5173
```

The demo app prompts for `baseUrl` and `userId` on first load and stores them in localStorage.

---

## 4. Agent Workspace Files

The `config/workspace/` directory contains **templates** for the OpenClaw agent workspace. These files define how an AI agent behaves, remembers, and interacts with users.

### How to Use

Copy the workspace templates into your agent's workspace directory:

```bash
# For OpenClaw containers
cp -r config/workspace/* /path/to/.openclaw/workspace/

# For local development
cp -r config/workspace/* data/.openclaw/workspace/
```

### File Reference

| File | Purpose | When to Edit |
|------|---------|-------------|
| `AGENTS.md` | Agent behavior rules, memory system, safety guidelines, group chat etiquette, heartbeat configuration | Customize for your deployment's needs |
| `SOUL.md` | Core identity and values — who the agent is | Agent evolves this over time |
| `USER.md` | User profile template — name, timezone, preferences | Agent fills in during conversations |
| `IDENTITY.md` | Agent identity — name, creature type, vibe, avatar | Agent fills in during first conversation |
| `BOOTSTRAP.md` | First-run onboarding flow — agent introduces itself, learns about the user | Delete after first conversation |
| `TOOLS.md` | Tool reference — db-mcp calling patterns, schema metadata rules, type compatibility | Update when adding new tools/MCP servers |

### Memory System

The workspace uses a two-tier memory system:

```
workspace/
├── MEMORY.md              # Long-term curated memory (main sessions only)
└── memory/
    ├── YYYY-MM-DD.md      # Daily raw logs
    └── heartbeat-state.json  # Heartbeat check timestamps
```

- **MEMORY.md** — Only loaded in main (private) sessions for security. Contains curated insights.
- **Daily files** — Raw session logs. Agent periodically distills these into MEMORY.md.

### Database vs Memory

| | Memory Files | Structured Database (db-mcp) |
|---|---|---|
| **Who sees it** | Agent only | Agent + User (via UI) |
| **What goes in** | Session context, lessons, observations | Contacts, tasks, expenses, structured data |
| **Format** | Markdown files | Schema-validated records |
| **Queried by** | File reads | `query_records` with filters |

---

## 5. Container Configuration (Docker)

For self-hosted OpenClaw containers with db-mcp:

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_MCP_URL` | ClawFace server URL (e.g., `https://your-server.com`) |

### Auto-Registration

The container's `start.sh` automatically:
1. Installs mcporter as an OpenClaw skill
2. Writes MCP config to both paths OpenClaw reads:
   - `~/.openclaw/workspace/config/mcporter.json`
   - `~/.mcporter/mcporter.json`
3. Copies workspace templates (TOOLS.md, etc.) if not already present

```bash
# Docker run with db-mcp
docker run -e DB_MCP_URL=https://your-server.com your-openclaw-image
```

---

## 6. Database Providers

ClawFace uses a pluggable `DbProvider` interface. Currently supported:

### Azure Cosmos DB

```
DB_PROVIDER=cosmos
COSMOS_CONNECTION_STRING=AccountEndpoint=https://...;AccountKey=...;
COSMOS_DB_NAME=clawface
```

Creates two containers automatically:
- `schemas` — Schema definitions (partitioned by userId)
- `records` — Data records (partitioned by userId)

### Adding a New Provider

Implement the `DbProvider` interface from `packages/mcp-server/src/types.ts` and register it in `packages/mcp-server/src/provider/factory.ts`. See `cosmos-provider.ts` for reference.
