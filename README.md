<p align="center">
  <h1 align="center">🐾 ClawFace</h1>
  <p align="center"><strong>Where agents meet humans.</strong></p>
  <p align="center">
    AI agents store structured data via MCP → ClawFace auto-generates the UI → humans browse, edit, and manage it.
  </p>
</p>

<p align="center">
  <a href="https://clawface.io">Website</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#packages">Packages</a> •
  <a href="#react-sdk">React SDK</a> •
  <a href="#mcp-server">MCP Server</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#self-hosting">Self-Hosting</a> •
  <a href="https://x.com/ClawFaceAI">𝕏 @ClawFaceAI</a>
</p>

---

## The Problem

AI agents are great at collecting and processing information — but **humans have no way to see, verify, or manage** the data agents store on their behalf. There's no UI. No dashboard. No visibility.

## The Solution

**ClawFace** bridges the gap between autonomous AI agents and the humans they serve:

1. **Agent defines a schema** — "I need to track contacts with name, email, and company"
2. **Agent creates records** — stores structured data via MCP tools
3. **ClawFace generates the UI** — forms, tables, detail views — all auto-generated from the schema
4. **Human browses & manages** — sees their data in a real app, not buried in chat history

```
┌─────────────┐       MCP / REST        ┌─────────────────┐      React SDK      ┌─────────────┐
│   AI Agent   │ ───────────────────────▶│  ClawFace MCP   │◀────────────────── │   Web App   │
│  (any LLM)   │   define_schema         │     Server      │   useSchemas()     │  (auto-gen  │
│              │   create_record          │                 │   useRecords()     │   UI)       │
│              │   query_records          │   Cosmos DB /   │   <DataTable />    │             │
└─────────────┘                          │   any DB        │   <RecordForm />   └─────────────┘
                                         └─────────────────┘
```

## Quickstart

### 1. Start the MCP Server

```bash
cd packages/mcp-server
npm install
npm run build && npm start
```

The server starts on `http://localhost:3000` with:
- **MCP endpoint**: `POST /mcp` (Streamable HTTP, stateless)
- **REST API**: `/api/:userId/schemas`, `/api/:userId/schemas/:name/records`
- **Health check**: `GET /health`

### 2. Connect your AI agent

Point any MCP-compatible agent to the server:

```json
{
  "mcpServers": {
    "clawface": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

The agent gets 8 tools: `list_schemas`, `get_schema`, `define_schema`, `delete_schema`, `query_records`, `get_record`, `create_record`, `update_record`, `delete_record`.

### 3. Add the React UI

```bash
npm install @clawface/react-sdk
```

```tsx
import { OpenClawProvider, SchemaList, DataTable, RecordForm } from "@clawface/react-sdk/react";

