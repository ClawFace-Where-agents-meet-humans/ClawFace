# Agent Workspace

Templates that define how an autonomous AI agent behaves, remembers, and uses tools.

## Who needs this?

Agents that run autonomously and need persistent identity, memory, and tool reference between sessions — like **OpenClaw**, **NemoClaw**, and **NanoClaw**.

**Not needed for:** Claude Desktop, VS Code, or other agents with native MCP support (they discover tools automatically).

## Files

| File | What it does | Who fills it in |
|------|-------------|-----------------|
| `BOOTSTRAP.md` | First-run onboarding — agent introduces itself, learns about the user | Delete after first run |
| `IDENTITY.md` | Agent's name, creature type, vibe, emoji, avatar | Agent, during first conversation |
| `SOUL.md` | Core identity and values — personality, boundaries, how to be helpful | Agent evolves over time |
| `USER.md` | Profile of the human — name, timezone, preferences, context | Agent fills in over conversations |
| `AGENTS.md` | Behavior rules — memory system, safety, group chats, heartbeats | Customize per deployment |
| `TOOLS.md` | Tool reference — db-mcp calling patterns, schema metadata rules | Update when adding tools |

## How to install

```bash
cp -r config/workspace/* ~/.openclaw/workspace/
```

Or for Docker containers, set `DB_MCP_URL` and the startup script copies these automatically. See [`agents/openclaw/`](../agents/openclaw/) for details.

## Memory system

The workspace uses two tiers of memory:

```
workspace/
├── MEMORY.md              Long-term curated insights (private, main sessions only)
└── memory/
    ├── 2026-03-18.md      Daily raw session logs
    ├── 2026-03-17.md
    └── heartbeat-state.json
```

- **MEMORY.md** — Curated knowledge the agent distills over time. Only loaded in private sessions (security: prevents leaking personal context in group chats).
- **Daily files** — Raw logs of what happened each day. The agent periodically reviews these and promotes important insights to MEMORY.md.

## Memory vs Database

Two persistence systems — don't confuse them:

| | Memory files | Database (db-mcp) |
|---|---|---|
| **Visible to** | Agent only | Agent + human (via UI) |
| **What goes in** | Session context, lessons, preferences | Contacts, tasks, expenses — structured data |
| **Format** | Markdown files | Schema-validated records |
| **Survives agent switch?** | Yes (file-based) | Yes (schema is self-documenting) |
