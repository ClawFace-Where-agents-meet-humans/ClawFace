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

// ── Auth Middleware ──────────────────────────────────────────────────────────

interface AuthRequest extends Request {
  userId: string;
}

function requireUserId(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"];
  if (!userId || typeof userId !== "string") {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "X-User-Id header required",
    });
    return;
  }
  (req as AuthRequest).userId = userId;
  next();
}

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

export function registerRestRoutes(app: Express, provider: DbProvider): void {
  // All /api routes require userId
  app.use("/api", requireUserId);

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
      const input: Partial<SchemaInput> = req.body;

      // Validate fields if provided
      if (input.fields) {
        const errors = validateSchemaInput(schemaName, { fields: input.fields, groups: input.groups });
        if (errors.length > 0) {
          throw new SchemaValidationError(errors, "Fix the field definitions and try again");
        }
        const normalized = normalizeSchemaInput({ fields: input.fields, groups: input.groups });
        input.fields = normalized.fields;
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

  // ── Error Handler (must be registered after routes) ─────────────────────
  app.use("/api", errorHandler);
}
