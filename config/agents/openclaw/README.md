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

OpenClaw agents benefit from the workspace templates for persistent behavior and tool reference:

```bash
cp -r ../../workspace/* ~/.openclaw/workspace/
```

Key file: `TOOLS.md` — contains mcporter calling patterns and schema metadata rules that the agent reads every session.

See [`../workspace/README.md`](../../workspace/README.md) for details on each file.

## 3. Docker / Containers

Set the `DB_MCP_URL` environment variable — the container's `start.sh` handles everything automatically:

```bash
docker run -e DB_MCP_URL=https://your-clawface-server.com your-openclaw-image
```

The startup script:
1. Installs mcporter as an OpenClaw skill
2. Writes MCP config to both config paths
3. Sets correct file ownership for the `openclaw` user

## How the agent calls tools

```
exec("mcporter call db-mcp.<tool> userId=<id> key=value ...")
```

Example:
```
exec("mcporter call db-mcp.create_record userId=user123 schemaName=contacts data='{\"name\":\"Alice\"}'")
```
