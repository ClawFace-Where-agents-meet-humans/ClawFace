import { MongoClient, type Collection, type Db, type Filter, type Sort } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import type {
  DbProvider,
  SchemaDoc,
  SchemaInput,
  RecordDoc,
  QueryOptions,
  QueryResult,
  FilterOp,
} from "../types.js";
import { MAX_QUERY_LIMIT, DEFAULT_QUERY_LIMIT } from "../types.js";
import { NotFoundError, ConflictError } from "../errors.js";

// ── Singleton MongoClient ───────────────────────────────────────────────────

let client: MongoClient | null = null;

function getClient(): MongoClient {
  if (client) return client;

  const connectionString = process.env.MONGODB_URI;
  if (!connectionString) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  client = new MongoClient(connectionString);
  return client;
}

// ── MongoDbProvider ─────────────────────────────────────────────────────────

export class MongoDbProvider implements DbProvider {
  private readonly dbName: string;
  private db: Db | null = null;

  constructor() {
    this.dbName = process.env.MONGODB_DB_NAME ?? "clawface";
  }

  private async getDb(): Promise<Db> {
    if (!this.db) {
      const mongoClient = getClient();
      await mongoClient.connect();
      this.db = mongoClient.db(this.dbName);
      await this.ensureIndexes();
    }
    return this.db;
  }

  private async ensureIndexes(): Promise<void> {
    const db = this.db!;

    // Schemas: unique compound index on userId + schemaName
    await db.collection("schemas").createIndex(
      { userId: 1, schemaName: 1 },
      { unique: true },
    );

    // Records: index for querying by userId + schemaName
    await db.collection("records").createIndex(
      { userId: 1, schemaName: 1 },
    );
    // Records: index for lookup by id + userId
    await db.collection("records").createIndex(
      { id: 1, userId: 1 },
      { unique: true },
    );
  }

  private async schemas(): Promise<Collection<SchemaDoc>> {
    const db = await this.getDb();
    return db.collection<SchemaDoc>("schemas");
  }

  private async records(): Promise<Collection<RecordDoc>> {
    const db = await this.getDb();
    return db.collection<RecordDoc>("records");
  }

  // ── Schema Operations ────────────────────────────────────────────────────

