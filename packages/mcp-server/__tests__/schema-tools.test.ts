import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSchemaTools } from "../src/tools/schema-tools.js";
import type { DbProvider, SchemaDoc, SchemaInput } from "../src/types.js";

// ── Mock Provider ────────────────────────────────────────────────────────────

function createMockProvider(): DbProvider {
  return {
    createSchema: vi.fn(),
    getSchema: vi.fn(),
    listSchemas: vi.fn(),
    updateSchema: vi.fn(),
    deleteSchema: vi.fn(),
    createRecord: vi.fn(),
    getRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
    queryRecords: vi.fn(),
    countRecords: vi.fn(),
  };
}

// ── Helper to call a tool ────────────────────────────────────────────────────

async function callTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: Function }> })._registeredTools;
  const tool = tools[toolName];
  if (!tool) throw new Error(`Tool '${toolName}' not registered`);
  return tool.handler(args) as Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
}

function parseResult(result: { content: Array<{ type: string; text: string }>; isError?: boolean }): unknown {
  return JSON.parse(result.content[0].text);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("schema-tools", () => {
  let server: McpServer;
  let provider: DbProvider;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    provider = createMockProvider();
    registerSchemaTools(server, provider);
  });

  describe("define_schema", () => {
    it("creates a schema with valid input and auto-fills defaults", async () => {
      const mockDoc: SchemaDoc = {
        id: "user1:contacts",
        pk: "user1",
        userId: "user1",
        schemaName: "contacts",
        displayName: "Contacts",
        fields: {
          name: { type: "string", required: true, label: "Name", inputType: "text", order: 1 },
        },
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      (provider.createSchema as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await callTool(server, "define_schema", {
        userId: "user1",
        schemaName: "contacts",
        displayName: "Contacts",
        fields: { name: { type: "string", required: true } },
      });

      expect(result.isError).toBeUndefined();
      expect(provider.createSchema).toHaveBeenCalledWith(
        "user1",
        "contacts",
        expect.objectContaining({
          fields: expect.objectContaining({
            name: expect.objectContaining({ type: "string", required: true, inputType: "text", label: "Name" }),
          }),
        }),
      );
    });

    it("rejects invalid schemaName", async () => {
      const result = await callTool(server, "define_schema", {
        userId: "user1",
        schemaName: "My Contacts",
        fields: { name: { type: "string" } },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("rejects empty fields", async () => {
      const result = await callTool(server, "define_schema", {
        userId: "user1",
        schemaName: "test",
        fields: {},
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("rejects mismatched inputType/type", async () => {
      const result = await callTool(server, "define_schema", {
        userId: "user1",
        schemaName: "test",
        fields: { age: { type: "number", inputType: "textarea" } },
      });

      expect(result.isError).toBe(true);
    });

    it("rejects select without options", async () => {
      const result = await callTool(server, "define_schema", {
        userId: "user1",
        schemaName: "test",
        fields: { role: { type: "string", inputType: "select" } },
      });

      expect(result.isError).toBe(true);
    });

    it("returns conflict error for duplicate schema", async () => {
      const { ConflictError } = await import("../src/errors.js");
      (provider.createSchema as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ConflictError("Schema 'contacts' already exists"),
      );

      const result = await callTool(server, "define_schema", {
        userId: "user1",
        schemaName: "contacts",
        fields: { name: { type: "string" } },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("CONFLICT");
    });
  });

  describe("list_schemas", () => {
    it("returns schema summaries", async () => {
      const schemas: SchemaDoc[] = [
        {
          id: "user1:contacts",
          pk: "user1",
          userId: "user1",
          schemaName: "contacts",
          displayName: "Contacts",
          fields: { name: { type: "string" }, email: { type: "string" } },
          version: 2,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        },
      ];
      (provider.listSchemas as ReturnType<typeof vi.fn>).mockResolvedValue(schemas);

      const result = await callTool(server, "list_schemas", { userId: "user1" });
      const body = parseResult(result) as Array<{ schemaName: string; fieldCount: number }>;

      expect(body).toHaveLength(1);
      expect(body[0].schemaName).toBe("contacts");
      expect(body[0].fieldCount).toBe(2);
    });

    it("includes fieldNames in summary", async () => {
      const schemas: SchemaDoc[] = [
        {
          id: "user1:contacts",
          pk: "user1",
          userId: "user1",
          schemaName: "contacts",
          fields: { name: { type: "string" }, email: { type: "string" } },
          version: 1,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];
      (provider.listSchemas as ReturnType<typeof vi.fn>).mockResolvedValue(schemas);

      const result = await callTool(server, "list_schemas", { userId: "user1" });
      const body = parseResult(result) as Array<{ fieldNames: string[] }>;

      expect(body[0].fieldNames).toEqual(["name", "email"]);
    });

    it("returns empty array when no schemas", async () => {
      (provider.listSchemas as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await callTool(server, "list_schemas", { userId: "user1" });
      const body = parseResult(result) as unknown[];

      expect(body).toHaveLength(0);
    });
  });

  describe("get_schema", () => {
    it("returns full schema doc", async () => {
      const schema: SchemaDoc = {
        id: "user1:contacts",
        pk: "user1",
        userId: "user1",
        schemaName: "contacts",
        fields: { name: { type: "string" } },
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

      const result = await callTool(server, "get_schema", {
        userId: "user1",
        schemaName: "contacts",
      });
      const body = parseResult(result) as SchemaDoc;

      expect(body.schemaName).toBe("contacts");
      expect(body.fields.name.type).toBe("string");
    });

    it("strips internal pk and id from response", async () => {
      const schema: SchemaDoc = {
        id: "user1:contacts",
        pk: "user1",
        userId: "user1",
        schemaName: "contacts",
        fields: { name: { type: "string" } },
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

      const result = await callTool(server, "get_schema", {
        userId: "user1",
        schemaName: "contacts",
      });
      const body = parseResult(result) as Record<string, unknown>;

      expect(body).not.toHaveProperty("pk");
      expect(body).not.toHaveProperty("id");
      expect(body).toHaveProperty("schemaName", "contacts");
    });

    it("returns NOT_FOUND for nonexistent schema", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callTool(server, "get_schema", {
        userId: "user1",
        schemaName: "nonexistent",
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; hint: string };
      expect(body.error).toBe("NOT_FOUND");
      expect(body.hint).toContain("define_schema");
    });
  });

  describe("update_schema", () => {
    it("updates schema fields and increments version", async () => {
      const updated: SchemaDoc = {
        id: "user1:contacts",
        pk: "user1",
        userId: "user1",
        schemaName: "contacts",
        fields: { name: { type: "string" }, phone: { type: "string" } },
        version: 2,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      };
      (provider.updateSchema as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await callTool(server, "update_schema", {
        userId: "user1",
        schemaName: "contacts",
        fields: { name: { type: "string" }, phone: { type: "string" } },
      });

      expect(result.isError).toBeUndefined();
      const body = parseResult(result) as SchemaDoc;
      expect(body.version).toBe(2);
    });

    it("validates updated fields", async () => {
      const result = await callTool(server, "update_schema", {
        userId: "user1",
        schemaName: "test",
        fields: { age: { type: "number", inputType: "textarea" } },
      });

      expect(result.isError).toBe(true);
    });

    it("returns NOT_FOUND for nonexistent schema", async () => {
      const { NotFoundError } = await import("../src/errors.js");
      (provider.updateSchema as ReturnType<typeof vi.fn>).mockRejectedValue(
        new NotFoundError("Schema", "nonexistent"),
      );

      const result = await callTool(server, "update_schema", {
        userId: "user1",
        schemaName: "nonexistent",
        displayName: "Updated",
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("delete_schema", () => {
    it("deletes schema successfully", async () => {
      (provider.deleteSchema as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await callTool(server, "delete_schema", {
        userId: "user1",
        schemaName: "contacts",
        deleteData: false,
      });

      expect(result.isError).toBeUndefined();
      expect(provider.deleteSchema).toHaveBeenCalledWith("user1", "contacts", false);
    });

    it("passes deleteData flag to provider", async () => {
      (provider.deleteSchema as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await callTool(server, "delete_schema", {
        userId: "user1",
        schemaName: "contacts",
        deleteData: true,
      });

      expect(provider.deleteSchema).toHaveBeenCalledWith("user1", "contacts", true);
    });

    it("returns CONFLICT when schema has records and deleteData is false", async () => {
      const { ConflictError } = await import("../src/errors.js");
      (provider.deleteSchema as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ConflictError("Schema 'contacts' has 5 records"),
      );

      const result = await callTool(server, "delete_schema", {
        userId: "user1",
        schemaName: "contacts",
        deleteData: false,
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("CONFLICT");
    });
  });
});
