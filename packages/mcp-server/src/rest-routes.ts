import type { Express, Request, Response, NextFunction } from "express";
import type { DbProvider, SchemaInput, QueryFilter } from "./types.js";
import { toSchemaResponse, toRecordResponse, MAX_QUERY_LIMIT, DEFAULT_QUERY_LIMIT } from "./types.js";
import { validateSchemaInput, normalizeSchemaInput, validateRecordData } from "./validation.js";
import {
  DbMcpError,
  NotFoundError,
  ConflictError,
  SchemaValidationError,
  RecordValidationError,
} from "./errors.js";
import {
  createAuthMiddleware,
  createKeyManagementAuth,
  createApiKey,
  type AuthRequest,
} from "./auth.js";
import type { ApiKeyResponse } from "./types.js";

// ── Error Handling Middleware ────────────────────────────────────────────────

function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof NotFoundError) {
    res.status(404).json(err.toResponse());
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json(err.toResponse());
    return;
  }
  if (err instanceof SchemaValidationError || err instanceof RecordValidationError) {
    res.status(422).json(err.toResponse());
    return;
  }
  if (err instanceof DbMcpError) {
    res.status(400).json(err.toResponse());
    return;
  }

  console.error("Unhandled error in REST route:", err);
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
}

// ── Route Registration ──────────────────────────────────────────────────────

/** Strip internal fields from ApiKeyDoc for API responses. */
function toApiKeyResponse(doc: { id: string; prefix: string; name: string; userId: string; scopes?: string[]; createdAt: string; lastUsedAt?: string; expiresAt?: string; keyHash?: string; pk?: string }): ApiKeyResponse {
  const { keyHash: _kh, pk: _pk, ...rest } = doc;
  return rest;
}

