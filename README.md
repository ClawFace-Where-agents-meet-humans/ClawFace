<p align="center">
  <img src="assets/logo.png" width="120" alt="ClawFace logo" />
</p>

<h1 align="center">ClawFace</h1>

<p align="center">
  <strong>The missing UI layer for AI agents.</strong><br/>
  Agents define schemas via MCP. ClawFace auto-generates the interface. Humans see their data.
</p>

<p align="center">
  <a href="https://github.com/ClawFace-Where-agents-meet-humans/ClawFace"><img src="https://img.shields.io/badge/repo-GitHub-181717?style=flat-square&logo=github" alt="Repository"></a>
  <a href="https://github.com/ClawFace-Where-agents-meet-humans/ClawFace/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License"></a>
  <a href="https://www.npmjs.com/package/@clawface/react-sdk"><img src="https://img.shields.io/badge/react--sdk-workspace%20package-61DAFB?style=flat-square&logo=react&logoColor=000000" alt="React SDK"></a>
  <a href="https://github.com/ClawFace-Where-agents-meet-humans/ClawFace"><img src="https://img.shields.io/github/stars/ClawFace-Where-agents-meet-humans/ClawFace?style=flat-square" alt="Stars"></a>
 <!-- <a href="https://discord.gg/clawface"><img src="https://img.shields.io/badge/discord-join%20chat-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a> -->
</p>

<p align="center">
  <a href="https://clawface.io">Website</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <!-- <a href="https://docs.clawface.io">Docs</a> · -->
  <a href="#configuration">Configuration</a> ·
  <!-- <a href="https://discord.gg/clawface">Discord</a> · -->
  <a href="https://x.com/ClawFaceAI">𝕏</a>
</p>

<br/>

<p align="center">
  <img src="https://clawface.io/demo.gif" width="720" alt="ClawFace demo — agent creates schema, UI auto-generates" />
</p>

---

## Why ClawFace?

AI agents collect and process data autonomously — but **humans have no way to see it**. No dashboard. No forms. No visibility. Data stays buried in chat history or agent memory.

**ClawFace fixes this.** An agent defines a schema, stores records via MCP, and ClawFace auto-generates a full CRUD interface — forms, tables, detail views — so humans can browse, verify, and manage everything their agents store.

```
  AI Agent                    ClawFace                     Human
  ────────                    ────────                     ─────
  define_schema("contacts")
  create_record({...})   ──▶  MCP Server  ◀──  React SDK  ──▶  Auto-generated UI
  query_records(...)          (validates)      (renders)        (browse, edit, manage)
```

**One schema. Two interfaces.** The agent writes data. The human sees it. Neither needs to know about the other.

---

## Quick Start

### 1. Start the server

```bash
git clone https://github.com/AiClawFace/clawface.git
cd clawface
npm install && npm run build

cd packages/mcp-server
cp local.settings.example.json local.settings.json
# Edit local.settings.json with your Cosmos DB credentials
npm start
```

Server runs at `http://localhost:3000` with MCP (`/mcp`) + REST (`/api`) + health (`/health`).

### 2. Connect your agent

Add to your MCP client config:

```json
{
  "mcpServers": {
    "clawface": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

The agent discovers 9 tools automatically: `define_schema`, `create_record`, `query_records`, etc.

> See [config/agents/](config/agents/) for agent-specific configs (Claude Desktop, VS Code, OpenClaw, and more).

### 3. Add the React UI

```tsx
import { OpenClawProvider, useSchemas, useRecords } from "@clawface/react-sdk/react";