function App() {
  return (
    <OpenClawProvider baseUrl="http://localhost:3000/api" userId="user-123">
      <SchemaList />           {/* Auto-generated list of all schemas */}
      <DataTable schema="contacts" />  {/* Auto-generated table */}
      <RecordForm schema="contacts" /> {/* Auto-generated form */}
    </OpenClawProvider>
  );
}
```

That's it. The agent stores data, the human sees it.

## How It Works

### Schema-as-Contract

The schema is the single source of truth shared between agent and UI. An agent defines it like this:

```json
{
  "fields": {
    "name":    { "type": "string", "required": true, "label": "Full Name" },
    "email":   { "type": "string", "required": true, "inputType": "text" },
    "company": { "type": "string", "label": "Company" },
    "priority": {
      "type": "string",
      "inputType": "select",
      "options": ["low", "medium", "high"],
      "default": "medium"
    },
    "notes":   { "type": "string", "inputType": "textarea" }
  },
  "purpose": "Track sales contacts for CRM pipeline",
  "instructions": "Create a record when user mentions a new contact."
}
```

From this single definition:
- The **MCP server** validates data, enforces types, rejects mismatches
- The **React SDK** auto-generates forms (text inputs, selects, toggles, date pickers), tables (sortable columns), and detail views
- A **new agent** on a different platform can read `purpose` + `instructions` and understand what to do — no prior context needed

### Supported Field Types

| Type | Input Types | UI Renders As |
|------|-------------|---------------|
| `string` | `text`, `textarea`, `select` | Text input, multiline area, or dropdown |
| `number` | `number` | Numeric input |
| `boolean` | `toggle` | Switch/toggle |
| `date` | `date` | Date picker (ISO 8601) |
| `array` | `list` | Dynamic add/remove list |
| `object` | `group` | Nested field group |

### Agent-Portable Metadata

Schemas include metadata that any agent can understand:

| Field | Purpose |
|-------|---------|
| `purpose` | **Why** this schema exists — "Track daily expenses" |
| `instructions` | **How** an agent should use it — "Create a record when user reports spending" |
| `examples` | Sample records showing expected data shape |
| `tags` | Discovery & categorization — `["finance", "personal"]` |
| `createdBy` | Origin tracking — `"openclaw"`, `"user:mohit"` |

This means your data isn't locked into one agent platform. Switch agents, and the new one reads the schema and knows exactly what to do.

## Packages

```
packages/
├── shared/          # Types, validation, constants (zero dependencies)
├── mcp-server/      # MCP + REST server (Express, Cosmos DB)
└── react-sdk/       # React components + hooks for auto-generated UI
    ├── core/        #   Vanilla JS client (framework-agnostic)
    └── react/       #   React components, hooks, field registry

apps/
└── demo/            # Example React app with full CRUD

config/
├── workspace/       # Agent workspace file templates (AGENTS.md, SOUL.md, TOOLS.md, ...)
└── examples/        # Per-agent config (openclaw/, claude-desktop/, vscode/, ...)
```

### `@clawface/shared`

Shared types and validation used by both server and client. Zero runtime dependencies.

- `FieldDef`, `SchemaResponse`, `RecordResponse` — the core type system
- `QueryFilter`, `QueryOptions` — filtering + pagination types
- `ErrorResponse` — structured errors with `hint` field

### `@clawface/mcp-server`

Dual-protocol server: MCP (for agents) + REST (for the UI).

**MCP Tools** (9 tools):

| Tool | Description |
|------|-------------|
| `list_schemas` | List all schemas for a user |
| `get_schema` | Get schema definition by name |
| `define_schema` | Create or update a schema |
| `delete_schema` | Delete schema (optionally with all data) |
| `query_records` | Filter, sort, paginate records |
| `get_record` | Get a single record by ID |
| `create_record` | Create a new record |
| `update_record` | Update an existing record (full replace) |
| `delete_record` | Delete a record |

**REST API** (for the React SDK):

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

Drop-in React components and hooks. Everything auto-generates from schema metadata.

**Components:**

| Component | What it renders |
|-----------|----------------|
| `<SchemaList />` | Grid/list of all schemas with icons + descriptions |
| `<DataTable />` | Sortable, paginated table of records |
| `<RecordForm />` | Auto-generated form with validation |
| `<RecordDetail />` | Read-only detail view |
| `<FieldGroup />` | Grouped fields with collapsible sections |

**Hooks:**

| Hook | Returns |
|------|---------|
| `useSchemas()` | All schemas for the current user |
| `useSchema(name)` | Single schema definition |
| `useRecords(schema, options?)` | Paginated, filtered records |
| `useRecord(id)` | Single record |
| `useCreateRecord()` | Mutation for creating records |
| `useUpdateRecord()` | Mutation for updating records |
| `useDeleteRecord()` | Mutation for deleting records |
| `useFieldValidation()` | Client-side validation against schema |

**Custom Fields:**

```tsx
import { registerField } from "@clawface/react-sdk/react";

