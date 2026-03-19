import { CosmosClient, type Container, type Database, type SqlParameter } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";
import type {
  DbProvider,
  SchemaDoc,
  SchemaInput,
  RecordDoc,
  ApiKeyDoc,
  QueryOptions,
  QueryResult,
  FilterOp,
} from "../types.js";
import { MAX_QUERY_LIMIT, DEFAULT_QUERY_LIMIT } from "../types.js";
import { NotFoundError, ConflictError } from "../errors.js";

// ── Singleton CosmosClient ───────────────────────────────────────────────────

let client: CosmosClient | null = null;

function getClient(): CosmosClient {
  if (client) return client;

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("COSMOS_CONNECTION_STRING environment variable is required");
  }

  client = new CosmosClient(connectionString);
  return client;
}

// ── CosmosDbProvider ─────────────────────────────────────────────────────────

export class CosmosDbProvider implements DbProvider {
  private readonly dbName: string;
  private db: Database | null = null;
  private schemasContainer: Container | null = null;
  private recordsContainer: Container | null = null;
  private apiKeysContainer: Container | null = null;

  constructor() {
    this.dbName = process.env.COSMOS_DB_NAME ?? "clawface-mcp-server";
  }

  private getDb(): Database {
    if (!this.db) {
      this.db = getClient().database(this.dbName);
    }
    return this.db;
  }

  private getSchemas(): Container {
    if (!this.schemasContainer) {
      this.schemasContainer = this.getDb().container("schemas");
    }
    return this.schemasContainer;
  }

  private getRecords(): Container {
    if (!this.recordsContainer) {
      this.recordsContainer = this.getDb().container("records");
    }
    return this.recordsContainer;
  }

  private getApiKeys(): Container {
    if (!this.apiKeysContainer) {
      this.apiKeysContainer = this.getDb().container("apikeys");
    }
    return this.apiKeysContainer;
  }

  // ── Schema Operations ────────────────────────────────────────────────────

