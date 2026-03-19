import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DbProvider, FieldDef, FilterOp, QueryFilter, SchemaDoc } from "../types.js";
import { MAX_QUERY_LIMIT, DEFAULT_QUERY_LIMIT, toRecordResponse } from "../types.js";
import { validateRecordData } from "../validation.js";
import {
  DbMcpError,
  NotFoundError,
  RecordValidationError,
  toMcpErrorResult,
} from "../errors.js";
import { enableStrictArgs } from "./strict-args.js";

// ── Filter Validation ────────────────────────────────────────────────────────

const COMPARISON_OPS: FilterOp[] = ["gt", "gte", "lt", "lte"];

function validateQueryFilters(
  schema: SchemaDoc,
  filters: QueryFilter[],
): string | null {
  const fieldNames = Object.keys(schema.fields);

  for (const filter of filters) {
    // Check field exists in schema
    if (!(filter.field in schema.fields)) {
      return (
        `Field '${filter.field}' not in schema. ` +
        `Available fields: [${fieldNames.join(", ")}]`
      );
    }

    const fieldDef: FieldDef = schema.fields[filter.field];

    // gt/lt/gte/lte not valid on boolean
    if (fieldDef.type === "boolean" && COMPARISON_OPS.includes(filter.op)) {
      return (
        `Operator '${filter.op}' is not valid on boolean field '${filter.field}'. ` +
        `Use 'eq' or 'ne' instead`
      );
    }

    // contains only valid on string
    if (filter.op === "contains" && fieldDef.type !== "string") {
      return (
        `Operator 'contains' is only valid on string fields. ` +
        `Field '${filter.field}' is type '${fieldDef.type}'`
      );
    }
  }

  return null;
}

// ── Register Data Tools ──────────────────────────────────────────────────────

/**
 * @param userId - The authenticated user ID, resolved from HTTP auth headers
 *   (x-user-id or API key). All tool operations are scoped to this user.
 */
