# Configuration

Three things to set up, in order:

| # | I want to... | Go to |
|---|-------------|-------|
| 1 | **Run the ClawFace server** | [`server/`](server/) |
| 2 | **Connect an AI agent** | [`agents/`](agents/) |
| 3 | **Set up agent behavior & memory** | [`workspace/`](workspace/) |

```
config/
├── server/              Set up the MCP + REST server
│   └── README.md        Env vars, database, local dev, deployment
│
├── agents/              Connect your AI agent to ClawFace
│   ├── openclaw/        OpenClaw (via mcporter)
│   ├── claude-desktop/  Claude Desktop (native MCP)
│   ├── vscode/          VS Code (Copilot / Claude Code)
│   └── README.md        Overview + generic MCP client setup
│
└── workspace/           Agent personality, behavior & tool templates
    ├── AGENTS.md        Behavior rules, memory, safety
    ├── SOUL.md          Identity and values
    ├── TOOLS.md         db-mcp reference and schema rules
    ├── USER.md          User profile template
    ├── IDENTITY.md      Agent identity template
    ├── BOOTSTRAP.md     First-run onboarding
    └── README.md        What these files are and who needs them
```

> **Not every agent needs all three steps.** Claude Desktop and VS Code only need steps 1-2 — they discover tools automatically. Autonomous agents like OpenClaw and NemoClaw benefit from step 3 (workspace setup) for persistent memory and behavior.
