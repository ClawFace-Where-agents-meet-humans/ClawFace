import React from "react";
import type { SchemaResponse } from "@clawface/shared";
import { useSchemas } from "@clawface/react-sdk/react";
import { Database, Table2, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SchemaListViewProps {
  onSelect: (schema: SchemaResponse) => void;
}

const SCHEMA_ICONS: Record<string, React.ReactNode> = {
  users: <Database className="h-5 w-5" />,
  contacts: <Database className="h-5 w-5" />,
  tasks: <FileText className="h-5 w-5" />,
};

export function SchemaListView({ onSelect }: SchemaListViewProps): React.JSX.Element {
  const { data: schemas, error, isLoading } = useSchemas();

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Schemas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">Error: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!schemas || schemas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Table2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No schemas yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          Create your first schema using the db-mcp tools to start storing structured data.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Schemas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schemas.map((schema) => (
          <Card
            key={schema.schemaName}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
            onClick={() => onSelect(schema)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {SCHEMA_ICONS[schema.schemaName] ?? <Table2 className="h-4 w-4" />}
                  </div>
                  <CardTitle className="text-base">
                    {schema.displayName ?? schema.schemaName}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  v{schema.version}
                </Badge>
              </div>
              {schema.description && (
                <CardDescription className="mt-2">{schema.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {schema.tags && schema.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {schema.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{Object.keys(schema.fields).length} fields</span>
                {schema.createdBy && (
                  <>
                    <span>&middot;</span>
                    <span>by {schema.createdBy}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
