# OpenClaw Configuration

[OpenClaw](https://github.com/nicepkg/openclaw) uses **mcporter** as its MCP bridge. The agent calls tools via `exec("mcporter call db-mcp.<tool> ...")`.

## MCP Client Config

mcporter reads config from two locations (first match wins):

1. `~/.openclaw/workspace/config/mcporter.json` (project-level)
2. `~/.mcporter/mcporter.json` (system-level)

Copy `mcp-client.json` to either path:

```bash
mkdir -p ~/.openclaw/workspace/config
cp mcp-client.json ~/.openclaw/workspace/config/mcporter.json
```

## Workspace Files

Copy the workspace templates for agent behavior and tool references:

```bash
cp -r ../../workspace/* /path/to/.openclaw/workspace/
```

Key file: `TOOLS.md` contains mcporter calling patterns and schema metadata rules.

## Docker / Container

Set `DB_MCP_URL` environment variable — the container's `start.sh` handles mcporter registration automatically:

```bash
docker run -e DB_MCP_URL=https://your-server.com your-openclaw-image
```
