import React, { useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import type { RecordResponse, FieldDef } from "@clawface/shared";
import { useSchema } from "../../react/hooks/useSchema.js";
import { useRecords } from "../../react/hooks/useRecords.js";
import { tableStyles as s } from "../styles.js";

export interface NativeDataTableProps {
  schemaName: string;
  pageSize?: number;
  onRowPress?: (record: RecordResponse) => void;
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

export function NativeDataTable({ schemaName, pageSize: initialPageSize = 20, onRowPress }: NativeDataTableProps): React.JSX.Element {
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
    return (
      <View style={s.loading}>
        <ActivityIndicator />
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!schema) {
    return <Text style={s.errorText}>Schema not found.</Text>;
  }

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

  const renderHeader = () => (
    <View style={s.headerRow}>
      {fieldEntries.map(([key, fieldDef]) => (
        <Pressable key={key} style={s.headerCell} onPress={() => handleSort(key)}>
          <Text style={s.headerText}>
            {fieldDef.label ?? key}
            {orderBy === key && (
              <Text style={s.sortIndicator}>{orderDir === "asc" ? " ▲" : " ▼"}</Text>
            )}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderRow = ({ item: record }: { item: RecordResponse }) => (
    <Pressable style={s.row} onPress={() => onRowPress?.(record)}>
      {fieldEntries.map(([key, fieldDef]) => (
        <View key={key} style={s.cell}>
          <Text style={s.cellText} numberOfLines={1}>
            {renderCellValue(record.data[key], fieldDef)}
          </Text>
        </View>
      ))}
    </Pressable>
  );

  const renderEmpty = () => (
    <Text style={s.emptyText}>No records found.</Text>
  );

  const renderFooter = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={s.pagination}>
        <Pressable disabled={page === 0} onPress={() => setPage(page - 1)}>
          <Text style={[s.paginationBtnText, page === 0 ? s.paginationBtnDisabled : undefined]}>
            Previous
          </Text>
        </Pressable>
        <Text style={s.paginationText}>Page {page + 1} of {totalPages}</Text>
        <Pressable disabled={page >= totalPages - 1} onPress={() => setPage(page + 1)}>
          <Text style={[s.paginationBtnText, page >= totalPages - 1 ? s.paginationBtnDisabled : undefined]}>
            Next
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {renderHeader()}
      <FlatList
        data={records?.records ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}
