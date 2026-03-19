import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDataTools } from "../src/tools/data-tools.js";
import type { DbProvider, SchemaDoc, RecordDoc } from "../src/types.js";

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

// ── Test Schema ──────────────────────────────────────────────────────────────

const testSchema: SchemaDoc = {
  id: "user1:contacts",
  pk: "user1",
  userId: "user1",
  schemaName: "contacts",
  displayName: "Contacts",
  fields: {
    name: { type: "string", required: true, label: "Name", inputType: "text", order: 1 },
    email: { type: "string", required: false, label: "Email", inputType: "text", order: 2 },
    age: { type: "number", required: false, label: "Age", inputType: "number", order: 3 },
    active: { type: "boolean", required: false, label: "Active", inputType: "toggle", order: 4 },
    role: {
      type: "string",
      required: false,
      label: "Role",
      inputType: "select",
      options: ["admin", "user", "guest"],
      order: 5,
    },
  },
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const testRecord: RecordDoc = {
  id: "rec-uuid-1",
  pk: "user1",
  userId: "user1",
  schemaName: "contacts",
  data: { name: "John", email: "john@example.com" },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("data-tools", () => {
  let server: McpServer;
  let provider: DbProvider;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    provider = createMockProvider();
    registerDataTools(server, provider);
  });

  // ── create_record ────────────────────────────────────────────────────────

  describe("create_record", () => {
    it("creates a record with valid data", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);
      (provider.createRecord as ReturnType<typeof vi.fn>).mockResolvedValue(testRecord);

      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "contacts",
        data: { name: "John", email: "john@example.com" },
      });

      expect(result.isError).toBeUndefined();
      const body = parseResult(result) as RecordDoc;
      expect(body.id).toBe("rec-uuid-1");
      expect(body.data.name).toBe("John");
    });

    it("rejects when schema does not exist", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "nonexistent",
        data: { name: "John" },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; hint: string };
      expect(body.error).toBe("NOT_FOUND");
      expect(body.hint).toContain("define_schema");
    });

    it("rejects empty data object", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "contacts",
        data: {},
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("VALIDATION_ERROR");
    });

    it("rejects missing required fields", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "contacts",
        data: { email: "john@example.com" }, // missing required 'name'
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; details: Array<{ field: string }> };
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: "name" }),
      );
    });

    it("rejects unknown fields", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "contacts",
        data: { name: "John", unknownField: "value" },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { details: Array<{ field: string; message: string }> };
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: "unknownField" }),
      );
    });

    it("rejects wrong type (no coercion)", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "contacts",
        data: { name: "John", age: "42" }, // string not number
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { details: Array<{ field: string; message: string }> };
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: "age", message: expect.stringContaining("number") }),
      );
    });

    it("rejects invalid select option", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "contacts",
        data: { name: "John", role: "superadmin" },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { details: Array<{ field: string }> };
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: "role" }),
      );
    });
  });

  // ── get_record ───────────────────────────────────────────────────────────

  describe("get_record", () => {
    it("returns a record by id", async () => {
      (provider.getRecord as ReturnType<typeof vi.fn>).mockResolvedValue(testRecord);

      const result = await callTool(server, "get_record", {
        userId: "user1",
        recordId: "rec-uuid-1",
      });

      expect(result.isError).toBeUndefined();
      const body = parseResult(result) as RecordDoc;
      expect(body.id).toBe("rec-uuid-1");
    });

    it("returns NOT_FOUND with actionable hint for nonexistent record", async () => {
      (provider.getRecord as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callTool(server, "get_record", {
        userId: "user1",
        recordId: "nonexistent",
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; hint: string };
      expect(body.error).toBe("NOT_FOUND");
      expect(body.hint).toContain("query_records");
    });

    it("returns INTERNAL_ERROR for unexpected exceptions", async () => {
      (provider.getRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Cosmos connection timeout"),
      );

      const result = await callTool(server, "get_record", {
        userId: "user1",
        recordId: "some-id",
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string; hint: string };
      expect(body.error).toBe("INTERNAL_ERROR");
      expect(body.message).toContain("Cosmos connection timeout");
      expect(body.hint).toBeDefined();
    });
  });

  // ── update_record ────────────────────────────────────────────────────────

  describe("update_record", () => {
    it("updates a record with valid data (full replace)", async () => {
      const existingRecord: RecordDoc = { ...testRecord };
      const updatedRecord: RecordDoc = {
        ...testRecord,
        data: { name: "Jane", email: "jane@example.com" },
        updatedAt: "2026-01-02T00:00:00Z",
      };

      (provider.getRecord as ReturnType<typeof vi.fn>).mockResolvedValue(existingRecord);
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);
      (provider.updateRecord as ReturnType<typeof vi.fn>).mockResolvedValue(updatedRecord);

      const result = await callTool(server, "update_record", {
        userId: "user1",
        recordId: "rec-uuid-1",
        data: { name: "Jane", email: "jane@example.com" },
      });

      expect(result.isError).toBeUndefined();
      const body = parseResult(result) as RecordDoc;
      expect(body.data.name).toBe("Jane");
    });

    it("rejects when record not found", async () => {
      (provider.getRecord as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callTool(server, "update_record", {
        userId: "user1",
        recordId: "nonexistent",
        data: { name: "Jane" },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("NOT_FOUND");
    });

    it("validates data against schema before updating", async () => {
      (provider.getRecord as ReturnType<typeof vi.fn>).mockResolvedValue(testRecord);
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "update_record", {
        userId: "user1",
        recordId: "rec-uuid-1",
        data: { email: "no-name@example.com" }, // missing required 'name'
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; details: Array<{ field: string }> };
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: "name" }),
      );
      // Should NOT have called updateRecord on the provider
      expect(provider.updateRecord).not.toHaveBeenCalled();
    });

    it("rejects empty data object", async () => {
      (provider.getRecord as ReturnType<typeof vi.fn>).mockResolvedValue(testRecord);
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "update_record", {
        userId: "user1",
        recordId: "rec-uuid-1",
        data: {},
      });

      expect(result.isError).toBe(true);
    });
  });

  // ── delete_record ────────────────────────────────────────────────────────

  describe("delete_record", () => {
    it("deletes a record", async () => {
      (provider.deleteRecord as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await callTool(server, "delete_record", {
        userId: "user1",
        recordId: "rec-uuid-1",
      });

      expect(result.isError).toBeUndefined();
      expect(provider.deleteRecord).toHaveBeenCalledWith("user1", "rec-uuid-1");
    });

    it("returns NOT_FOUND for nonexistent record", async () => {
      const { NotFoundError } = await import("../src/errors.js");
      (provider.deleteRecord as ReturnType<typeof vi.fn>).mockRejectedValue(
        new NotFoundError("Record", "nonexistent"),
      );

      const result = await callTool(server, "delete_record", {
        userId: "user1",
        recordId: "nonexistent",
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string };
      expect(body.error).toBe("NOT_FOUND");
    });
  });

  // ── query_records ────────────────────────────────────────────────────────

  describe("query_records", () => {
    it("queries records with no filters", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);
      (provider.queryRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [testRecord],
        total: 1,
      });

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
      });

      expect(result.isError).toBeUndefined();
      const body = parseResult(result) as { records: RecordDoc[]; total: number };
      expect(body.records).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it("queries with filters", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);
      (provider.queryRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [testRecord],
        total: 1,
      });

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        filters: [{ field: "name", op: "eq", value: "John" }],
        limit: 10,
      });

      expect(result.isError).toBeUndefined();
      expect(provider.queryRecords).toHaveBeenCalledWith(
        "user1",
        "contacts",
        expect.objectContaining({
          filters: [{ field: "name", op: "eq", value: "John" }],
          limit: 10,
        }),
      );
    });

    it("returns warning for nonexistent schema", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (provider.queryRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [],
        total: 0,
      });

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "nonexistent",
      });

      expect(result.isError).toBeUndefined();
      const body = parseResult(result) as { records: RecordDoc[]; total: number; warning?: string };
      expect(body.warning).toBeDefined();
      expect(body.warning).toContain("nonexistent");
    });

    it("rejects filter on nonexistent field", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        filters: [{ field: "fone", op: "eq", value: "123" }],
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.message).toContain("fone");
      expect(body.message).toContain("name"); // lists valid fields
    });

    it("rejects gt/lt on boolean fields", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        filters: [{ field: "active", op: "gt", value: true }],
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.message).toContain("boolean");
    });

    it("rejects contains on non-string fields", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        filters: [{ field: "age", op: "contains", value: 3 }],
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.message).toContain("contains");
    });

    it("rejects orderBy on nonexistent field", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        orderBy: "nonexistent_field",
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.message).toContain("nonexistent_field");
      expect(body.message).toContain("name"); // lists valid fields
    });

    it("strips pk from record responses", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);
      (provider.queryRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [testRecord],
        total: 1,
      });

      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
      });

      const body = parseResult(result) as { records: Array<Record<string, unknown>> };
      expect(body.records[0]).not.toHaveProperty("pk");
      expect(body.records[0]).toHaveProperty("id"); // record id is kept (needed for get/update/delete)
    });

    it("caps limit at 100", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);
      (provider.queryRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [],
        total: 0,
      });

      await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        limit: 500,
      });

      expect(provider.queryRecords).toHaveBeenCalledWith(
        "user1",
        "contacts",
        expect.objectContaining({ limit: 100 }),
      );
    });

    it("clamps negative offset to 0", async () => {
      (provider.getSchema as ReturnType<typeof vi.fn>).mockResolvedValue(testSchema);
      (provider.queryRecords as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [],
        total: 0,
      });

      await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        offset: -10,
      });

      expect(provider.queryRecords).toHaveBeenCalledWith(
        "user1",
        "contacts",
        expect.objectContaining({ offset: 0 }),
      );
    });
  });

  describe("unknown parameter rejection", () => {
    it("rejects unknown parameter on create_record", async () => {
      const result = await callTool(server, "create_record", {
        userId: "user1",
        schemaName: "contacts",
        data: { name: "Alice" },
        validate: true,
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string; hint: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'validate'");
      expect(body.hint).toContain("Valid parameters");
    });

    it("rejects unknown parameter on get_record", async () => {
      const result = await callTool(server, "get_record", {
        userId: "user1",
        recordId: "rec-123",
        includeSchema: true,
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'includeSchema'");
    });

    it("rejects unknown parameter on update_record", async () => {
      const result = await callTool(server, "update_record", {
        userId: "user1",
        recordId: "rec-123",
        data: { name: "Bob" },
        patch: { email: "bob@test.com" },
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'patch'");
    });

    it("rejects unknown parameter on delete_record", async () => {
      const result = await callTool(server, "delete_record", {
        userId: "user1",
        recordId: "rec-123",
        force: true,
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'force'");
    });

    it("rejects unknown parameter on query_records", async () => {
      const result = await callTool(server, "query_records", {
        userId: "user1",
        schemaName: "contacts",
        search: "alice",
      });

      expect(result.isError).toBe(true);
      const body = parseResult(result) as { error: string; message: string };
      expect(body.error).toBe("UNKNOWN_PARAMETERS");
      expect(body.message).toContain("'search'");
    });
  });
});