function App() {
  return (
    // Dev mode (AUTH_MODE=none): pass userId directly
    <OpenClawProvider baseUrl="http://localhost:3000/api" userId="user-123">
      <MyDashboard />
    </OpenClawProvider>

    // Production (AUTH_MODE=apikey): pass API key instead
    // <OpenClawProvider baseUrl="https://api.clawface.io/api" apiKey="cf_abc123...">
    //   <MyDashboard />
    // </OpenClawProvider>
  );
}
```

That's it. Agent stores data, human sees it.

---

## Features

### Schema-as-Contract

One schema definition drives everything — agent validation, UI generation, and cross-agent portability:

```json
{
  "fields": {
    "name":     { "type": "string", "required": true, "label": "Full Name" },
    "priority": { "type": "string", "inputType": "select", "options": ["low", "medium", "high"] },
    "notes":    { "type": "string", "inputType": "textarea" }
  },
  "purpose": "Track sales contacts for CRM pipeline",
  "instructions": "Create a record when user mentions a new contact."
}
```

### Agent-Portable Metadata

Schemas are self-documenting. Switch agents — the new one reads `purpose` + `instructions` and knows exactly what to do.

| Field | What it tells a new agent |
|-------|--------------------------|
| `purpose` | **Why** this schema exists — *"Track daily expenses"* |
| `instructions` | **How** to use it — *"Create a record when user reports spending"* |
| `examples` | Sample records showing expected data shape |
| `tags` | Discovery & categorization — `["finance", "personal"]` |
| `createdBy` | Origin tracking — `"openclaw"`, `"user:mohit"` |

### Auto-Generated UI

The React SDK renders the right component for every field type — no manual wiring:

| Type | Input Types | UI Renders As |
|------|-------------|---------------|
| `string` | `text`, `textarea`, `select` | Text input, multiline, or dropdown |
| `number` | `number` | Numeric input |
| `boolean` | `toggle` | Switch/toggle |
| `date` | `date` | Date picker |
| `array` | `list` | Dynamic add/remove list |
| `object` | `group` | Nested field group |

### Dual Protocol

Agents talk MCP. Browsers talk REST. Same server, same data, same validation.

| Protocol | For | Endpoint |
|----------|-----|----------|
| **MCP** (Streamable HTTP) | AI agents | `POST /mcp` |
| **REST** | React SDK / any HTTP client | `/api/:userId/...` |

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │              ClawFace Server                  │
  AI Agent ────────▶│                                              │
                    │  POST /mcp ──▶ MCP Tools ──┐                │
                    │                             ▼                │
                    │                        DbProvider            │
                    │                        (Cosmos DB)           │
                    │                             ▲                │
                    │  /api/:userId ─▶ REST API ──┘                │
  React App ───────▶│                                              │
                    └──────────────────────────────────────────────┘
```

**Design decisions:**
- **Stateless MCP** — each request creates a fresh server instance, shares a connection pool
- **Pluggable DB** — `DbProvider` interface; Cosmos DB today, Postgres/SQLite/DynamoDB next
- **Strict validation** — type mismatches rejected server-side, errors include `hint` for agents
- **Zero lock-in** — schemas are self-documenting; switch agents or databases without losing context

---

## Project Structure

```
packages/
├── shared/          Zero-dependency types, validation, constants
├── mcp-server/      MCP + REST server (Express, Cosmos DB)
└── react-sdk/       React components + hooks
    ├── core/          Framework-agnostic API client
    └── react/         Provider, hooks, field registry, components

apps/
└── demo/            Example app (Vite + shadcn/ui + Tailwind)

config/
├── server/          Server setup (env vars, database, deployment)
└── agents/          Per-agent setup (MCP config, workspace templates)
    ├── openclaw/      MCP config + workspace (behavior, memory, tools)
    ├── claude-desktop/
    └── vscode/
```

<details>
<summary><strong>Packages in detail</strong></summary>

### `@clawface/shared`

Core types and validation shared between server and client. Zero runtime dependencies.

- `FieldDef`, `SchemaResponse`, `RecordResponse` — the type system
- `QueryFilter`, `QueryOptions` — filtering + pagination
- `validateRecordData`, `normalizeSchemaInput` — shared validation logic

### `@clawface/mcp-server`

Dual-protocol server: MCP for agents, REST for UIs.

**MCP Tools (9):**

| Tool | Description |
|------|-------------|
| `list_schemas` | List all schemas for a user |
| `get_schema` | Get full schema definition |
| `define_schema` | Create a new schema |
| `update_schema` | Update schema definition |
| `delete_schema` | Delete schema (optionally with data) |
| `query_records` | Filter, sort, paginate records |
| `get_record` | Get single record by ID |
| `create_record` | Create a new record |
| `update_record` | Update existing record |
| `delete_record` | Delete a record |

**REST API:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/:userId/schemas` | List schemas |
| `GET` | `/api/:userId/schemas/:name` | Get schema |
| `POST` | `/api/:userId/schemas/:name` | Create schema |
| `PATCH` | `/api/:userId/schemas/:name` | Update schema |
| `DELETE` | `/api/:userId/schemas/:name` | Delete schema |
| `GET` | `/api/:userId/schemas/:name/records` | Query records |
| `POST` | `/api/:userId/schemas/:name/records` | Create record |
| `GET` | `/api/:userId/records/:id` | Get record |
| `PUT` | `/api/:userId/records/:id` | Update record |
| `DELETE` | `/api/:userId/records/:id` | Delete record |

### `@clawface/react-sdk`

Drop-in React components and hooks. Auto-generates UI from schema metadata.

**Components:**

| Component | What it renders |
|-----------|----------------|
| `<SchemaList />` | Grid of schema cards with icons + descriptions |
| `<DataTable />` | Sortable, paginated record table |
| `<RecordForm />` | Auto-generated form with validation |
| `<RecordDetail />` | Read-only detail view |
| `<FieldGroup />` | Grouped fields with sections |

**Hooks:**

| Hook | Returns |
|------|---------|
| `useSchemas()` | All schemas for current user |
| `useSchema(name)` | Single schema definition |
| `useRecords(schema, opts?)` | Paginated, filtered records |
| `useRecord(id)` | Single record |
| `useCreateRecord()` | Create mutation |
| `useUpdateRecord()` | Update mutation |
| `useDeleteRecord()` | Delete mutation |
| `useFieldValidation()` | Client-side validation |

**Custom field renderers:**

```tsx
import { registerField } from "@clawface/react-sdk/react";

