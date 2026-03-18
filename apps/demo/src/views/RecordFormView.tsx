import React, { useState, useEffect, useCallback } from "react";
import type { SchemaResponse, FieldDef } from "@clawface/shared";
import {
  useSchema,
  useRecord,
  useCreateRecord,
  useUpdateRecord,
  useFieldValidation,
} from "@clawface/react-sdk/react";
import type { ApiError } from "@clawface/react-sdk/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RecordFormViewProps {
  schema: SchemaResponse;
  recordId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecordFormView({ schema, recordId, onSuccess, onCancel }: RecordFormViewProps): React.JSX.Element {
  const { data: fullSchema, isLoading: schemaLoading } = useSchema(schema.schemaName);
  const { data: existingRecord, isLoading: recordLoading } = useRecord(recordId);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string | undefined>>({});

  const createRecord = useCreateRecord(schema.schemaName);
  const updateRecord = useUpdateRecord();
  const validationErrors = useFieldValidation(fullSchema, formData);

  const isEdit = !!recordId;
  const isSubmitting = createRecord.isLoading || updateRecord.isLoading;

  // Initialize form
  useEffect(() => {
    if (recordId && existingRecord) {
      setFormData({ ...existingRecord.data });
    } else if (!recordId) {
      // Populate defaults from schema
      const defaults: Record<string, unknown> = {};
      if (fullSchema) {
        for (const [key, fieldDef] of Object.entries(fullSchema.fields)) {
          if (fieldDef.default !== undefined) {
            defaults[key] = fieldDef.default;
          }
        }
      }
      setFormData(defaults);
    }
    setServerErrors({});
  }, [recordId, existingRecord, fullSchema]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErrors({});

    try {
      if (isEdit && recordId) {
        await updateRecord.mutate({ recordId, data: formData });
        toast.success("Record updated");
      } else {
        await createRecord.mutate(formData);
        toast.success("Record created");
      }
      onSuccess();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.details) {
        const errMap: Record<string, string> = {};
        for (const detail of apiError.details) {
          errMap[detail.field] = detail.message;
        }
        setServerErrors(errMap);
      }
      toast.error(apiError.message || "Failed to save record");
    }
  }, [isEdit, recordId, formData, createRecord, updateRecord, onSuccess]);

  if (schemaLoading || (recordId && recordLoading)) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!fullSchema) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">Schema not found.</p>
        </CardContent>
      </Card>
    );
  }

  const allErrors = { ...validationErrors, ...serverErrors };

  const sortedFields = Object.entries(fullSchema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );

  const groups = fullSchema.groups ?? [];
  const hasGroups = groups.length > 0;

  // Partition into groups
  const groupedFields = new Map<string, Array<[string, FieldDef]>>();
  const ungrouped: Array<[string, FieldDef]> = [];

  for (const [key, fieldDef] of sortedFields) {
    if (hasGroups && fieldDef.group) {
      const arr = groupedFields.get(fieldDef.group) ?? [];
      arr.push([key, fieldDef]);
      groupedFields.set(fieldDef.group, arr);
    } else {
      ungrouped.push([key, fieldDef]);
    }
  }

  const renderField = (key: string, fieldDef: FieldDef) => {
    const error = allErrors[key];
    const value = formData[key];

    return (
      <div key={key} className={`space-y-2 ${fieldDef.inputType === "textarea" ? "sm:col-span-2" : ""}`}>
        <Label htmlFor={key} className={error ? "text-destructive" : ""}>
          {fieldDef.label ?? key}
          {fieldDef.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>

        {fieldDef.inputType === "textarea" ? (
          <Textarea
            id={key}
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(key, e.target.value || undefined)}
            disabled={isSubmitting}
            placeholder={fieldDef.hint}
            className={error ? "border-destructive" : ""}
            rows={4}
          />
        ) : fieldDef.inputType === "select" ? (
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => handleChange(key, v || undefined)}
            disabled={isSubmitting}
          >
            <SelectTrigger className={error ? "border-destructive" : ""}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {fieldDef.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : fieldDef.inputType === "toggle" || fieldDef.type === "boolean" ? (
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id={key}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(key, checked)}
              disabled={isSubmitting}
            />
            <Label htmlFor={key} className="font-normal text-muted-foreground">
              {value ? "Yes" : "No"}
            </Label>
          </div>
        ) : fieldDef.inputType === "number" || fieldDef.type === "number" ? (
          <Input
            id={key}
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              handleChange(key, isNaN(num) ? undefined : num);
            }}
            disabled={isSubmitting}
            placeholder={fieldDef.hint}
            className={error ? "border-destructive" : ""}
          />
        ) : fieldDef.inputType === "date" || fieldDef.type === "date" ? (
          <Input
            id={key}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(key, e.target.value || undefined)}
            disabled={isSubmitting}
            className={error ? "border-destructive" : ""}
          />
        ) : (
          <Input
            id={key}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => handleChange(key, e.target.value || undefined)}
            disabled={isSubmitting}
            placeholder={fieldDef.hint}
            className={error ? "border-destructive" : ""}
          />
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
        {fieldDef.description && !error && (
          <p className="text-xs text-muted-foreground">{fieldDef.description}</p>
        )}
      </div>
    );
  };

  const renderFieldGrid = (fields: Array<[string, FieldDef]>) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {fields.map(([key, fieldDef]) => renderField(key, fieldDef))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isEdit ? "Edit" : "New"} {schema.displayName ?? schema.schemaName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasGroups ? (
            <>
              {[...groups].sort((a, b) => a.order - b.order).map((group) => {
                const fields = groupedFields.get(group.key) ?? [];
                if (fields.length === 0) return null;
                return (
                  <div key={group.key}>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </h3>
                    {renderFieldGrid(fields)}
                  </div>
                );
              })}
              {ungrouped.length > 0 && renderFieldGrid(ungrouped)}
            </>
          ) : (
            renderFieldGrid(ungrouped)
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
