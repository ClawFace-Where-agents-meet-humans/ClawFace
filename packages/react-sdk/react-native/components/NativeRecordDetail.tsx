import React from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import type { FieldDef, GroupDef } from "@clawface/shared";
import { useSchema } from "../../react/hooks/useSchema.js";
import { useRecord } from "../../react/hooks/useRecord.js";
import { detailStyles as s, tableStyles as ts } from "../styles.js";

export interface NativeRecordDetailProps {
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

function FieldDisplay({ fieldKey, fieldDef, value }: { fieldKey: string; fieldDef: FieldDef; value: unknown }): React.JSX.Element {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{fieldDef.label ?? fieldKey}</Text>
      <Text style={s.fieldValue}>{renderValue(value, fieldDef)}</Text>
    </View>
  );
}

export function NativeRecordDetail({ schemaName, recordId }: NativeRecordDetailProps): React.JSX.Element {
  const { data: schema, isLoading: schemaLoading } = useSchema(schemaName);
  const { data: record, isLoading: recordLoading } = useRecord(recordId);

  if (schemaLoading || recordLoading) {
    return (
      <View style={ts.loading}>
        <ActivityIndicator />
        <Text style={ts.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!schema) return <Text style={ts.errorText}>Schema not found.</Text>;
  if (!record) return <Text style={ts.errorText}>Record not found.</Text>;

  const sortedFields = Object.entries(schema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );

  const groups = schema.groups ?? [];
  const hasGroups = groups.length > 0;

  const renderMeta = () => (
    <View style={s.meta}>
      <Text style={s.metaText}>Created: {new Date(record.createdAt).toLocaleString()}</Text>
      <Text style={s.metaText}>Updated: {new Date(record.updatedAt).toLocaleString()}</Text>
    </View>
  );

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
      <ScrollView style={s.container}>
        {sortedGroups.map((group) => {
          const fields = groupedFields.get(group.key) ?? [];
          if (fields.length === 0) return null;
          return (
            <View key={group.key} style={s.groupContainer}>
              <Text style={s.groupLabel}>{group.label}</Text>
              {fields.map(([key, fieldDef]) => (
                <FieldDisplay key={key} fieldKey={key} fieldDef={fieldDef} value={record.data[key]} />
              ))}
            </View>
          );
        })}
        {ungrouped.length > 0 &&
          ungrouped.map(([key, fieldDef]) => (
            <FieldDisplay key={key} fieldKey={key} fieldDef={fieldDef} value={record.data[key]} />
          ))
        }
        {renderMeta()}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.container}>
      {sortedFields.map(([key, fieldDef]) => (
        <FieldDisplay key={key} fieldKey={key} fieldDef={fieldDef} value={record.data[key]} />
      ))}
      {renderMeta()}
    </ScrollView>
  );
}
