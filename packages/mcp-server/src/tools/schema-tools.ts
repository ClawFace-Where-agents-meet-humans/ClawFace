import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DbProvider } from "../types.js";
import { toSchemaResponse } from "../types.js";
import { validateSchemaInput, normalizeSchemaInput } from "../validation.js";
import { SchemaValidationError, NotFoundError, DbMcpError, toMcpErrorResult } from "../errors.js";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const fieldDefSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z.object({
    type: z.enum(["string", "number", "boolean", "date", "array", "object"]),
    required: z.boolean().optional(),
    description: z.string().optional(),
    label: z.string().optional(),
    inputType: z.enum(["text", "textarea", "select", "date", "toggle", "number", "list", "group"]).optional(),
    options: z.array(z.string()).optional(),
    displayFormat: z.string().optional(),
    order: z.number().optional(),
    group: z.string().optional(),
    hint: z.string().optional(),
    default: z.unknown().optional(),
    items: z.record(z.unknown()).optional(),
    properties: z.record(z.record(z.unknown())).optional(),
  }),
);

const groupDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  order: z.number(),
});

// ── Register Schema Tools ────────────────────────────────────────────────────

export function registerSchemaTools(server: McpServer, provider: DbProvider): void {
  // ── define_schema ────────────────────────────────────────────────────────

  server.tool(
    "define_schema",
    "Define a new data schema for structured storage. ALWAYS include: displayName, " +
      "description, purpose (why it exists), and instructions (how an agent should use it). " +
      "These make the schema self-documenting — any new agent can understand it without context.\n\n" +
      "Type → inputType compatibility (server rejects mismatches):\n" +
      "  string  → text, textarea, select (default: text)\n" +
      "  number  → number (default: number)\n" +
      "  boolean → toggle (default: toggle)\n" +
      "  date    → date (default: date)\n" +
      "  array   → list (default: list)\n" +
      "  object  → group (default: group)\n\n" +
      "Field-level hints: use 'hint' to tell future agents how to populate a field, " +
      "and 'default' for default values.\n\n" +
      "Check list_schemas first to avoid duplicates.",
    {
      userId: z.string().describe("The user ID who owns this schema"),
      schemaName: z.string().describe("Lowercase alphanumeric with underscores, e.g. 'contacts', 'todo_items'"),
      displayName: z.string().optional().describe("Human-readable title, e.g. 'My Contacts'"),
      description: z.string().optional().describe("Brief description of what this data represents"),
      icon: z.string().optional().describe("Icon hint for UI, e.g. 'users', 'clipboard'"),
      fields: z.record(fieldDefSchema).describe("Field definitions with type, label, inputType, hint, default, etc."),
      groups: z.array(groupDefSchema).optional().describe("Optional field grouping for form layout"),
      purpose: z.string().optional().describe("WHY this schema was created — the business reason. E.g. 'Track sales contacts for CRM pipeline'"),
      instructions: z.string().optional().describe("HOW an agent should use this schema — when to create/query/update records. E.g. 'Create a record when user mentions a new contact. Always ask for name and email before saving.'"),
      examples: z.array(z.record(z.unknown())).optional().describe("1-3 sample records showing expected data shape. Helps new agents understand the schema."),
      tags: z.array(z.string()).optional().describe("Tags for categorization/discovery, e.g. ['crm', 'sales']"),
      createdBy: z.string().optional().describe("Who/what created this schema: 'openclaw', 'user:mohit', 'nemoclaw'"),
    },
    async ({ userId, schemaName, displayName, description, icon, fields, groups, purpose, instructions, examples, tags, createdBy }) => {
      try {
        // Layer 1: validate schema structure
        const input = {
          displayName, description, icon,
          fields: fields as unknown as Record<string, import("../types.js").FieldDef>,
          groups, purpose, instructions,
          examples: examples as Record<string, unknown>[] | undefined,
          tags, createdBy,
        };
        const validationErrors = validateSchemaInput(schemaName, input);
        if (validationErrors.length > 0) {
          throw new SchemaValidationError(validationErrors, "Fix the field definitions and try again");
        }

        // Normalize (auto-fill defaults)
        const normalized = normalizeSchemaInput(input);

        // Create in DB
        const doc = await provider.createSchema(userId, schemaName, normalized);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(toSchemaResponse(doc), null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  // ── list_schemas ─────────────────────────────────────────────────────────

  server.tool(
    "list_schemas",
    "List all schemas defined by a user. Returns metadata including purpose, instructions, " +
      "and tags — enough for any agent to understand what each schema is for without prior context.",
    {
      userId: z.string().describe("The user ID whose schemas to list"),
    },
    async ({ userId }) => {
      try {
        const schemas = await provider.listSchemas(userId);
        const summary = schemas.map((s) => ({
          schemaName: s.schemaName,
          displayName: s.displayName,
          description: s.description,
          purpose: s.purpose,
          instructions: s.instructions,
          tags: s.tags,
          createdBy: s.createdBy,
          version: s.version,
          fieldCount: Object.keys(s.fields).length,
          fieldNames: Object.keys(s.fields),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  // ── get_schema ───────────────────────────────────────────────────────────

  server.tool(
    "get_schema",
    "Get the full schema definition including all field definitions and UI metadata. " +
      "Use this before create_record or update_record to know exactly which fields " +
      "are available and their types.",
    {
      userId: z.string().describe("The user ID who owns this schema"),
      schemaName: z.string().describe("The schema name to retrieve"),
    },
    async ({ userId, schemaName }) => {
      try {
        const doc = await provider.getSchema(userId, schemaName);
        if (!doc) {
          return toMcpErrorResult(
            new NotFoundError(
              "Schema",
              schemaName,
              "Use define_schema to create it first, or list_schemas to see available schemas",
            ),
          );
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(toSchemaResponse(doc), null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  // ── update_schema ────────────────────────────────────────────────────────

  server.tool(
    "update_schema",
    "Update an existing schema definition. You can update fields, display metadata, " +
      "or groups. The version will be incremented. Note: existing records are NOT " +
      "re-validated against the updated schema.",
    {
      userId: z.string().describe("The user ID who owns this schema"),
      schemaName: z.string().describe("The schema name to update"),
      displayName: z.string().optional().describe("Updated human-readable title"),
      description: z.string().optional().describe("Updated description"),
      icon: z.string().optional().describe("Updated icon hint"),
      fields: z.record(fieldDefSchema).optional().describe("Updated field definitions (full replace)"),
      groups: z.array(groupDefSchema).optional().describe("Updated field groups"),
      purpose: z.string().optional().describe("Updated purpose"),
      instructions: z.string().optional().describe("Updated agent instructions"),
      examples: z.array(z.record(z.unknown())).optional().describe("Updated example records"),
      tags: z.array(z.string()).optional().describe("Updated tags"),
      createdBy: z.string().optional().describe("Updated creator attribution"),
    },
    async ({ userId, schemaName, displayName, description, icon, fields, groups, purpose, instructions, examples, tags, createdBy }) => {
      try {
        const input: Partial<import("../types.js").SchemaInput> = {};
        if (displayName !== undefined) input.displayName = displayName;
        if (description !== undefined) input.description = description;
        if (icon !== undefined) input.icon = icon;
        if (groups !== undefined) input.groups = groups;
        if (purpose !== undefined) input.purpose = purpose;
        if (instructions !== undefined) input.instructions = instructions;
        if (examples !== undefined) input.examples = examples as Record<string, unknown>[];
        if (tags !== undefined) input.tags = tags;
        if (createdBy !== undefined) input.createdBy = createdBy;

        if (fields !== undefined) {
          const typedFields = fields as unknown as Record<string, import("../types.js").FieldDef>;
          // Validate if fields are being updated
          const validationErrors = validateSchemaInput(schemaName, { fields: typedFields, groups });
          if (validationErrors.length > 0) {
            throw new SchemaValidationError(validationErrors, "Fix the field definitions and try again");
          }
          const normalized = normalizeSchemaInput({ fields: typedFields, groups });
          input.fields = normalized.fields;
        }

        const doc = await provider.updateSchema(userId, schemaName, input);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(toSchemaResponse(doc), null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  // ── delete_schema ────────────────────────────────────────────────────────

  server.tool(
    "delete_schema",
    "Delete a schema definition. WARNING: If the schema has records, you must set " +
      "deleteData: true or delete all records first. Prefer asking the user for " +
      "confirmation before deleting.",
    {
      userId: z.string().describe("The user ID who owns this schema"),
      schemaName: z.string().describe("The schema name to delete"),
      deleteData: z
        .boolean()
        .default(false)
        .describe("Set to true to also delete all records. Default: false (fail if records exist)"),
    },
    async ({ userId, schemaName, deleteData }) => {
      try {
        await provider.deleteSchema(userId, schemaName, deleteData);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                message: `Schema '${schemaName}' deleted successfully${deleteData ? " (including all records)" : ""}`,
              }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );
}
