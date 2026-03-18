# OpenClaw

[OpenClaw](https://github.com/nicepkg/openclaw) connects to ClawFace via **mcporter**, an MCP bridge that exposes tools through its `exec()` interface.

## 1. Install the MCP config

mcporter reads config from (first match wins):

| Priority | Path |
|----------|------|
| 1 | `~/.openclaw/workspace/config/mcporter.json` |
| 2 | `~/.mcporter/mcporter.json` |

Copy the config:

```bash
mkdir -p ~/.openclaw/workspace/config
cp mcp.json ~/.openclaw/workspace/config/mcporter.json
```

Edit the `url` to point to your ClawFace server.

## 2. Set up workspace files

The [`workspace/`](workspace/) directory contains templates that define agent behavior, memory, and tool reference. Copy them into your OpenClaw workspace:

```bash
cp -r workspace/* ~/.openclaw/workspace/
```

See [`workspace/README.md`](workspace/README.md) for what each file does.

Key file: **`TOOLS.md`** — contains mcporter calling patterns and schema metadata rules that the agent reads every session.

## 3. Docker / Containers

Set the `DB_MCP_URL` environment variable — the container's `start.sh` handles everything automatically:

```bash
docker run -e DB_MCP_URL=https://your-clawface-server.com your-openclaw-image
```

The startup script:
1. Installs mcporter as an OpenClaw skill
2. Writes MCP config to both config paths
3. Sets correct file ownership for the `openclaw` user

## Authentication

When the server runs with `AUTH_MODE=apikey`, add the authorization header to the MCP config:

```json
{
  "mcpServers": {
    "db-mcp": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer cf_your-api-key-here"
      }
    }
  }
}
```

In `apikey` mode, the `userId` tool argument is overridden server-side with the authenticated user — the agent can pass any value and the server ensures data isolation.

When `AUTH_MODE=none` (default), no auth header is needed.

## How the agent calls tools

```
exec("mcporter call db-mcp.<tool> userId=<id> key=value ...")
```

Example:
```
exec("mcporter call db-mcp.create_record userId=user123 schemaName=contacts data='{\"name\":\"Alice\"}'")
```
