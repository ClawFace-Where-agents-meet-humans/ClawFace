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
    registerSchemaTools(server, provider, "user1");
  });

  describe("define_schema", () => {
    it("creates a schema with valid input and auto-fills defaults", async () => {
      const mockDoc: SchemaDoc = {
        id: "user1:contacts",
        pk: "user1",
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
        schemaName: "My Contacts",
        fields: { name: { type: "string" } },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("rejects empty fields", async () => {
      const result = await callTool(server, "define_schema", {
        schemaName: "test",
        fields: {},
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("rejects mismatched inputType/type", async () => {
      const result = await callTool(server, "define_schema", {
        schemaName: "test",
        fields: { age: { type: "number", inputType: "textarea" } },
      });

      expect(result.isError).toBe(true);
    });

    it("rejects select without options", async () => {
      const result = await callTool(server, "define_schema", {
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
          schemaName: "contacts",
          displayName: "Contacts",
          fields: { name: { type: "string" }, email: { type: "string" } },
          version: 2,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        },
      ];
      (provider.listSchemas as ReturnType<typeof vi.fn>).mockResolvedValue(schemas);

      const result = await callTool(server, "list_schemas", {});
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
          schemaName: "contacts",
          fields: { name: { type: "string" }, email: { type: "string" } },
          version: 1,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];
      (provider.listSchemas as ReturnType<typeof vi.fn>).mockResolvedValue(schemas);

      const result = await callTool(server, "list_schemas", {});
      const body = parseResult(result) as Array<{ fieldNames: string[] }>;

      expect(body[0].fieldNames).toEqual(["name", "email"]);
    });

    it("returns empty array when no schemas", async () => {
      (provider.listSchemas as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await callTool(server, "list_schemas", {});
      const body = parseResult(result) as unknown[];

      expect(body).toHaveLength(0);
    });
  });

  describe("get_schema", () => {
    it("returns full schema doc", async () => {
      const schema: SchemaDoc = {
        id: "user1:contacts",
        pk: "user1",
        schemaName: "contacts",
        fields: { name: { type: "string" } },
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

      const result = await callTool(server, "get_schema", {
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
        schemaName: "contacts",
        fields: { name: { type: "string" } },
        version: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

      const result = await callTool(server, "get_schema", {
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
        schemaName: "nonexistent",
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; hint: string };
      expect(body.error).toBe("NOT_FOUND");
      expect(body.hint).toContain("define_schema");
    });
  });

  describe("update_schema", () => {
    const existingSchema: SchemaDoc = {
      id: "user1:contacts",
      pk: "user1",
      schemaName: "contacts",
      fields: {
        name: { type: "string", label: "Name", inputType: "text", order: 1 },
        email: { type: "string", label: "Email", inputType: "text", order: 2 },
      },
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    it("updates schema fields and increments version", async () => {
      // getSchema is called to merge fields
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(existingSchema);

      const updated: SchemaDoc = {
        id: "user1:contacts",
        pk: "user1",
        schemaName: "contacts",
        fields: { name: { type: "string" }, phone: { type: "string" } },
        version: 2,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      };
      (provider.updateSchema as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        fields: { name: { type: "string" }, phone: { type: "string" } },
      });

      expect(result.isError).toBeUndefined();
      const body = parseResult(result) as SchemaDoc;
      expect(body.version).toBe(2);
    });

    it("merges incoming fields with existing fields instead of replacing", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(existingSchema);
      (provider.updateSchema as ReturnType<typeof vi.fn>).mockImplementation(
        (_uid: string, _name: string, input: Partial<SchemaInput>) => {
          return Promise.resolve({ ...existingSchema, ...input, version: 2, updatedAt: "2026-01-02T00:00:00Z" });
        },
      );

      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        fields: { phone: { type: "string" } },
      });

      expect(result.isError).toBeUndefined();
      // The merged fields sent to updateSchema should contain all three: name, email, phone
      const updateCall = (provider.updateSchema as ReturnType<typeof vi.fn>).mock.calls[0];
      const inputFields = updateCall[2].fields;
      expect(inputFields).toHaveProperty("name");   // existing field preserved
      expect(inputFields).toHaveProperty("email");   // existing field preserved
      expect(inputFields).toHaveProperty("phone");   // new field added
    });

    it("validates updated fields", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(existingSchema);

      const result = await callTool(server, "update_schema", {
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
        schemaName: "nonexistent",
        displayName: "Updated",
      });

      expect(result.isError).toBe(true);
    });

    it("returns NOT_FOUND when updating fields on nonexistent schema", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callTool(server, "update_schema", {
        schemaName: "nonexistent",
        fields: { title: { type: "string" } },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("NOT_FOUND");
    });

    it("returns INVALID_INPUT when no recognized update fields are provided", async () => {
      // Simulates agent passing unknown params like 'patch' that get silently stripped by Zod
      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        // No recognized update fields — all are undefined
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string; hint: string };
      expect(body.error).toBe("INVALID_INPUT");
      expect(body.message).toContain("No update fields provided");
      expect(body.hint).toBeTruthy();
    });

    it("rejects groups-only update that orphans existing field group references", async () => {
      const schemaWithGroups: SchemaDoc = {
        ...existingSchema,
        fields: {
          name: { type: "string", label: "Name", inputType: "text", order: 1, group: "personal" },
          email: { type: "string", label: "Email", inputType: "text", order: 2, group: "contact" },
        },
        groups: [
          { key: "personal", label: "Personal", order: 1 },
          { key: "contact", label: "Contact", order: 2 },
        ],
      };
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schemaWithGroups);

      // Update groups to remove "contact" — email field still references it
      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        groups: [{ key: "personal", label: "Personal Info", order: 1 }],
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("allows groups-only update when all field refs remain valid", async () => {
      const schemaWithGroups: SchemaDoc = {
        ...existingSchema,
        fields: {
          name: { type: "string", label: "Name", inputType: "text", order: 1, group: "personal" },
        },
        groups: [
          { key: "personal", label: "Personal", order: 1 },
          { key: "unused", label: "Unused", order: 2 },
        ],
      };
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schemaWithGroups);
      (provider.updateSchema as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...schemaWithGroups,
        groups: [{ key: "personal", label: "Personal Renamed", order: 1 }],
        version: 2,
      });

      // Remove unused group — no field references it
      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        groups: [{ key: "personal", label: "Personal Renamed", order: 1 }],
      });

      expect(result.isError).toBeUndefined();
    });

    it("returns NOT_FOUND when updating groups on nonexistent schema", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callTool(server, "update_schema", {
        schemaName: "nonexistent",
        groups: [{ key: "info", label: "Info", order: 1 }],
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("NOT_FOUND");
    });
  });

  describe("delete_schema", () => {
    it("deletes schema successfully", async () => {
      (provider.deleteSchema as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await callTool(server, "delete_schema", {
        schemaName: "contacts",
        deleteData: false,
      });

      expect(result.isError).toBeUndefined();
      expect(provider.deleteSchema).toHaveBeenCalledWith("user1", "contacts", false);
    });

    it("passes deleteData flag to provider", async () => {
      (provider.deleteSchema as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await callTool(server, "delete_schema", {
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
        schemaName: "contacts",
        deleteData: false,
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("CONFLICT");
    });
  });

  describe("unknown parameter rejection", () => {
    it("rejects unknown 'patch' parameter on update_schema", async () => {
      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        patch: { fields: { title: { type: "string" } } },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string; hint: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'patch'");
      expect(body.hint).toContain("Valid parameters");
    });

    it("rejects unknown parameter alongside valid ones on update_schema", async () => {
      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        displayName: "Updated",
        patch: { fields: { title: { type: "string" } } },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'patch'");
    });

    it("rejects unknown parameter on define_schema", async () => {
      const result = await callTool(server, "define_schema", {
        schemaName: "contacts",
        fields: { name: { type: "string" } },
        schema: { displayName: "Wrong wrapper" },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'schema'");
    });

    it("rejects unknown parameter on get_schema", async () => {
      const result = await callTool(server, "get_schema", {
        schemaName: "contacts",
        includeRecords: true,
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'includeRecords'");
    });

    it("rejects unknown parameter on delete_schema", async () => {
      const result = await callTool(server, "delete_schema", {
        schemaName: "contacts",
        force: true,
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'force'");
    });

    it("reports multiple unknown parameters at once", async () => {
      const result = await callTool(server, "update_schema", {
        schemaName: "contacts",
        patch: {},
        data: {},
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'patch'");
      expect(body.message).toContain("'data'");
    });
  });
});
