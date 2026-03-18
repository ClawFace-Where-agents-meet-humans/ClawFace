import type {
  SchemaResponse,
  RecordResponse,
  SchemaInput,
  QueryOptions,
  QueryResult,
  ErrorResponse,
} from "@clawface/shared";
import { ApiError } from "./errors.js";

export interface OpenClawClientOptions {
  baseUrl: string;
  userId: string;
  headers?: Record<string, string>;
}

export class OpenClawClient {
  private readonly baseUrl: string;
  private readonly userId: string;
  private readonly extraHeaders: Record<string, string>;

  constructor(options: OpenClawClientOptions) {
    // Strip trailing slash
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.userId = options.userId;
    this.extraHeaders = options.headers ?? {};
  }

  // ── Schema Operations ───────────────────────────────────────────────────

  async listSchemas(): Promise<SchemaResponse[]> {
    return this.request<SchemaResponse[]>("GET", "/schemas");
  }

  async getSchema(schemaName: string): Promise<SchemaResponse> {
    return this.request<SchemaResponse>("GET", `/schemas/${encodeURIComponent(schemaName)}`);
  }

  async createSchema(schemaName: string, input: SchemaInput): Promise<SchemaResponse> {
    return this.request<SchemaResponse>("POST", `/schemas/${encodeURIComponent(schemaName)}`, input);
  }

  async updateSchema(schemaName: string, input: Partial<SchemaInput>): Promise<SchemaResponse> {
    return this.request<SchemaResponse>("PATCH", `/schemas/${encodeURIComponent(schemaName)}`, input);
  }

  async deleteSchema(schemaName: string, deleteData = false): Promise<void> {
    const qs = deleteData ? "?deleteData=true" : "";
    await this.request<void>("DELETE", `/schemas/${encodeURIComponent(schemaName)}${qs}`);
  }

  // ── Record Operations ───────────────────────────────────────────────────

  async queryRecords(schemaName: string, options?: QueryOptions): Promise<QueryResult<RecordResponse>> {
    const params = new URLSearchParams();
    if (options?.filters && options.filters.length > 0) {
      params.set("filters", JSON.stringify(options.filters));
    }
    if (options?.orderBy) params.set("orderBy", options.orderBy);
    if (options?.orderDir) params.set("orderDir", options.orderDir);
    if (options?.limit !== undefined) params.set("limit", String(options.limit));
    if (options?.offset !== undefined) params.set("offset", String(options.offset));

    const qs = params.toString();
    const path = `/schemas/${encodeURIComponent(schemaName)}/records${qs ? `?${qs}` : ""}`;
    return this.request<QueryResult<RecordResponse>>("GET", path);
  }

  async getRecord(recordId: string): Promise<RecordResponse> {
    return this.request<RecordResponse>("GET", `/records/${encodeURIComponent(recordId)}`);
  }

  async createRecord(schemaName: string, data: Record<string, unknown>): Promise<RecordResponse> {
    return this.request<RecordResponse>(
      "POST",
      `/schemas/${encodeURIComponent(schemaName)}/records`,
      { data },
    );
  }

  async updateRecord(recordId: string, data: Record<string, unknown>): Promise<RecordResponse> {
    return this.request<RecordResponse>(
      "PUT",
      `/records/${encodeURIComponent(recordId)}`,
      { data },
    );
  }

  async deleteRecord(recordId: string): Promise<void> {
    await this.request<void>("DELETE", `/records/${encodeURIComponent(recordId)}`);
  }

  async countRecords(schemaName: string): Promise<number> {
    const result = await this.request<{ count: number }>(
      "GET",
      `/schemas/${encodeURIComponent(schemaName)}/records/count`,
    );
    return result.count;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-User-Id": this.userId,
      ...this.extraHeaders,
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new ApiError(0, "NETWORK_ERROR", `Network error: ${(err as Error).message}`);
    }

    // 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    // Parse JSON safely — server might return non-JSON (e.g. HTML error pages)
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (!res.ok) {
        throw new ApiError(res.status, "UNKNOWN_ERROR", res.statusText || `HTTP ${res.status}`);
      }
      throw new ApiError(res.status, "PARSE_ERROR", "Response was not valid JSON");
    }

    if (!res.ok) {
      const errBody = json as ErrorResponse;
      throw new ApiError(
        res.status,
        errBody?.error ?? "UNKNOWN_ERROR",
        errBody?.message ?? res.statusText,
        errBody?.details,
        errBody?.hint,
      );
    }

    return json as T;
  }
}