// Register a custom field renderer for a specific input type
registerField("color-picker", ({ value, onChange, field }) => (
  <input type="color" value={value} onChange={e => onChange(e.target.value)} />
));
```

## Configuration

Full configuration guide: **[config/README.md](config/README.md)**

### Connecting an AI Agent

Each supported agent has its own config directory under [`config/examples/`](config/examples/) with a `mcp-client.json` and setup instructions:

| Agent | Directory | Notes |
|-------|-----------|-------|
| [OpenClaw](config/examples/openclaw/) | `config/examples/openclaw/` | Uses mcporter bridge, requires workspace files |
| [Claude Desktop](config/examples/claude-desktop/) | `config/examples/claude-desktop/` | Native MCP, tools auto-discovered |
| [VS Code](config/examples/vscode/) | `config/examples/vscode/` | Copilot / Claude Code extension |
| _NanoClaw, NemoClaw, Hermes Agent_ | _(coming soon)_ | Add new agents under `config/examples/<agent>/` |

### Agent Workspace Files

ClawFace includes a set of **workspace templates** that define how AI agents behave, remember, and interact. These are in [`config/workspace/`](config/workspace/):

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent behavior, memory system, safety rules |
| `SOUL.md` | Core identity and values |
| `USER.md` | User profile template |
| `IDENTITY.md` | Agent identity template |
| `BOOTSTRAP.md` | First-run onboarding flow |
| `TOOLS.md` | db-mcp tool reference, schema metadata rules |

Copy these into your agent's workspace directory to get started:

```bash
cp -r config/workspace/* /path/to/.openclaw/workspace/
```

The workspace files are designed to be **agent-portable** — any LLM agent (OpenClaw, NemoClaw, or custom) can read them and understand how to operate without prior context.

## Self-Hosting

The MCP server currently uses **Azure Cosmos DB** as its backend. Set these environment variables:

```bash
COSMOS_CONNECTION_STRING=AccountEndpoint=https://your-account.documents.azure.com:443/;AccountKey=your-key;
COSMOS_DB_NAME=clawface
DB_PROVIDER=cosmos
```

> **Pluggable providers**: The server uses a `DbProvider` interface. Adding PostgreSQL, SQLite, or DynamoDB support is straightforward — implement the interface and register it in the factory.

## Why Not Just Use [existing tool]?

| Tool | What it does | Missing |
|------|-------------|---------|
| Google MCP Toolbox | MCP server for existing databases | No auto-generated UI. Agent-only. |
| CentralMind Gateway | Auto-generates REST APIs from DB schema | No UI layer. API only. |
| Supabase/Firebase | General-purpose BaaS | Human-first, not agent-first. No schema-driven auto-UI from agent definitions. |
| NocoDB / Baserow | Airtable-like open DB | Human-first with MCP bolted on as afterthought. |

ClawFace is **agent-first**: the AI defines the data model, the UI follows automatically. No one else does this.

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │              ClawFace Server                  │
  AI Agent ────────▶│  /mcp   (MCP Streamable HTTP, stateless)    │
                    │  /api   (REST, for React SDK)                │
                    │  /health                                      │
                    │                                              │
                    │  ┌────────────┐    ┌──────────────────────┐  │
                    │  │ MCP Tools  │───▶│   DbProvider         │  │
                    │  │ (9 tools)  │    │   (Cosmos DB)        │  │
                    │  └────────────┘    └──────────────────────┘  │
                    │  ┌────────────┐              │               │
  React App ───────▶│  │ REST Routes│──────────────┘               │
                    │  └────────────┘                              │
                    └──────────────────────────────────────────────┘
```

**Key design decisions:**
- **Stateless MCP** — each request creates a fresh server instance, shares a connection pool
- **Schema-as-contract** — single source of truth between agent and UI
- **Agent-portable metadata** — `purpose`, `instructions`, `examples` fields survive platform switches
- **Pluggable DB** — `DbProvider` interface for any backend
- **Strict validation** — type mismatches rejected server-side, errors include `hint` for agents

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repo
git clone https://github.com/ClawFace-dev/clawface.git
cd clawface

# Install dependencies
npm install

# Build all packages
npm run build

# Run the MCP server
cd packages/mcp-server && npm start

# Run the demo app
cd apps/demo && npm run dev
```

## License

Apache-2.0 — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>ClawFace</strong> — Where agents meet humans.<br/>
  <a href="https://clawface.io">clawface.io</a> · <a href="https://x.com/ClawFaceAI">@ClawFaceAI</a>
</p>