export function registerRestRoutes(app: Express, provider: DbProvider): void {
  const authMiddleware = createAuthMiddleware(provider);
  const keyAuthMiddleware = createKeyManagementAuth(provider);

  // All /api routes require auth (except key management which has its own)
  app.use("/api/auth", keyAuthMiddleware);
  app.use("/api/schemas", authMiddleware);
  app.use("/api/records", authMiddleware);

  // ── API Key Management Routes ───────────────────────────────────────────

  // POST /api/auth/keys — create a new API key
  app.post("/api/auth/keys", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { name, scopes, expiresAt } = req.body;

      if (!name || typeof name !== "string") {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "name is required (string)",
        });
        return;
      }

      const result = await createApiKey(provider, {
        name,
        userId,
        scopes,
        expiresAt,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auth/keys — list API keys for current user
  app.get("/api/auth/keys", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const keys = await provider.listApiKeys(userId);
      res.json(keys.map(toApiKeyResponse));
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/auth/keys/:keyId — delete an API key
  app.delete("/api/auth/keys/:keyId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { keyId } = req.params;
      await provider.deleteApiKey(userId, keyId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ── Schema Routes ───────────────────────────────────────────────────────

  // GET /api/schemas — list all schemas for user
  app.get("/api/schemas", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const schemas = await provider.listSchemas(userId);
      res.json(schemas.map(toSchemaResponse));
    } catch (err) {
      next(err);
    }
  });

  // POST /api/schemas/:schemaName — create a new schema
  app.post("/api/schemas/:schemaName", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { schemaName } = req.params;
      const input: SchemaInput = req.body;

      // Validate
      const errors = validateSchemaInput(schemaName, input);
      if (errors.length > 0) {
        throw new SchemaValidationError(errors, "Fix the field definitions and try again");
      }

      // Normalize + create
      const normalized = normalizeSchemaInput(input);
      const doc = await provider.createSchema(userId, schemaName, normalized);
      res.status(201).json(toSchemaResponse(doc));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/schemas/:schemaName — get a single schema
  app.get("/api/schemas/:schemaName", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { schemaName } = req.params;

      const doc = await provider.getSchema(userId, schemaName);
      if (!doc) {
        throw new NotFoundError("Schema", schemaName);
      }
      res.json(toSchemaResponse(doc));
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/schemas/:schemaName — update a schema
  app.patch("/api/schemas/:schemaName", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { schemaName } = req.params;
      const { displayName, description, icon, fields, groups, purpose, instructions, examples, tags, createdBy } = req.body;
      const hasUpdate = [displayName, description, icon, fields, groups, purpose, instructions, examples, tags, createdBy]
        .some((v: unknown) => v !== undefined);
      if (!hasUpdate) {
        throw new DbMcpError(
          "INVALID_INPUT",
          "No update fields provided. Include at least one of: fields, displayName, description, icon, groups, purpose, instructions, examples, tags, createdBy.",
        );
      }
      const input: Partial<SchemaInput> = { displayName, description, icon, fields, groups, purpose, instructions, examples, tags, createdBy };
      // Strip undefined keys so the provider only sees explicitly provided values
      for (const key of Object.keys(input) as (keyof typeof input)[]) {
        if (input[key] === undefined) delete input[key];
      }

      // Validate fields if provided
      if (input.fields) {
        // Merge incoming fields with existing fields (patch, not full replace)
        const existing = await provider.getSchema(userId, schemaName);
        if (!existing) {
          throw new NotFoundError("Schema", schemaName);
        }
        const mergedFields = { ...existing.fields, ...input.fields };
        const mergedGroups = input.groups ?? existing.groups;

        const errors = validateSchemaInput(schemaName, { fields: mergedFields, groups: mergedGroups });
        if (errors.length > 0) {
          throw new SchemaValidationError(errors, "Fix the field definitions and try again");
        }
        const normalized = normalizeSchemaInput({ fields: mergedFields, groups: mergedGroups });
        input.fields = normalized.fields;
      } else if (input.groups) {
        // Groups-only update: validate existing field group refs against new groups
        const existing = await provider.getSchema(userId, schemaName);
        if (!existing) {
          throw new NotFoundError("Schema", schemaName);
        }
        const errors = validateSchemaInput(schemaName, { fields: existing.fields, groups: input.groups });
        if (errors.length > 0) {
          throw new SchemaValidationError(
            errors,
            "Some existing fields reference group keys not in the updated groups.",
          );
        }
      }

      const doc = await provider.updateSchema(userId, schemaName, input);
      res.json(toSchemaResponse(doc));
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/schemas/:schemaName — delete a schema
  app.delete("/api/schemas/:schemaName", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { schemaName } = req.params;
      const deleteData = req.query.deleteData === "true";

      await provider.deleteSchema(userId, schemaName, deleteData);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ── Record Routes ───────────────────────────────────────────────────────

  // GET /api/schemas/:schemaName/records — query records
  app.get("/api/schemas/:schemaName/records", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { schemaName } = req.params;

      const filters: QueryFilter[] | undefined = req.query.filters
        ? JSON.parse(req.query.filters as string)
        : undefined;
      const orderBy = req.query.orderBy as string | undefined;
      const orderDir = req.query.orderDir as "asc" | "desc" | undefined;
      const limit = Math.min(
        req.query.limit ? Number(req.query.limit) : DEFAULT_QUERY_LIMIT,
        MAX_QUERY_LIMIT,
      );
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const result = await provider.queryRecords(userId, schemaName, {
        filters,
        orderBy,
        orderDir,
        limit,
        offset,
      });

      res.json({
        records: result.records.map(toRecordResponse),
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/schemas/:schemaName/records — create a record
  app.post("/api/schemas/:schemaName/records", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { schemaName } = req.params;
      const { data } = req.body;

      // Fetch schema for validation
      const schema = await provider.getSchema(userId, schemaName);
      if (!schema) {
        throw new NotFoundError("Schema", schemaName);
      }

      // Validate data against schema
      const errors = validateRecordData(schema, data);
      if (errors.length > 0) {
        throw new RecordValidationError(errors, schemaName);
      }

      const doc = await provider.createRecord(userId, schemaName, data);
      res.status(201).json(toRecordResponse(doc));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/schemas/:schemaName/records/count — count records
  app.get("/api/schemas/:schemaName/records/count", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { schemaName } = req.params;

      const count = await provider.countRecords(userId, schemaName);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/records/:recordId — get a single record
  app.get("/api/records/:recordId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { recordId } = req.params;

      const doc = await provider.getRecord(userId, recordId);
      if (!doc) {
        throw new NotFoundError("Record", recordId);
      }
      res.json(toRecordResponse(doc));
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/records/:recordId — update a record
  app.put("/api/records/:recordId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { recordId } = req.params;
      const { data } = req.body;

      // Fetch existing record to get schemaName
      const existing = await provider.getRecord(userId, recordId);
      if (!existing) {
        throw new NotFoundError("Record", recordId);
      }

      // Fetch schema for validation
      const schema = await provider.getSchema(userId, existing.schemaName);
      if (!schema) {
        throw new NotFoundError("Schema", existing.schemaName);
      }

      // Validate data against schema
      const errors = validateRecordData(schema, data);
      if (errors.length > 0) {
        throw new RecordValidationError(errors, existing.schemaName);
      }

      const doc = await provider.updateRecord(userId, recordId, data);
      res.json(toRecordResponse(doc));
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/records/:recordId — delete a record
  app.delete("/api/records/:recordId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthRequest;
      const { recordId } = req.params;

      await provider.deleteRecord(userId, recordId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ── Error Handler (must be registered after all /api routes) ─────────────
  app.use("/api", errorHandler);
}
