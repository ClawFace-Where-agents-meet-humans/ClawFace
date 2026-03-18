import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import type { FieldDef } from "@clawface/shared";
import { useSchema } from "../../react/hooks/useSchema.js";
import { useRecord } from "../../react/hooks/useRecord.js";
import { useFieldValidation } from "../../react/hooks/useFieldValidation.js";
import { NativeFieldRenderer } from "../fields/NativeFieldRenderer.js";
import { NativeFieldGroup } from "./NativeFieldGroup.js";
import type { ApiError } from "../../core/errors.js";
import { formStyles as s, fieldStyles as fs, tableStyles as ts } from "../styles.js";

export interface NativeRecordFormProps {
  schemaName: string;
  recordId?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function NativeRecordForm({ schemaName, recordId, onSubmit, onCancel, disabled }: NativeRecordFormProps): React.JSX.Element {
  const { data: schema, isLoading: schemaLoading } = useSchema(schemaName);
  const { data: existingRecord, isLoading: recordLoading, error: recordError } = useRecord(recordId);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep a ref to formData so handleSubmit always reads the latest value
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const validationErrors = useFieldValidation(schema, formData);

  useEffect(() => {
    if (recordId && existingRecord) {
      setFormData({ ...existingRecord.data });
    } else if (!recordId) {
      setFormData({});
    }
    setServerErrors({});
  }, [recordId, existingRecord]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!schema) return;
    setIsSubmitting(true);
    setServerErrors({});
    try {
      await onSubmit(formDataRef.current);
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
  }, [schema, onSubmit]);

  if (schemaLoading || (recordId && recordLoading)) {
    return (
      <View style={ts.loading}>
        <ActivityIndicator />
        <Text style={ts.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!schema) return <Text style={ts.errorText}>Schema not found.</Text>;

  if (recordId && !recordLoading && !existingRecord) {
    return (
      <Text style={ts.errorText}>
        Record not found.{recordError ? ` ${recordError.message}` : ""}
      </Text>
    );
  }

  const allErrors: Record<string, string | undefined> = { ...validationErrors, ...serverErrors };
  const sortedFields = Object.entries(schema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );
  const groups = schema.groups ?? [];
  const hasGroups = groups.length > 0;
  const isDisabled = disabled || isSubmitting;

  const renderActions = () => (
    <View style={s.actions}>
      {onCancel != null && (
        <Pressable style={s.cancelBtn} onPress={onCancel} disabled={isSubmitting}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </Pressable>
      )}
      <Pressable
        style={[s.submitBtn, isDisabled ? s.submitBtnDisabled : undefined]}
        onPress={handleSubmit}
        disabled={isDisabled}
      >
        <Text style={s.submitBtnText}>
          {isSubmitting ? "Saving..." : recordId ? "Update" : "Create"}
        </Text>
      </Pressable>
    </View>
  );

  if (hasGroups) {
    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
    const groupedFields = new Map<string, Array<{ key: string; fieldDef: FieldDef }>>();
    const ungrouped: Array<{ key: string; fieldDef: FieldDef }> = [];

    for (const [key, fieldDef] of sortedFields) {
      if (fieldDef.group) {
        const arr = groupedFields.get(fieldDef.group) ?? [];
        arr.push({ key, fieldDef });
        groupedFields.set(fieldDef.group, arr);
      } else {
        ungrouped.push({ key, fieldDef });
      }
    }

    return (
      <ScrollView style={s.container}>
        {sortedGroups.map((group) => {
          const fields = groupedFields.get(group.key) ?? [];
          if (fields.length === 0) return null;
          return (
            <NativeFieldGroup
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
        {ungrouped.length > 0 &&
          ungrouped.map(({ key, fieldDef }) => (
            <NativeFieldRenderer
              key={key}
              name={key}
              fieldDef={fieldDef}
              value={formData[key]}
              onChange={(v) => handleChange(key, v)}
              error={allErrors[key]}
              disabled={isDisabled}
            />
          ))
        }
        {renderActions()}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.container}>
      {sortedFields.map(([key, fieldDef]) => (
        <NativeFieldRenderer
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
    </ScrollView>
  );
}
