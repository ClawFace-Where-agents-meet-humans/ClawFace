import React from "react";
import type { SchemaResponse } from "@clawface/shared";
import { useSchemas } from "../hooks/useSchemas.js";

export interface SchemaListProps {
  onSelect?: (schema: SchemaResponse) => void;
}

export function SchemaList({ onSelect }: SchemaListProps): React.JSX.Element {
  const { data, error, isLoading } = useSchemas();

  if (isLoading) {
    return <div className="ocl-schema-list ocl-schema-list--loading">Loading schemas...</div>;
  }

  if (error) {
    return <div className="ocl-schema-list ocl-schema-list--error">Error: {error.message}</div>;
  }

  if (!data || data.length === 0) {
    return <div className="ocl-schema-list ocl-schema-list--empty">No schemas found.</div>;
  }

  return (
    <div className="ocl-schema-list">
      {data.map((schema) => (
        <button
          key={schema.schemaName}
          type="button"
          className="ocl-schema-card"
          onClick={() => onSelect?.(schema)}
        >
          {schema.icon && <span className="ocl-schema-card__icon">{schema.icon}</span>}
          <div className="ocl-schema-card__body">
            <h3 className="ocl-schema-card__title">{schema.displayName ?? schema.schemaName}</h3>
            {schema.description && (
              <p className="ocl-schema-card__description">{schema.description}</p>
            )}
            <span className="ocl-schema-card__meta">
              {Object.keys(schema.fields).length} fields
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
