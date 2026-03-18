#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createProvider } from "./provider/factory.js";
import { registerSchemaTools } from "./tools/schema-tools.js";
import { registerDataTools } from "./tools/data-tools.js";
import { registerRestRoutes } from "./rest-routes.js";

// Singleton provider (connection pool reused across requests)
const provider = createProvider();

// ── Server Instructions ──────────────────────────────────────────────────────
// Sent to LLMs during MCP initialization to explain the server's purpose
// and how to use it without conflicting with OpenClaw's internal memory.

const SERVER_INSTRUCTIONS = `
You have access to an external structured database (clawface-mcp-server) for persisting user data.
This is NOT your internal memory or context — it is a separate, persistent database that the user can also browse through a UI.

## Purpose
Use this database whenever the user's information should be:
- **Persistent** — survives across conversations and sessions
- **Structured** — has defined fields, types, and relationships
- **Browsable** — the user will see this data in a dedicated UI with forms and tables
- **Queryable** — can be filtered, sorted, and paginated

Examples: contacts, notes, tasks, projects, bookmarks, logs, habits, expenses — any structured information the user wants to keep and manage.

## How It Works
You define **schemas** (data structures) and create **records** (entries) within them. The system auto-generates a UI for the user to view, edit, and manage their data. Design schemas with this in mind — use clear labels, descriptions, field grouping, and appropriate input types so the auto-generated forms and tables are intuitive.

## Key Rules
1. **Check before creating** — call \`list_schemas\` before \`define_schema\` to avoid duplicates
2. **Check before writing** — call \`get_schema\` before \`create_record\` / \`update_record\` to know exact field names and types. Never guess.
3. **Strict types** — the server rejects type mismatches (e.g., "42" is not a number). Dates must be ISO 8601.
4. **Full replace on update** — \`update_record\` replaces the entire data object. Fetch first with \`get_record\`, modify, then send back the full object.
5. **Confirm destructive actions** — ask the user before \`delete_schema\` with \`deleteData: true\`
6. **Follow error hints** — all errors include a \`hint\` field with the recommended next action

## What NOT to Store Here
- Conversation history or chat context (that's your internal memory)
- Temporary reasoning or scratchpad data
- Anything the user hasn't asked to persist

Use this database only when data should outlive the current conversation and be visible to the user in the UI.
`.trim();

/**
 * Create a new MCP server instance for each request (stateless mode).
 * Tools are registered fresh but share the same DbProvider/connection pool.
 */
function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "clawface-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  registerSchemaTools(server, provider);
  registerDataTools(server, provider);

  return server;
}

async function main(): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // REST API routes
  registerRestRoutes(app, provider);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "clawface-mcp-server" });
  });

  // Handle POST requests for client-to-server communication (stateless mode)
  app.post("/mcp", async (req, res) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
      });

      res.on("close", () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  // SSE notifications not supported in stateless mode
  app.get("/mcp", (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }),
    );
  });

  // Session termination not needed in stateless mode
  app.delete("/mcp", (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }),
    );
  });

  const PORT = Number(process.env.FUNCTIONS_HTTPWORKER_PORT ?? process.env.PORT ?? 3000);
  app.listen(PORT, () => {
    console.log(`clawface-mcp-server listening on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});