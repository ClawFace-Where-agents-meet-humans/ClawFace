// ── Field Types ──────────────────────────────────────────────────────────────

export type FieldType = "string" | "number" | "boolean" | "date" | "array" | "object";

export type InputType = "text" | "textarea" | "select" | "date" | "toggle" | "number" | "list" | "group";

/** Maps FieldType → allowed InputType values and the default when omitted. */
export const INPUT_TYPE_DEFAULTS: Record<FieldType, { allowed: InputType[]; default: InputType }> = {
  string:  { allowed: ["text", "textarea", "select"], default: "text" },
  number:  { allowed: ["number"],                     default: "number" },
  boolean: { allowed: ["toggle"],                     default: "toggle" },
  date:    { allowed: ["date"],                       default: "date" },
  array:   { allowed: ["list"],                       default: "list" },
  object:  { allowed: ["group"],                      default: "group" },
};

// ── Field Definition ─────────────────────────────────────────────────────────

export interface FieldDef {
  type: FieldType;
  required?: boolean;
  description?: string;

  // UI rendering hints
  label?: string;
  inputType?: InputType;
  options?: string[];          // For inputType "select"
  displayFormat?: string;      // e.g. "YYYY-MM-DD"
  order?: number;
  group?: string;              // References GroupDef.key

  // Agent hints — help any AI agent understand this field without prior context
  hint?: string;               // How to populate: "Use ISO country code, e.g. US, IN, DE"
  default?: unknown;           // Default value for new records: "medium", 0, false, etc.

  // Nested type support
  items?: FieldDef;                       // For type "array"
  properties?: Record<string, FieldDef>;  // For type "object"
}

export interface GroupDef {
  key: string;
  label: string;
  order: number;
}

// ── API Response Types (what REST API and SDK work with) ────────────────────

export interface SchemaResponse {
  userId: string;
  schemaName: string;
  displayName?: string;
  description?: string;
  icon?: string;
  fields: Record<string, FieldDef>;
  groups?: GroupDef[];
  version: number;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601

  // Agent-portable metadata — survives platform switches (OpenClaw → NemoClaw → etc.)
  // Any new agent can read these to fully understand the schema without prior context.
  purpose?: string;      // WHY this schema exists: "Track sales contacts for CRM pipeline"
  instructions?: string; // HOW an agent should use it: "Create a record when user mentions a new contact. Always ask for name and email before saving."
  examples?: Record<string, unknown>[]; // Sample records showing expected data shape
  tags?: string[];       // Discovery/categorization: ["crm", "sales", "contacts"]
  createdBy?: string;    // Who/what created it: "openclaw", "user:mohit", "nemoclaw"
}

export interface RecordResponse {
  id: string;            // UUID — needed for get/update/delete
  userId: string;
  schemaName: string;
  data: Record<string, unknown>;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}

// ── Schema Input (what tools/API receive, before auto-fill) ─────────────────

export interface SchemaInput {
  displayName?: string;
  description?: string;
  icon?: string;
  fields: Record<string, FieldDef>;
  groups?: GroupDef[];

  // Agent-portable metadata
  purpose?: string;
  instructions?: string;
  examples?: Record<string, unknown>[];
  tags?: string[];
  createdBy?: string;
}

// ── Query Types ──────────────────────────────────────────────────────────────

export type FilterOp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains";

export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: unknown;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: string;
  orderDir?: "asc" | "desc";
  limit?: number;         // max 100, default 20
  offset?: number;
}

export interface QueryResult<T = RecordResponse> {
  records: T[];
  total: number;
}

// ── API Key Types ───────────────────────────────────────────────────────────

export interface ApiKeyResponse {
  id: string;
  prefix: string;              // First 8 chars of key (for display: "cf_a1b2...")
  name: string;                // User-friendly label
  userId: string;
  scopes?: string[];           // Optional: restrict to specific operations
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface ApiKeyCreateResponse extends ApiKeyResponse {
  key: string;                 // Full key — only returned once at creation
}

// ── Validation Error Detail ─────────────────────────────────────────────────

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

// ── Error Response ──────────────────────────────────────────────────────────

export interface ErrorResponse {
  error: string;
  message: string;
  details?: ValidationErrorDetail[];
  hint?: string;
}
