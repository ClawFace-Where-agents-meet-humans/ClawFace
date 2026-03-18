import type { DbProvider } from "../types.js";
import { CosmosDbProvider } from "./cosmos-provider.js";
import { MongoDbProvider } from "./mongodb-provider.js";

let cachedProvider: DbProvider | null = null;

/**
 * Create (or return cached) DbProvider based on DB_PROVIDER env var.
 * The provider is cached at module level so the underlying connection pool
 * is reused across requests within the same warm instance.
 */
export function createProvider(): DbProvider {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.DB_PROVIDER ?? "cosmos";

  switch (provider) {
    case "cosmos":
      cachedProvider = new CosmosDbProvider();
      break;
    case "mongodb":
      cachedProvider = new MongoDbProvider();
      break;
    default:
      throw new Error(
        `Unknown DB_PROVIDER: '${provider}'. Supported providers: cosmos, mongodb`,
      );
  }

  return cachedProvider;
}
