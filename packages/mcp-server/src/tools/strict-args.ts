import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DbMcpError, toMcpErrorResult } from "../errors.js";

/** Internal SDK type for a registered tool. */
interface RegisteredTool {
  inputSchema?: { passthrough?: () => unknown };
  handler: (args: Record<string, unknown>, extra?: unknown) => Promise<unknown>;
}

type ToolRegistry = Record<string, RegisteredTool>;

/**
 * Patch a registered MCP tool to reject unknown parameters with a clear error.
 *
 * The MCP SDK's Zod validation silently strips unknown parameters — an agent
 * passing `patch={...}` instead of `fields={...}` would get a silent no-op.
 * This helper:
 *   1. Makes the Zod schema `.passthrough()` so unknown keys survive parsing.
 *   2. Wraps the handler to detect and reject unknown keys before execution.
 *
 * Must be called AFTER `server.tool()` registration.
 */
export function enableStrictArgs(
  server: McpServer,
  toolName: string,
  knownKeys: string[],
): void {
  const internal = server as unknown as { _registeredTools: ToolRegistry };
  const tool = internal._registeredTools[toolName];
  if (!tool) return;

  // 1. Make Zod schema passthrough so unknown keys survive SDK parsing
  const schema = tool.inputSchema;
  if (schema && typeof schema.passthrough === "function") {
    tool.inputSchema = schema.passthrough() as typeof tool.inputSchema;
  }

  // 2. Wrap handler to detect unknown keys
  const keySet = new Set(knownKeys);
  const originalHandler = tool.handler;

  tool.handler = async (args: Record<string, unknown>, extra?: unknown) => {
    const unknownKeys = Object.keys(args ?? {}).filter((k) => !keySet.has(k));
    if (unknownKeys.length > 0) {
      return toMcpErrorResult(
        new DbMcpError(
          "UNKNOWN_PARAMETERS",
          `Unknown parameter(s): ${unknownKeys.map((k) => `'${k}'`).join(", ")}. ` +
            `These are not valid for '${toolName}'.`,
          `Valid parameters for '${toolName}': ${knownKeys.join(", ")}`,
        ),
      );
    }
    return originalHandler(args, extra);
  };
}