registerField("color-picker", ({ value, onChange }) => (
  <input type="color" value={value} onChange={e => onChange(e.target.value)} />
));
```

</details>

---

## Configuration

Detailed guides in [`config/`](config/):

| Step | What | Guide |
|------|------|-------|
| **1. Server** | Run the MCP + REST server | [`config/server/`](config/server/) |
| **2. Auth** | Set up authentication | [`config/server/`](config/server/#authentication) |
| **3. Agent** | Connect your AI agent | [`config/agents/`](config/agents/) |

> Autonomous agents like OpenClaw include workspace templates (behavior, memory, tools) inside their agent directory. Claude Desktop and VS Code discover tools automatically — no extra setup.

### Authentication

Two modes, controlled by `AUTH_MODE` env var:

| Mode | For | How it works |
|------|-----|-------------|
| `none` (default) | Local development | Trusted `X-User-Id` header |
| `apikey` | Production | `Authorization: Bearer cf_xxx` — server resolves userId from key |

In `apikey` mode, both MCP and REST endpoints are protected. MCP tools receive the authenticated userId server-side (overrides the `userId` tool argument for IDOR prevention).

See [`config/server/`](config/server/#authentication) for setup, bootstrap flow, and key management API.

### Supported Agents

| Agent | How it connects | Status |
|-------|-----------------|--------|
| [OpenClaw](config/agents/openclaw/) | mcporter bridge + workspace | Ready |
| [Claude Desktop](config/agents/claude-desktop/) | Native MCP | Ready |
| [VS Code](config/agents/vscode/) | Extension MCP | Ready |
| NanoClaw, NemoClaw, Hermes | — | Coming soon |

### Self-Hosting

```bash
# With MongoDB (dev mode — no auth)
docker run -p 3000:3000 \
  -e DB_PROVIDER=mongodb \
  -e MONGODB_URI="mongodb://your-host:27017" \
  -e MONGODB_DB_NAME=clawface \
  ghcr.io/aiclawface/clawface:latest

# With Cosmos DB + API key auth (production)
docker run -p 3000:3000 \
  -e DB_PROVIDER=cosmos \
  -e COSMOS_CONNECTION_STRING="AccountEndpoint=https://...;AccountKey=...;" \
  -e COSMOS_DB_NAME=clawface \
  -e AUTH_MODE=apikey \
  -e AUTH_ADMIN_KEY="your-admin-secret" \
  ghcr.io/aiclawface/clawface:latest
```

Supports **MongoDB** and **Azure Cosmos DB** out of the box. Pluggable `DbProvider` interface — add Postgres, SQLite, or DynamoDB by implementing one interface. See [`config/server/`](config/server/) for details.

---

## Comparison

| Tool | Approach | Auto-Generated UI | Agent-First |
|------|----------|-------------------|-------------|
| **ClawFace** | Agent defines schema → UI follows | Yes | Yes |
| Google MCP Toolbox | MCP server for existing DBs | No | Partial |
| CentralMind Gateway | Auto-generates REST from DB schema | No | No |
| Supabase / Firebase | General-purpose BaaS | No | No |
| NocoDB / Baserow | Airtable-like open DB | Manual | No |

ClawFace is **agent-first**: the AI defines the data model, the UI follows automatically.

---

## Contributing

```bash
git clone https://github.com/AiClawFace/clawface.git
cd clawface && npm install

npm run build          # Build all packages
npm run test           # Run tests
npm run dev            # Start demo app (Vite dev server)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Community

- [Discord](https://discord.gg/clawface) — Questions, ideas, show & tell
- [GitHub Issues](https://github.com/AiClawFace/clawface/issues) — Bug reports & feature requests
- [𝕏 @AiClawFace](https://x.com/AiClawFace) — Updates & announcements

## License

[Apache-2.0](LICENSE)

---

<p align="center">
  <strong>ClawFace</strong> — The missing UI layer for AI agents.<br/>
  <a href="https://clawface.io">clawface.io</a>
</p>
