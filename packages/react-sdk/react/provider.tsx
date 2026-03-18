import React, { createContext, useContext, useMemo } from "react";
import { OpenClawClient } from "../core/client.js";

const OpenClawContext = createContext<OpenClawClient | null>(null);

export interface OpenClawProviderProps {
  baseUrl: string;
  /** User ID — required when server runs AUTH_MODE=none (dev mode). */
  userId?: string;
  /** API key — required when server runs AUTH_MODE=apikey. */
  apiKey?: string;
  headers?: Record<string, string>;
  children: React.ReactNode;
}

export function OpenClawProvider({ baseUrl, userId, apiKey, headers, children }: OpenClawProviderProps): React.JSX.Element {
  const client = useMemo(
    () => new OpenClawClient({ baseUrl, userId, apiKey, headers }),
    [baseUrl, userId, apiKey, headers],
  );

  return (
    <OpenClawContext.Provider value={client}>
      {children}
    </OpenClawContext.Provider>
  );
}

export function useOpenClawClient(): OpenClawClient {
  const client = useContext(OpenClawContext);
  if (!client) {
    throw new Error("useOpenClawClient must be used within an <OpenClawProvider>");
  }
  return client;
}
