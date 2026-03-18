import React, { useState, useEffect, useCallback } from "react";
import type { FieldDef } from "@clawface/shared";
import { useSchema } from "../hooks/useSchema.js";
import { useRecord } from "../hooks/useRecord.js";
import { useFieldValidation } from "../hooks/useFieldValidation.js";
import { FieldRenderer } from "../fields/FieldRenderer.js";
import { FieldGroup } from "./FieldGroup.js";
import type { ApiError } from "../../core/errors.js";

export interface RecordFormProps {
  schemaName: string;
  recordId?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function RecordForm({ schemaName, recordId, onSubmit, onCancel, disabled }: RecordFormProps): React.JSX.Element {
  const { data: schema, isLoading: schemaLoading } = useSchema(schemaName);
  const { data: existingRecord, isLoading: recordLoading, error: recordError } = useRecord(recordId);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = useFieldValidation(schema, formData);

  // Initialize/reset form data when recordId or existingRecord changes
  useEffect(() => {
    if (recordId && existingRecord) {
      setFormData({ ...existingRecord.data });
    } else if (!recordId) {
      // Create mode — reset form
      setFormData({});
    }
    setServerErrors({});
  }, [recordId, existingRecord]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schema) return;

    setIsSubmitting(true);
    setServerErrors({});
    try {
      await onSubmit(formData);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.details) {
        const errMap: Record<string, string> = {};
        for (const detail of apiError.details) {
          errMap[detail.field] = detail.message;
        }
        setServerErrors(errMap);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, formData, onSubmit]);

  if (schemaLoading || (recordId && recordLoading)) {
    return <div className="ocl-form ocl-form--loading">Loading...</div>;
  }

  if (!schema) {
    return <div className="ocl-form ocl-form--error">Schema not found.</div>;
  }

  // Edit mode: record not found after loading
  if (recordId && !recordLoading && !existingRecord) {
    return (
      <div className="ocl-form ocl-form--error">
        Record not found.{recordError ? ` ${recordError.message}` : ""}
      </div>
    );
  }

  // Merge validation + server errors
  const allErrors: Record<string, string | undefined> = { ...validationErrors, ...serverErrors };

  // Sort fields by order
  const sortedFields = Object.entries(schema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );

  // Group fields if schema has groups
  const groups = schema.groups ?? [];
  const hasGroups = groups.length > 0;

  const isDisabled = disabled || isSubmitting;

  const renderActions = () => (
    <div className="ocl-form__actions">
      {onCancel && (
        <button type="button" className="ocl-form__cancel" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      )}
      <button type="submit" className="ocl-form__submit" disabled={isDisabled}>
        {isSubmitting ? "Saving..." : recordId ? "Update" : "Create"}
      </button>
    </div>
  );

  if (hasGroups) {
    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
    const groupedFields = new Map<string, Array<{ key: string; fieldDef: FieldDef }>>();
    const ungrouped: Array<{ key: string; fieldDef: FieldDef }> = [];

    for (const [key, fieldDef] of sortedFields) {
      if (fieldDef.group) {
        // Always add to group, creating array if needed
        const arr = groupedFields.get(fieldDef.group) ?? [];
        arr.push({ key, fieldDef });
        groupedFields.set(fieldDef.group, arr);
      } else {
        ungrouped.push({ key, fieldDef });
      }
    }

    return (
      <form className="ocl-form" onSubmit={handleSubmit}>
        {sortedGroups.map((group) => {
          const fields = groupedFields.get(group.key) ?? [];
          if (fields.length === 0) return null;
          return (
            <FieldGroup
              key={group.key}
              group={group}
              fields={fields}
              data={formData}
              onChange={handleChange}
              errors={allErrors}
              disabled={isDisabled}
            />
          );
        })}
        {ungrouped.length > 0 && (
          <div className="ocl-form__ungrouped">
            {ungrouped.map(({ key, fieldDef }) => (
              <FieldRenderer
                key={key}
                name={key}
                fieldDef={fieldDef}
                value={formData[key]}
                onChange={(v) => handleChange(key, v)}
                error={allErrors[key]}
                disabled={isDisabled}
              />
            ))}
          </div>
        )}
        {renderActions()}
      </form>
    );
  }

  // No groups — flat layout
  return (
    <form className="ocl-form" onSubmit={handleSubmit}>
      {sortedFields.map(([key, fieldDef]) => (
        <FieldRenderer
          key={key}
          name={key}
          fieldDef={fieldDef}
          value={formData[key]}
          onChange={(v) => handleChange(key, v)}
          error={allErrors[key]}
          disabled={isDisabled}
        />
      ))}
      {renderActions()}
    </form>
  );
}
