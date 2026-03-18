# Configuration

| # | I want to... | Go to |
|---|-------------|-------|
| 1 | **Run the ClawFace server** | [`server/`](server/) |
| 2 | **Set up authentication** | [`server/`](server/#authentication) |
| 3 | **Connect an AI agent** | [`agents/`](agents/) |

```
config/
├── server/              Set up the MCP + REST server
│   └── README.md        Env vars, database, local dev, deployment
│
└── agents/              Connect your AI agent to ClawFace
    ├── openclaw/        OpenClaw (via mcporter) + workspace templates
    ├── claude-desktop/  Claude Desktop (native MCP)
    ├── vscode/          VS Code (Copilot / Claude Code)
    └── README.md        Overview + generic MCP client setup
```

Each agent directory contains its MCP client config, setup instructions, and any agent-specific files (e.g., OpenClaw includes workspace templates for agent behavior and memory).