  async createSchema(
    userId: string,
    schemaName: string,
    input: SchemaInput,
  ): Promise<SchemaDoc> {
    const id = `${userId}:${schemaName}`;
    const now = new Date().toISOString();

    // Check for existing
    const existing = await this.getSchema(userId, schemaName);
    if (existing) {
      throw new ConflictError(
        `Schema '${schemaName}' already exists for this user (version ${existing.version}, ` +
          `${Object.keys(existing.fields).length} fields)`,
        `Use update_schema to modify it, or list_schemas to see all schemas`,
      );
    }

    const doc: SchemaDoc = {
      id,
      pk: userId,
      userId,
      schemaName,
      displayName: input.displayName,
      description: input.description,
      icon: input.icon,
      fields: input.fields,
      groups: input.groups,
      purpose: input.purpose,
      instructions: input.instructions,
      examples: input.examples,
      tags: input.tags,
      createdBy: input.createdBy,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    await this.getSchemas().items.create(doc);
    return doc;
  }

  async getSchema(userId: string, schemaName: string): Promise<SchemaDoc | null> {
    const id = `${userId}:${schemaName}`;
    try {
      const { resource } = await this.getSchemas().item(id, userId).read<SchemaDoc>();
      return resource ?? null;
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async listSchemas(userId: string): Promise<SchemaDoc[]> {
    const { resources } = await this.getSchemas().items
      .query<SchemaDoc>({
        query: "SELECT * FROM c WHERE c.pk = @pk",
        parameters: [{ name: "@pk", value: userId }],
      })
      .fetchAll();
    return resources;
  }

  async updateSchema(
    userId: string,
    schemaName: string,
    input: Partial<SchemaInput>,
  ): Promise<SchemaDoc> {
    const existing = await this.getSchema(userId, schemaName);
    if (!existing) {
      throw new NotFoundError("Schema", schemaName, `Use define_schema to create it first`);
    }

    const now = new Date().toISOString();
    const updated: SchemaDoc = {
      ...existing,
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.fields !== undefined && { fields: input.fields }),
      ...(input.groups !== undefined && { groups: input.groups }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.instructions !== undefined && { instructions: input.instructions }),
      ...(input.examples !== undefined && { examples: input.examples }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.createdBy !== undefined && { createdBy: input.createdBy }),
      version: existing.version + 1,
      updatedAt: now,
    };

    await this.getSchemas().item(existing.id, userId).replace(updated);
    return updated;
  }

  async deleteSchema(
    userId: string,
    schemaName: string,
    deleteData: boolean,
  ): Promise<void> {
    const existing = await this.getSchema(userId, schemaName);
    if (!existing) {
      throw new NotFoundError("Schema", schemaName);
    }

    if (!deleteData) {
      const count = await this.countRecords(userId, schemaName);
      if (count > 0) {
        throw new ConflictError(
          `Schema '${schemaName}' has ${count} records. ` +
            `Set deleteData: true to confirm deletion, or delete records first.`,
        );
      }
    }

    // Delete all records if requested
    if (deleteData) {
      const { resources } = await this.getRecords().items
        .query<{ id: string }>({
          query: "SELECT c.id FROM c WHERE c.pk = @pk AND c.schemaName = @schemaName",
          parameters: [
            { name: "@pk", value: userId },
            { name: "@schemaName", value: schemaName },
          ],
        })
        .fetchAll();

      for (const rec of resources) {
        await this.getRecords().item(rec.id, userId).delete();
      }
    }

    await this.getSchemas().item(existing.id, userId).delete();
  }

  // ── Record Operations ────────────────────────────────────────────────────

  async createRecord(
    userId: string,
    schemaName: string,
    data: Record<string, unknown>,
  ): Promise<RecordDoc> {
    const now = new Date().toISOString();
    const doc: RecordDoc = {
      id: uuidv4(),
      pk: userId,
      userId,
      schemaName,
      data,
      createdAt: now,
      updatedAt: now,
    };

    await this.getRecords().items.create(doc);
    return doc;
  }

  async getRecord(userId: string, recordId: string): Promise<RecordDoc | null> {
    try {
      const { resource } = await this.getRecords().item(recordId, userId).read<RecordDoc>();
      if (!resource) return null;
      // Cross-user isolation check
      if (resource.userId !== userId) return null;
      return resource;
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async updateRecord(
    userId: string,
    recordId: string,
    data: Record<string, unknown>,
  ): Promise<RecordDoc> {
    const existing = await this.getRecord(userId, recordId);
    if (!existing) {
      throw new NotFoundError("Record", recordId);
    }

    const now = new Date().toISOString();
    const updated: RecordDoc = {
      ...existing,
      data,
      updatedAt: now,
    };

    await this.getRecords().item(recordId, userId).replace(updated);
    return updated;
  }

  async deleteRecord(userId: string, recordId: string): Promise<void> {
    const existing = await this.getRecord(userId, recordId);
    if (!existing) {
      throw new NotFoundError("Record", recordId);
    }
    await this.getRecords().item(recordId, userId).delete();
  }

  async queryRecords(
    userId: string,
    schemaName: string,
    options: QueryOptions,
  ): Promise<QueryResult> {
    const limit = Math.min(options.limit ?? DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
    const offset = options.offset ?? 0;

    // Build parameterized query
    const params: SqlParameter[] = [
      { name: "@pk", value: userId },
      { name: "@schemaName", value: schemaName },
    ];

    let whereClause = "c.pk = @pk AND c.schemaName = @schemaName";
    let paramIdx = 0;

    if (options.filters) {
      for (const filter of options.filters) {
        const paramName = `@p${paramIdx++}`;
        const fieldPath = `c.data["${sanitizeFieldName(filter.field)}"]`;
        const sqlOp = filterOpToSql(filter.op, fieldPath, paramName);

        if (sqlOp) {
          whereClause += ` AND ${sqlOp}`;
          params.push({ name: paramName, value: filter.value as SqlParameter["value"] });
        }
      }
    }

    // Count query
    const countQuery = `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`;
    const { resources: countResult } = await this.getRecords().items
      .query<number>({ query: countQuery, parameters: params })
      .fetchAll();
    const total = countResult[0] ?? 0;

    // Data query
    let dataQuery = `SELECT * FROM c WHERE ${whereClause}`;
    if (options.orderBy) {
      const dir = options.orderDir ?? "asc";
      dataQuery += ` ORDER BY c.data["${sanitizeFieldName(options.orderBy)}"] ${dir.toUpperCase()}`;
    }
    dataQuery += ` OFFSET ${offset} LIMIT ${limit}`;

    const { resources } = await this.getRecords().items
      .query<RecordDoc>({ query: dataQuery, parameters: params })
      .fetchAll();

    return { records: resources, total };
  }

  async countRecords(userId: string, schemaName: string): Promise<number> {
    const { resources } = await this.getRecords().items
      .query<number>({
        query: "SELECT VALUE COUNT(1) FROM c WHERE c.pk = @pk AND c.schemaName = @schemaName",
        parameters: [
          { name: "@pk", value: userId },
          { name: "@schemaName", value: schemaName },
        ],
      })
      .fetchAll();
    return resources[0] ?? 0;
  }

  // ── API Key Operations ──────────────────────────────────────────────────

  async createApiKey(doc: ApiKeyDoc): Promise<ApiKeyDoc> {
    await this.getApiKeys().items.create(doc);
    return doc;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKeyDoc | null> {
    const { resources } = await this.getApiKeys().items
      .query<ApiKeyDoc>({
        query: "SELECT * FROM c WHERE c.keyHash = @keyHash",
        parameters: [{ name: "@keyHash", value: keyHash }],
      })
      .fetchAll();
    return resources[0] ?? null;
  }

  async listApiKeys(userId: string): Promise<ApiKeyDoc[]> {
    const { resources } = await this.getApiKeys().items
      .query<ApiKeyDoc>({
        query: "SELECT * FROM c WHERE c.pk = @pk",
        parameters: [{ name: "@pk", value: userId }],
      })
      .fetchAll();
    return resources;
  }

  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    try {
      await this.getApiKeys().item(keyId, userId).delete();
    } catch (err: unknown) {
      if (isNotFound(err)) {
        throw new NotFoundError("API Key", keyId);
      }
      throw err;
    }
  }

  async updateApiKeyLastUsed(keyHash: string): Promise<void> {
    const doc = await this.getApiKeyByHash(keyHash);
    if (!doc) return;
    await this.getApiKeys().item(doc.id, doc.pk).replace({
      ...doc,
      lastUsedAt: new Date().toISOString(),
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sanitize field name for use in Cosmos SQL to prevent injection. */
function sanitizeFieldName(name: string): string {
  // Only allow alphanumeric + underscore (matching FIELD_KEY_REGEX)
  if (!/^[a-z][a-zA-Z0-9_]{0,49}$/.test(name)) {
    throw new Error(`Invalid field name for SQL: '${name}'`);
  }
  return name;
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 404
  );
}

function filterOpToSql(op: FilterOp, fieldPath: string, paramName: string): string | null {
  switch (op) {
    case "eq":       return `${fieldPath} = ${paramName}`;
    case "ne":       return `${fieldPath} != ${paramName}`;
    case "gt":       return `${fieldPath} > ${paramName}`;
    case "gte":      return `${fieldPath} >= ${paramName}`;
    case "lt":       return `${fieldPath} < ${paramName}`;
    case "lte":      return `${fieldPath} <= ${paramName}`;
    case "contains": return `CONTAINS(${fieldPath}, ${paramName})`;
    default:         return null;
  }
}
