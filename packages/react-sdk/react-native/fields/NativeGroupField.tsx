import React from "react";
import { View, Text } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import { NativeFieldRenderer } from "./NativeFieldRenderer.js";
import { fieldStyles as fs, groupStyles as s } from "../styles.js";

export function NativeGroupField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  const objValue =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const handlePropertyChange = (key: string, newValue: unknown) => {
    onChange({ ...objValue, [key]: newValue });
  };

  const properties = fieldDef.properties ?? {};
  const sortedKeys = Object.keys(properties).sort(
    (a, b) => (properties[a].order ?? 0) - (properties[b].order ?? 0),
  );

  return (
    <View style={s.container}>
      <Text style={s.legend}>
        {fieldDef.label ?? name}
        {fieldDef.required && <Text style={fs.required}> *</Text>}
      </Text>
      {error != null && <Text style={fs.error}>{error}</Text>}

      {sortedKeys.map((key) => (
        <NativeFieldRenderer
          key={key}
          name={`${name}.${key}`}
          fieldDef={properties[key]}
          value={objValue[key]}
          onChange={(v) => handlePropertyChange(key, v)}
          disabled={disabled}
        />
      ))}

      {fieldDef.description != null && <Text style={fs.description}>{fieldDef.description}</Text>}
    </View>
  );
}
