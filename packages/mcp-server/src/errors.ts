import type { ValidationErrorDetail, ErrorResponse } from "./types.js";

export class DbMcpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = "DbMcpError";
  }

  toResponse(): ErrorResponse {
    return { error: this.code, message: this.message, hint: this.hint };
  }
}

export class NotFoundError extends DbMcpError {
  constructor(entity: string, id: string, hint?: string) {
    super("NOT_FOUND", `${entity} '${id}' not found`, hint);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DbMcpError {
  constructor(message: string, hint?: string) {
    super("CONFLICT", message, hint);
    this.name = "ConflictError";
  }
}

export class SchemaValidationError extends DbMcpError {
  public readonly details: ValidationErrorDetail[];

  constructor(details: ValidationErrorDetail[], hint?: string) {
    const summary = details.map((d) => d.message).join("; ");
    super("SCHEMA_VALIDATION_ERROR", `Schema validation failed: ${summary}`, hint);
    this.name = "SchemaValidationError";
    this.details = details;
  }

  override toResponse(): ErrorResponse {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
      hint: this.hint,
    };
  }
}

export class RecordValidationError extends DbMcpError {
  public readonly details: ValidationErrorDetail[];

  constructor(details: ValidationErrorDetail[], schemaName: string) {
    const summary = details.map((d) => d.message).join("; ");
    super(
      "VALIDATION_ERROR",
      `Record validation failed: ${summary}`,
      `Check get_schema('${schemaName}') for the full field definitions`,
    );
    this.name = "RecordValidationError";
    this.details = details;
  }

  override toResponse(): ErrorResponse {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
      hint: this.hint,
    };
  }
}

/** Convert any DbMcpError into an MCP tool error result. */
export function toMcpErrorResult(err: DbMcpError): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(err.toResponse()) }],
    isError: true,
  };
}
