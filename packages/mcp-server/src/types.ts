// Re-export shared types used by internal modules
export type {
  FieldDef,
  SchemaInput,
  FilterOp,
  QueryFilter,
  QueryOptions,
  ValidationErrorDetail,
  ErrorResponse,
} from "@clawface/shared";

export {
  MAX_QUERY_LIMIT,
  DEFAULT_QUERY_LIMIT,
} from "@clawface/shared";

import type { SchemaResponse, RecordResponse } from "@clawface/shared";
export type { SchemaResponse, RecordResponse };

// ── DB-Internal Types (include partition key and Cosmos-specific fields) ─────

export interface SchemaDoc extends SchemaResponse {
  id: string;            // "userId:schemaName"
  pk: string;            // userId (partition key)
}

export interface RecordDoc extends RecordResponse {
  pk: string;            // userId (partition key)
}

// ── Query Result (uses DB-internal RecordDoc) ───────────────────────────────

export interface QueryResult {
  records: RecordDoc[];
  total: number;
}

// ── DB Provider Interface ────────────────────────────────────────────────────

import type { SchemaInput, QueryOptions } from "@clawface/shared";

export interface DbProvider {
  // Schema operations
  createSchema(userId: string, schemaName: string, input: SchemaInput): Promise<SchemaDoc>;
  getSchema(userId: string, schemaName: string): Promise<SchemaDoc | null>;
  listSchemas(userId: string): Promise<SchemaDoc[]>;
  updateSchema(userId: string, schemaName: string, input: Partial<SchemaInput>): Promise<SchemaDoc>;
  deleteSchema(userId: string, schemaName: string, deleteData: boolean): Promise<void>;

  // Record operations
  createRecord(userId: string, schemaName: string, data: Record<string, unknown>): Promise<RecordDoc>;
  getRecord(userId: string, recordId: string): Promise<RecordDoc | null>;
  updateRecord(userId: string, recordId: string, data: Record<string, unknown>): Promise<RecordDoc>;
  deleteRecord(userId: string, recordId: string): Promise<void>;
  queryRecords(userId: string, schemaName: string, options: QueryOptions): Promise<QueryResult>;

  // Utility
  countRecords(userId: string, schemaName: string): Promise<number>;
}

// ── Response Helpers ─────────────────────────────────────────────────────────

/** Strip Cosmos-internal fields (pk, id) from a SchemaDoc for API consumption. */
export function toSchemaResponse(doc: SchemaDoc): SchemaResponse {
  const { id: _id, pk: _pk, ...rest } = doc;
  return rest;
}

/** Strip Cosmos-internal field (pk) from a RecordDoc for API consumption. */
export function toRecordResponse(doc: RecordDoc): RecordResponse {
  const { pk: _pk, ...rest } = doc;
  return rest;
}
