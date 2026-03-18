import React, { createContext, useContext, useMemo } from "react";
import { OpenClawClient } from "../core/client.js";

const OpenClawContext = createContext<OpenClawClient | null>(null);

export interface OpenClawProviderProps {
  baseUrl: string;
  userId: string;
  headers?: Record<string, string>;
  children: React.ReactNode;
}

export function OpenClawProvider({ baseUrl, userId, headers, children }: OpenClawProviderProps): React.JSX.Element {
  const client = useMemo(
    () => new OpenClawClient({ baseUrl, userId, headers }),
    [baseUrl, userId, headers],
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
