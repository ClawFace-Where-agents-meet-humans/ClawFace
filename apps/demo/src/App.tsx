import React, { useState, useCallback } from "react";
import { OpenClawProvider } from "@clawface/react-sdk/react";
import { Toaster } from "sonner";
import { ConnectPage } from "./pages/ConnectPage";
import { ExplorerPage } from "./pages/ExplorerPage";

interface Connection {
  baseUrl: string;
  userId: string;
  apiKey?: string;
}

export function App(): React.JSX.Element {
  const [connection, setConnection] = useState<Connection | null>(null);

  const handleConnect = useCallback((baseUrl: string, userId: string, apiKey?: string) => {
    setConnection({ baseUrl, userId, apiKey });
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnection(null);
  }, []);

  if (!connection) {
    return (
      <>
        <ConnectPage onConnect={handleConnect} />
        <Toaster richColors position="bottom-right" />
      </>
    );
  }

  return (
    <OpenClawProvider
      baseUrl={connection.baseUrl}
      userId={connection.userId}
      apiKey={connection.apiKey}
      headers={{ "ngrok-skip-browser-warning": "true" }}
    >
      <ExplorerPage connection={connection} onDisconnect={handleDisconnect} />
      <Toaster richColors position="bottom-right" />
    </OpenClawProvider>
  );
}
