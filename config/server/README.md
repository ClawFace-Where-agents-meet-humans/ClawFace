# Server Setup

How to run the ClawFace MCP + REST server.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PROVIDER` | Yes | — | Database backend: `cosmos` or `mongodb` |
| `COSMOS_CONNECTION_STRING` | If cosmos | — | Full Cosmos DB connection string |
| `COSMOS_DB_NAME` | If cosmos | `clawface-mcp-server` | Cosmos DB database name |
| `MONGODB_URI` | If mongodb | — | MongoDB connection string |
| `MONGODB_DB_NAME` | If mongodb | `clawface` | MongoDB database name |
| `PORT` | No | `3000` | Server port |

## Local Development

```bash
cd packages/mcp-server
cp local.settings.example.json local.settings.json
```

Edit `local.settings.json` with your credentials:

```json
{
  "IsEncrypted": false,
  "Values": {
    "DB_PROVIDER": "cosmos",
    "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://your-account.documents.azure.com:443/;AccountKey=your-key;",
    "COSMOS_DB_NAME": "your-db-name"
  }
}
```

> `local.settings.json` is in `.gitignore` — never commit it.

## Run

```bash
npm run build && npm start
```

Server starts at `http://localhost:3000`:

| Endpoint | Protocol | For |
|----------|----------|-----|
| `POST /mcp` | MCP (Streamable HTTP) | AI agents |
| `/api/:userId/...` | REST | React SDK, any HTTP client |
| `GET /health` | HTTP | Health checks |

## Remote Access

For agents in containers or remote environments, tunnel the server:

```bash
ngrok http 3000
# Use: https://abc123.ngrok-free.app/mcp
```

> **ngrok free tier**: clients must send `ngrok-skip-browser-warning: true` header.

## Database Providers

ClawFace uses a pluggable `DbProvider` interface. Two providers are included:

### Azure Cosmos DB

```bash
DB_PROVIDER=cosmos
COSMOS_CONNECTION_STRING="AccountEndpoint=https://...;AccountKey=...;"
COSMOS_DB_NAME=clawface
```

Uses two containers (auto-created):
- `schemas` — Schema definitions (partitioned by `userId`)
- `records` — Data records (partitioned by `userId`)

### MongoDB

```bash
DB_PROVIDER=mongodb
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DB_NAME=clawface
```

Uses two collections (auto-created with indexes):
- `schemas` — Unique index on `(userId, schemaName)`
- `records` — Indexes on `(userId, schemaName)` and `(id, userId)`

Works with MongoDB Atlas, self-hosted MongoDB, or any MongoDB-compatible database (e.g., DocumentDB).

### Adding a New Provider

Implement `DbProvider` from `packages/mcp-server/src/types.ts` and register it in `packages/mcp-server/src/provider/factory.ts`.

## Docker

```bash
# With Cosmos DB
docker run -p 3000:3000 \
  -e DB_PROVIDER=cosmos \
  -e COSMOS_CONNECTION_STRING="AccountEndpoint=https://...;AccountKey=...;" \
  -e COSMOS_DB_NAME=clawface \
  ghcr.io/aiclawface/clawface:latest

# With MongoDB
docker run -p 3000:3000 \
  -e DB_PROVIDER=mongodb \
  -e MONGODB_URI="mongodb://your-host:27017" \
  -e MONGODB_DB_NAME=clawface \
  ghcr.io/aiclawface/clawface:latest
```
