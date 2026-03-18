import { randomBytes, createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type { Request, Response, NextFunction } from "express";
import type { DbProvider, ApiKeyDoc } from "./types.js";
import type { ApiKeyCreateResponse } from "@clawface/shared";

// ── Key Generation ──────────────────────────────────────────────────────────

const KEY_PREFIX = "cf_";
const KEY_BYTES = 32; // 256-bit random key

/** Generate a new API key: cf_ + 32 random hex chars. */
export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(KEY_BYTES).toString("hex");
}

/** SHA-256 hash of the full key for storage. Never store the raw key. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** First 8 chars of the key for display (e.g. "cf_a1b2c3"). */
export function keyPrefix(key: string): string {
  return key.slice(0, 11); // "cf_" + 8 chars
}

// ── Key Creation ────────────────────────────────────────────────────────────

export interface CreateApiKeyInput {
  name: string;
  userId: string;
  scopes?: string[];
  expiresAt?: string; // ISO 8601
}

export async function createApiKey(
  provider: DbProvider,
  input: CreateApiKeyInput,
): Promise<ApiKeyCreateResponse> {
  const key = generateApiKey();
  const now = new Date().toISOString();

  const doc: ApiKeyDoc = {
    id: uuidv4(),
    prefix: keyPrefix(key),
    name: input.name,
    userId: input.userId,
    scopes: input.scopes,
    keyHash: hashApiKey(key),
    pk: input.userId,
    createdAt: now,
    ...(input.expiresAt && { expiresAt: input.expiresAt }),
  };

  await provider.createApiKey(doc);

  return {
    id: doc.id,
    prefix: doc.prefix,
    name: doc.name,
    userId: doc.userId,
    scopes: doc.scopes,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
    key, // Full key — only returned once
  };
}

// ── Auth Middleware ──────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  userId: string;
}

type AuthMode = "none" | "apikey";

function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE ?? "none";
  if (mode !== "none" && mode !== "apikey") {
    throw new Error(`Unknown AUTH_MODE: '${mode}'. Supported: none, apikey`);
  }
  return mode;
}

/**
 * Create auth middleware based on AUTH_MODE env var.
 *
 * - `none` (default): Uses X-User-Id header (backward compatible, for local dev)
 * - `apikey`: Requires Authorization: Bearer cf_xxx header. Resolves userId from key.
 */
export function createAuthMiddleware(provider: DbProvider) {
  const mode = getAuthMode();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (mode === "none") {
      // Legacy mode: trusted X-User-Id header
      const userId = req.headers["x-user-id"];
      if (!userId || typeof userId !== "string") {
        res.status(401).json({
          error: "UNAUTHORIZED",
          message: "X-User-Id header required",
        });
        return;
      }
      (req as AuthRequest).userId = userId;
      return next();
    }

    // API key mode
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authorization: Bearer <api-key> header required",
        hint: "Create an API key via POST /api/auth/keys with the admin key",
      });
      return;
    }

    const token = authHeader.slice(7); // Strip "Bearer "

    // Check admin key first (for bootstrap)
    const adminKey = process.env.AUTH_ADMIN_KEY;
    if (adminKey && token === adminKey) {
      // Admin key uses X-User-Id to specify which user to act as
      const userId = req.headers["x-user-id"];
      if (!userId || typeof userId !== "string") {
        res.status(400).json({
          error: "BAD_REQUEST",
          message: "Admin key requires X-User-Id header to specify target user",
        });
        return;
      }
      (req as AuthRequest).userId = userId;
      return next();
    }

    // Validate API key
    const hash = hashApiKey(token);
    const keyDoc = await provider.getApiKeyByHash(hash);

    if (!keyDoc) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid API key",
      });
      return;
    }

    // Check expiry
    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "API key has expired",
        hint: "Create a new API key via POST /api/auth/keys",
      });
      return;
    }

    (req as AuthRequest).userId = keyDoc.userId;

    // Update lastUsedAt in the background (don't block the request)
    provider.updateApiKeyLastUsed(hash).catch(() => {});

    next();
  };
}

// ── Admin Auth Middleware ────────────────────────────────────────────────────

/**
 * Middleware for key management routes. Requires either:
 * - AUTH_MODE=none + X-User-Id header (dev mode — anyone can manage keys)
 * - AUTH_MODE=apikey + admin key (production — only admin can manage keys)
 * - AUTH_MODE=apikey + valid API key (users can list/delete their own keys)
 */
export function createKeyManagementAuth(provider: DbProvider) {
  const mode = getAuthMode();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (mode === "none") {
      // Dev mode: use X-User-Id
      const userId = req.headers["x-user-id"];
      if (!userId || typeof userId !== "string") {
        res.status(401).json({
          error: "UNAUTHORIZED",
          message: "X-User-Id header required",
        });
        return;
      }
      (req as AuthRequest).userId = userId;
      return next();
    }

    // In apikey mode, delegate to standard auth middleware
    const authMiddleware = createAuthMiddleware(provider);
    return authMiddleware(req, res, next);
  };
}