  async createSchema(
    userId: string,
    schemaName: string,
    input: SchemaInput,
  ): Promise<SchemaDoc> {
    const col = await this.schemas();
    const now = new Date().toISOString();

    const doc: SchemaDoc = {
      id: `${userId}:${schemaName}`,
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

    try {
      await col.insertOne(doc as any);
    } catch (err: unknown) {
      if (isDuplicateKey(err)) {
        const existing = await this.getSchema(userId, schemaName);
        throw new ConflictError(
          `Schema '${schemaName}' already exists for this user (version ${existing?.version ?? "?"}, ` +
            `${existing ? Object.keys(existing.fields).length : "?"} fields)`,
          `Use update_schema to modify it, or list_schemas to see all schemas`,
        );
      }
      throw err;
    }

    return doc;
  }

  async getSchema(userId: string, schemaName: string): Promise<SchemaDoc | null> {
    const col = await this.schemas();
    const doc = await col.findOne(
      { userId, schemaName } as Filter<SchemaDoc>,
      { projection: { _id: 0 } },
    );
    return doc ?? null;
  }

  async listSchemas(userId: string): Promise<SchemaDoc[]> {
    const col = await this.schemas();
    return col.find(
      { userId } as Filter<SchemaDoc>,
      { projection: { _id: 0 } },
    ).toArray();
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
    const setFields: Record<string, unknown> = {
      version: existing.version + 1,
      updatedAt: now,
    };

    if (input.displayName !== undefined) setFields.displayName = input.displayName;
    if (input.description !== undefined) setFields.description = input.description;
    if (input.icon !== undefined) setFields.icon = input.icon;
    if (input.fields !== undefined) setFields.fields = input.fields;
    if (input.groups !== undefined) setFields.groups = input.groups;
    if (input.purpose !== undefined) setFields.purpose = input.purpose;
    if (input.instructions !== undefined) setFields.instructions = input.instructions;
    if (input.examples !== undefined) setFields.examples = input.examples;
    if (input.tags !== undefined) setFields.tags = input.tags;
    if (input.createdBy !== undefined) setFields.createdBy = input.createdBy;

    const col = await this.schemas();
    await col.updateOne(
      { userId, schemaName } as Filter<SchemaDoc>,
      { $set: setFields },
    );

    return { ...existing, ...setFields } as SchemaDoc;
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

    if (deleteData) {
      const col = await this.records();
      await col.deleteMany({ userId, schemaName } as Filter<RecordDoc>);
    }

    const col = await this.schemas();
    await col.deleteOne({ userId, schemaName } as Filter<SchemaDoc>);
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

    const col = await this.records();
    await col.insertOne(doc as any);
    return doc;
  }

  async getRecord(userId: string, recordId: string): Promise<RecordDoc | null> {
    const col = await this.records();
    const doc = await col.findOne(
      { id: recordId, userId } as Filter<RecordDoc>,
      { projection: { _id: 0 } },
    );
    return doc ?? null;
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
    const col = await this.records();
    await col.updateOne(
      { id: recordId, userId } as Filter<RecordDoc>,
      { $set: { data, updatedAt: now } },
    );

    return { ...existing, data, updatedAt: now };
  }

  async deleteRecord(userId: string, recordId: string): Promise<void> {
    const existing = await this.getRecord(userId, recordId);
    if (!existing) {
      throw new NotFoundError("Record", recordId);
    }
    const col = await this.records();
    await col.deleteOne({ id: recordId, userId } as Filter<RecordDoc>);
  }

  async queryRecords(
    userId: string,
    schemaName: string,
    options: QueryOptions,
  ): Promise<QueryResult> {
    const limit = Math.min(options.limit ?? DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
    const offset = options.offset ?? 0;

    const col = await this.records();

    // Build filter
    const filter: Record<string, unknown> = { userId, schemaName };

    if (options.filters) {
      for (const f of options.filters) {
        const fieldPath = `data.${sanitizeFieldName(f.field)}`;
        const mongoOp = filterOpToMongo(f.op, f.value);
        if (mongoOp !== null) {
          filter[fieldPath] = mongoOp;
        }
      }
    }

    // Count
    const total = await col.countDocuments(filter as Filter<RecordDoc>);

    // Sort
    let sort: Sort | undefined;
    if (options.orderBy) {
      const dir = options.orderDir === "desc" ? -1 : 1;
      sort = { [`data.${sanitizeFieldName(options.orderBy)}`]: dir };
    }

    // Query
    let cursor = col.find(filter as Filter<RecordDoc>, { projection: { _id: 0 } });
    if (sort) cursor = cursor.sort(sort);
    const records = await cursor.skip(offset).limit(limit).toArray();

    return { records, total };
  }

  async countRecords(userId: string, schemaName: string): Promise<number> {
    const col = await this.records();
    return col.countDocuments({ userId, schemaName } as Filter<RecordDoc>);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sanitize field name for use in MongoDB dot-notation to prevent injection. */
function sanitizeFieldName(name: string): string {
  if (!/^[a-z][a-zA-Z0-9_]{0,49}$/.test(name)) {
    throw new Error(`Invalid field name: '${name}'`);
  }
  return name;
}

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

function filterOpToMongo(op: FilterOp, value: unknown): unknown {
  switch (op) {
    case "eq":       return value;
    case "ne":       return { $ne: value };
    case "gt":       return { $gt: value };
    case "gte":      return { $gte: value };
    case "lt":       return { $lt: value };
    case "lte":      return { $lte: value };
    case "contains": return { $regex: String(value), $options: "i" };
    default:         return null;
  }
}