export function registerDataTools(server: McpServer, provider: DbProvider, userId: string): void {
  // ── create_record ──────────────────────────────────────────────────────

  server.tool(
    "create_record",
    "Create a new record in an existing schema. The data object must contain all " +
      "required fields and match the schema's field types exactly. Call get_schema " +
      "first if you're unsure of the field names and types. Do NOT guess field names.",
    {
      schemaName: z.string().min(1).describe("The schema to create a record in"),
      data: z.record(z.unknown()).describe("Record data matching the schema field definitions"),
    },
    async ({ schemaName, data }) => {
      try {
        // Fetch schema first
        const schema = await provider.getSchema(userId, schemaName);
        if (!schema) {
          throw new NotFoundError(
            "Schema",
            schemaName,
            `Schema '${schemaName}' does not exist for this user. Use define_schema first.`,
          );
        }

        // Reject empty data
        if (Object.keys(data).length === 0) {
          throw new RecordValidationError(
            [{ field: "data", message: "Data object must contain at least one field value" }],
            schemaName,
          );
        }

        // Validate data against schema
        const errors = validateRecordData(schema, data);
        if (errors.length > 0) {
          throw new RecordValidationError(errors, schemaName);
        }

        // Create record
        const doc = await provider.createRecord(userId, schemaName, data);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(toRecordResponse(doc), null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  enableStrictArgs(server, "create_record", ["schemaName", "data"]);

  // ── get_record ─────────────────────────────────────────────────────────

  server.tool(
    "get_record",
    "Get a single record by its ID. Returns the full record document including " +
      "data, timestamps, and schema reference.",
    {
      recordId: z.string().min(1).describe("The record UUID to retrieve"),
    },
    async ({ recordId }) => {
      try {
        const doc = await provider.getRecord(userId, recordId);
        if (!doc) {
          throw new NotFoundError("Record", recordId, "Use query_records to find records by schema, or verify the recordId");
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(toRecordResponse(doc), null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  enableStrictArgs(server, "get_record", ["recordId"]);

  // ── update_record ──────────────────────────────────────────────────────

  server.tool(
    "update_record",
    "Update an existing record. You must provide the COMPLETE data object — this is " +
      "a full replace, NOT a partial patch. ALL fields (including unchanged ones) must " +
      "be included, or required fields will fail validation.\n\n" +
      "Workflow: 1) get_record to fetch current data, 2) modify the fields you need, " +
      "3) send the FULL data object back here.",
    {
      recordId: z.string().min(1).describe("The record UUID to update"),
      data: z.record(z.unknown()).describe("Complete replacement data matching the schema"),
    },
    async ({ recordId, data }) => {
      try {
        // Fetch existing record first
        const existing = await provider.getRecord(userId, recordId);
        if (!existing) {
          throw new NotFoundError("Record", recordId, "Use query_records to find records by schema, or verify the recordId");
        }

        // Fetch schema for validation
        const schema = await provider.getSchema(userId, existing.schemaName);
        if (!schema) {
          throw new NotFoundError(
            "Schema",
            existing.schemaName,
            `Schema '${existing.schemaName}' no longer exists. The record's schema may have been deleted.`,
          );
        }

        // Reject empty data
        if (Object.keys(data).length === 0) {
          throw new RecordValidationError(
            [{ field: "data", message: "Data object must contain at least one field value" }],
            existing.schemaName,
          );
        }

        // Validate data against schema
        const errors = validateRecordData(schema, data);
        if (errors.length > 0) {
          throw new RecordValidationError(errors, existing.schemaName);
        }

        // Update record
        const doc = await provider.updateRecord(userId, recordId, data);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(toRecordResponse(doc), null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  enableStrictArgs(server, "update_record", ["recordId", "data"]);

  // ── delete_record ──────────────────────────────────────────────────────

  server.tool(
    "delete_record",
    "Delete a single record by its ID. This action is permanent and cannot be undone.",
    {
      recordId: z.string().min(1).describe("The record UUID to delete"),
    },
    async ({ recordId }) => {
      try {
        await provider.deleteRecord(userId, recordId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ message: `Record '${recordId}' deleted successfully` }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  enableStrictArgs(server, "delete_record", ["recordId"]);

  // ── query_records ──────────────────────────────────────────────────────

  server.tool(
    "query_records",
    "Search records within a schema. Use filters for precise queries. Always specify " +
      "a reasonable limit (default 20, max 100). Use get_schema first to know which " +
      "fields are available for filtering.",
    {
      schemaName: z.string().min(1).describe("The schema to query records from"),
      filters: z
        .array(
          z.object({
            field: z.string(),
            op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "contains"]),
            value: z.unknown(),
          }),
        )
        .optional()
        .describe("Filters: eq, ne, gt, gte, lt, lte, contains"),
      orderBy: z.string().optional().describe("Field name to order results by"),
      orderDir: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: asc)"),
      limit: z.number().optional().describe("Max results to return (default 20, max 100)"),
      offset: z.number().optional().describe("Number of results to skip (for pagination)"),
    },
    async ({ schemaName, filters, orderBy, orderDir, limit, offset }) => {
      try {
        // Check if schema exists (for filter validation + warning)
        const schema = await provider.getSchema(userId, schemaName);
        let warning: string | undefined;

        if (!schema) {
          // Edge case #22: query on nonexistent schema → return empty with warning
          warning = `Schema '${schemaName}' not found. Results may be empty.`;
        }

        // Validate filters against schema if both exist
        if (schema && filters && filters.length > 0) {
          const filterError = validateQueryFilters(schema, filters as QueryFilter[]);
          if (filterError) {
            throw new DbMcpError("VALIDATION_ERROR", filterError, `Use get_schema('${schemaName}') to see available fields`);
          }
        }

        // Validate orderBy against schema fields
        if (schema && orderBy && !(orderBy in schema.fields)) {
          const fieldNames = Object.keys(schema.fields);
          throw new DbMcpError(
            "VALIDATION_ERROR",
            `Cannot order by '${orderBy}' — field not in schema. Available fields: [${fieldNames.join(", ")}]`,
            `Use get_schema('${schemaName}') to see available fields`,
          );
        }

        // Cap limit and clamp offset
        const cappedLimit = Math.min(limit ?? DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
        const clampedOffset = Math.max(offset ?? 0, 0);

        const result = await provider.queryRecords(userId, schemaName, {
          filters: filters as QueryFilter[] | undefined,
          orderBy,
          orderDir,
          limit: cappedLimit,
          offset: clampedOffset,
        });

        const responseBody: { records: unknown[]; total: number; warning?: string } = {
          records: result.records.map(toRecordResponse),
          total: result.total,
        };
        if (warning) {
          responseBody.warning = warning;
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(responseBody, null, 2) }],
        };
      } catch (err) {
        if (err instanceof DbMcpError) return toMcpErrorResult(err);
        return toMcpErrorResult(new DbMcpError("INTERNAL_ERROR", `Unexpected error: ${(err as Error).message}`, "Retry the operation or contact support"));
      }
    },
  );

  enableStrictArgs(server, "query_records", [
    "schemaName", "filters", "orderBy", "orderDir", "limit", "offset",
  ]);
}
