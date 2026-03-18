import React, { useState, useCallback } from "react";
import type { SchemaResponse } from "@clawface/shared";
import { Database, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SchemaListView } from "@/views/SchemaListView";
import { DataTableView } from "@/views/DataTableView";
import { RecordDetailView } from "@/views/RecordDetailView";
import { RecordFormView } from "@/views/RecordFormView";

type View =
  | { type: "schemas" }
  | { type: "table"; schema: SchemaResponse }
  | { type: "detail"; schema: SchemaResponse; recordId: string }
  | { type: "create"; schema: SchemaResponse }
  | { type: "edit"; schema: SchemaResponse; recordId: string };

interface ExplorerPageProps {
  connection: { baseUrl: string; userId: string };
  onDisconnect: () => void;
}

export function ExplorerPage({ connection, onDisconnect }: ExplorerPageProps): React.JSX.Element {
  const [view, setView] = useState<View>({ type: "schemas" });

  const navigateToTable = useCallback((schema: SchemaResponse) => {
    setView({ type: "table", schema });
  }, []);

  const navigateBack = useCallback(() => {
    if (view.type === "detail" || view.type === "create" || view.type === "edit") {
      setView({ type: "table", schema: (view as { schema: SchemaResponse }).schema });
    } else {
      setView({ type: "schemas" });
    }
  }, [view]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <span className="font-semibold">OpenClaw Explorer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">
              {connection.userId}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {connection.baseUrl}
            </span>
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              <LogOut className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container py-3">
        <Breadcrumb view={view} onNavigate={setView} />
      </div>

      <Separator />

      {/* Content */}
      <div className="container py-6">
        {view.type === "schemas" && (
          <SchemaListView onSelect={navigateToTable} />
        )}
        {view.type === "table" && (
          <DataTableView
            schema={view.schema}
            onViewRecord={(id) => setView({ type: "detail", schema: view.schema, recordId: id })}
            onCreate={() => setView({ type: "create", schema: view.schema })}
          />
        )}
        {view.type === "detail" && (
          <RecordDetailView
            schema={view.schema}
            recordId={view.recordId}
            onEdit={() => setView({ type: "edit", schema: view.schema, recordId: view.recordId })}
            onDelete={navigateBack}
          />
        )}
        {(view.type === "create" || view.type === "edit") && (
          <RecordFormView
            schema={view.schema}
            recordId={view.type === "edit" ? view.recordId : undefined}
            onSuccess={navigateBack}
            onCancel={navigateBack}
          />
        )}
      </div>
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const crumbs: Array<{ label: string; onClick?: () => void }> = [];

  crumbs.push({
    label: "Schemas",
    onClick: view.type !== "schemas" ? () => onNavigate({ type: "schemas" }) : undefined,
  });

  if (view.type !== "schemas") {
    const schema = (view as { schema: SchemaResponse }).schema;
    const isLast = view.type === "table";
    crumbs.push({
      label: schema.displayName ?? schema.schemaName,
      onClick: !isLast ? () => onNavigate({ type: "table", schema }) : undefined,
    });
  }

  if (view.type === "detail" || view.type === "edit") {
    crumbs.push({ label: view.recordId.slice(0, 8) + "..." });
  } else if (view.type === "create") {
    crumbs.push({ label: "New Record" });
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {crumb.onClick ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={crumb.onClick}
            >
              {crumb.label}
            </button>
          ) : (
            <span className="font-medium text-foreground">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
