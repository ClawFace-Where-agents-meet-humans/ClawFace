import React, { useState } from "react";
import type { RecordResponse, FieldDef } from "@clawface/shared";
import { useSchema } from "../hooks/useSchema.js";
import { useRecords } from "../hooks/useRecords.js";

export interface DataTableProps {
  schemaName: string;
  pageSize?: number;
  onRowClick?: (record: RecordResponse) => void;
}

function renderCellValue(value: unknown, fieldDef: FieldDef): string {
  if (value === undefined || value === null) return "—";
  switch (fieldDef.type) {
    case "boolean": return value ? "Yes" : "No";
    case "date": return typeof value === "string" ? new Date(value).toLocaleDateString() : String(value);
    case "array": return Array.isArray(value) ? `[${value.length}]` : String(value);
    case "object": return "[Object]";
    default: return String(value);
  }
}

export function DataTable({ schemaName, pageSize: initialPageSize = 20, onRowClick }: DataTableProps): React.JSX.Element {
  const { data: schema, isLoading: schemaLoading } = useSchema(schemaName);
  const [orderBy, setOrderBy] = useState<string | undefined>();
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("asc");

  const { data: records, isLoading: recordsLoading, page, setPage, pageSize, setPageSize } = useRecords(
    schemaName,
    { orderBy, orderDir },
  );

  // Set initial page size
  React.useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize, setPageSize]);

  if (schemaLoading || recordsLoading) {
    return <div className="ocl-table ocl-table--loading">Loading...</div>;
  }

  if (!schema) {
    return <div className="ocl-table ocl-table--error">Schema not found.</div>;
  }

  // Sort fields by order
  const fieldEntries = Object.entries(schema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );

  const handleSort = (fieldKey: string) => {
    if (orderBy === fieldKey) {
      setOrderDir(orderDir === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(fieldKey);
      setOrderDir("asc");
    }
  };

  const totalPages = records ? Math.ceil(records.total / pageSize) : 0;

  return (
    <div className="ocl-table">
      <table className="ocl-table__table">
        <thead>
          <tr>
            {fieldEntries.map(([key, fieldDef]) => (
              <th
                key={key}
                className="ocl-table__header"
                onClick={() => handleSort(key)}
              >
                {fieldDef.label ?? key}
                {orderBy === key && (
                  <span className="ocl-table__sort">{orderDir === "asc" ? " \u25B2" : " \u25BC"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records?.records.map((record) => (
            <tr
              key={record.id}
              className="ocl-table__row"
              onClick={() => onRowClick?.(record)}
            >
              {fieldEntries.map(([key, fieldDef]) => (
                <td key={key} className="ocl-table__cell">
                  {renderCellValue(record.data[key], fieldDef)}
                </td>
              ))}
            </tr>
          ))}
          {(!records || records.records.length === 0) && (
            <tr>
              <td colSpan={Math.max(fieldEntries.length, 1)} className="ocl-table__empty">
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="ocl-table__pagination">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
