import type { ValidationErrorDetail } from "@clawface/shared";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ValidationErrorDetail[],
    public readonly hint?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
