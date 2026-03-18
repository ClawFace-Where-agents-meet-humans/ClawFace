import React, { useState } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ConnectPageProps {
  onConnect: (baseUrl: string, userId: string, apiKey?: string) => void;
}

const STORAGE_KEY = "openclaw-connection";

function loadSaved(): { baseUrl: string; userId: string; apiKey: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { apiKey: "", ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { baseUrl: "http://localhost:3000/api", userId: "", apiKey: "" };
}

export function ConnectPage({ onConnect }: ConnectPageProps): React.JSX.Element {
  const saved = loadSaved();
  const [baseUrl, setBaseUrl] = useState(saved.baseUrl);
  const [userId, setUserId] = useState(saved.userId);
  const [apiKey, setApiKey] = useState(saved.apiKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = baseUrl.trim().replace(/\/+$/, "");
    const trimmedUser = userId.trim();
    const trimmedKey = apiKey.trim();

    if (!trimmedUrl) return;
    // Need either userId (dev mode) or apiKey (production)
    if (!trimmedUser && !trimmedKey) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl: trimmedUrl, userId: trimmedUser, apiKey: trimmedKey }));
    onConnect(trimmedUrl, trimmedUser, trimmedKey || undefined);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">ClawFace Data Explorer</CardTitle>
          <CardDescription>Connect to your ClawFace server</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">API Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:3000/api"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="cf_... (for AUTH_MODE=apikey)"
              />
              <p className="text-xs text-muted-foreground">For production servers with AUTH_MODE=apikey</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="your-user-id (for AUTH_MODE=none)"
              />
              <p className="text-xs text-muted-foreground">For local dev servers with AUTH_MODE=none</p>
            </div>
            <Button type="submit" className="w-full">
              Connect
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
