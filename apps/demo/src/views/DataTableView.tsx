import React, { useState, useCallback } from "react";
import type { SchemaResponse, FieldDef } from "@clawface/shared";
import { useRecords } from "@clawface/react-sdk/react";
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableViewProps {
  schema: SchemaResponse;
  onViewRecord: (recordId: string) => void;
  onCreate: () => void;
}

function renderCellValue(value: unknown, fieldDef: FieldDef): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  switch (fieldDef.type) {
    case "boolean":
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-xs">
          {value ? "Yes" : "No"}
        </Badge>
      );
    case "date":
      return typeof value === "string" ? new Date(value).toLocaleDateString() : String(value);
    case "array":
      if (Array.isArray(value)) {
        return (
          <div className="flex gap-1 flex-wrap">
            {value.slice(0, 3).map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs">{String(item)}</Badge>
            ))}
            {value.length > 3 && (
              <Badge variant="outline" className="text-xs">+{value.length - 3}</Badge>
            )}
          </div>
        );
      }
      return String(value);
    case "string":
      if (fieldDef.inputType === "select" && fieldDef.options) {
        return <Badge variant="secondary" className="text-xs">{String(value)}</Badge>;
      }
      return String(value).length > 60 ? String(value).slice(0, 60) + "..." : String(value);
    default:
      return String(value);
  }
}

export function DataTableView({ schema, onViewRecord, onCreate }: DataTableViewProps): React.JSX.Element {
  const [orderBy, setOrderBy] = useState<string | undefined>();
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("asc");

  const { data: records, isLoading, page, setPage, pageSize } = useRecords(
    schema.schemaName,
    { orderBy, orderDir },
  );

  const fieldEntries = Object.entries(schema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );

  const handleSort = useCallback((key: string) => {
    if (orderBy === key) {
      setOrderDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(key);
      setOrderDir("asc");
    }
  }, [orderBy]);

  const totalPages = records ? Math.ceil(records.total / pageSize) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{schema.displayName ?? schema.schemaName}</h2>
          {schema.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{schema.description}</p>
          )}
          {schema.purpose && schema.purpose !== schema.description && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{schema.purpose}</p>
          )}
        </div>
        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Record
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {fieldEntries.map(([key, fieldDef]) => (
                    <TableHead
                      key={key}
                      className="cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center gap-1">
                        {fieldDef.label ?? key}
                        {orderBy === key ? (
                          orderDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.records.map((record) => (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer"
                    onClick={() => onViewRecord(record.id)}
                  >
                    {fieldEntries.map(([key, fieldDef]) => (
                      <TableCell key={key}>
                        {renderCellValue(record.data[key], fieldDef)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {(!records || records.records.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={Math.max(fieldEntries.length, 1)} className="h-24 text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            {records?.total ?? 0} total records
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
