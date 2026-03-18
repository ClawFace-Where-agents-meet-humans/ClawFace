import React from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import type { SchemaResponse } from "@clawface/shared";
import { useSchemas } from "../../react/hooks/useSchemas.js";
import { schemaListStyles as s, tableStyles as ts } from "../styles.js";

export interface NativeSchemaListProps {
  onSelect?: (schema: SchemaResponse) => void;
}

export function NativeSchemaList({ onSelect }: NativeSchemaListProps): React.JSX.Element {
  const { data, error, isLoading } = useSchemas();

  if (isLoading) {
    return (
      <View style={ts.loading}>
        <ActivityIndicator />
        <Text style={ts.loadingText}>Loading schemas...</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={ts.errorText}>Error: {error.message}</Text>;
  }

  if (!data || data.length === 0) {
    return <Text style={ts.loadingText}>No schemas found.</Text>;
  }

  return (
    <FlatList
      style={s.container}
      data={data}
      keyExtractor={(item) => item.schemaName}
      renderItem={({ item }) => (
        <Pressable style={s.card} onPress={() => onSelect?.(item)}>
          {item.icon != null && <Text style={s.icon}>{item.icon}</Text>}
          <View style={s.body}>
            <Text style={s.title}>{item.displayName ?? item.schemaName}</Text>
            {item.description != null && <Text style={s.description}>{item.description}</Text>}
            <Text style={s.meta}>{Object.keys(item.fields).length} fields</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
