import React from "react";
import type { FieldDef, GroupDef } from "@clawface/shared";
import { useSchema } from "../hooks/useSchema.js";
import { useRecord } from "../hooks/useRecord.js";

export interface RecordDetailProps {
  schemaName: string;
  recordId: string;
}

function renderValue(value: unknown, fieldDef: FieldDef): string {
  if (value === undefined || value === null) return "—";
  switch (fieldDef.type) {
    case "boolean": return value ? "Yes" : "No";
    case "date": return typeof value === "string" ? new Date(value).toLocaleDateString() : String(value);
    case "array": return Array.isArray(value) ? value.join(", ") : String(value);
    case "object": return JSON.stringify(value, null, 2);
    default: return String(value);
  }
}

interface FieldDisplayProps {
  fieldKey: string;
  fieldDef: FieldDef;
  value: unknown;
}

function FieldDisplay({ fieldKey, fieldDef, value }: FieldDisplayProps): React.JSX.Element {
  return (
    <div className="ocl-detail__field">
      <dt className="ocl-detail__label">{fieldDef.label ?? fieldKey}</dt>
      <dd className="ocl-detail__value">{renderValue(value, fieldDef)}</dd>
    </div>
  );
}

export function RecordDetail({ schemaName, recordId }: RecordDetailProps): React.JSX.Element {
  const { data: schema, isLoading: schemaLoading } = useSchema(schemaName);
  const { data: record, isLoading: recordLoading } = useRecord(recordId);

  if (schemaLoading || recordLoading) {
    return <div className="ocl-detail ocl-detail--loading">Loading...</div>;
  }

  if (!schema) {
    return <div className="ocl-detail ocl-detail--error">Schema not found.</div>;
  }

  if (!record) {
    return <div className="ocl-detail ocl-detail--error">Record not found.</div>;
  }

  const sortedFields = Object.entries(schema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );

  const groups = schema.groups ?? [];
  const hasGroups = groups.length > 0;

  if (hasGroups) {
    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
    const groupedFields = new Map<string, Array<[string, FieldDef]>>();
    const ungrouped: Array<[string, FieldDef]> = [];

    for (const [key, fieldDef] of sortedFields) {
      if (fieldDef.group) {
        const arr = groupedFields.get(fieldDef.group) ?? [];
        arr.push([key, fieldDef]);
        groupedFields.set(fieldDef.group, arr);
      } else {
        ungrouped.push([key, fieldDef]);
      }
    }

    return (
      <div className="ocl-detail">
        {sortedGroups.map((group) => {
          const fields = groupedFields.get(group.key) ?? [];
          if (fields.length === 0) return null;
          return (
            <fieldset key={group.key} className="ocl-detail__group">
              <legend className="ocl-detail__group-label">{group.label}</legend>
              <dl className="ocl-detail__fields">
                {fields.map(([key, fieldDef]) => (
                  <FieldDisplay key={key} fieldKey={key} fieldDef={fieldDef} value={record.data[key]} />
                ))}
              </dl>
            </fieldset>
          );
        })}
        {ungrouped.length > 0 && (
          <dl className="ocl-detail__fields">
            {ungrouped.map(([key, fieldDef]) => (
              <FieldDisplay key={key} fieldKey={key} fieldDef={fieldDef} value={record.data[key]} />
            ))}
          </dl>
        )}
        <div className="ocl-detail__meta">
          <span>Created: {new Date(record.createdAt).toLocaleString()}</span>
          <span>Updated: {new Date(record.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ocl-detail">
      <dl className="ocl-detail__fields">
        {sortedFields.map(([key, fieldDef]) => (
          <FieldDisplay key={key} fieldKey={key} fieldDef={fieldDef} value={record.data[key]} />
        ))}
      </dl>
      <div className="ocl-detail__meta">
        <span>Created: {new Date(record.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(record.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
