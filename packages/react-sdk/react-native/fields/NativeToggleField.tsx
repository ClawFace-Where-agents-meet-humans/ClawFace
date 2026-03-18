import React from "react";
import { View, Text, Switch } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import { fieldStyles as fs, toggleStyles as s } from "../styles.js";

export function NativeToggleField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  return (
    <View>
      <View style={s.row}>
        <Switch
          value={Boolean(value)}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        />
        <Text style={s.label}>
          {fieldDef.label ?? name}
          {fieldDef.required && <Text style={fs.required}> *</Text>}
        </Text>
      </View>
      {error != null && <Text style={fs.error}>{error}</Text>}
      {fieldDef.description != null && <Text style={fs.description}>{fieldDef.description}</Text>}
    </View>
  );
}
