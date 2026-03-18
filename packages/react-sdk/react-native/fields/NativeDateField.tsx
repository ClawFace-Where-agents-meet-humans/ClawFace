import React from "react";
import { View, Text, TextInput } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import { fieldStyles as s } from "../styles.js";

/**
 * Minimal date field that accepts YYYY-MM-DD text input.
 *
 * For a native date picker experience consumers should register a custom
 * component that wraps @react-native-community/datetimepicker (or expo-date-time-picker)
 * via `registerField("date", MyNativeDatePicker)`.
 */
export function NativeDateField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  let dateValue = "";
  if (typeof value === "string" && value.length >= 10) {
    dateValue = value.substring(0, 10);
  }

  return (
    <View style={s.container}>
      <Text style={s.label}>
        {fieldDef.label ?? name}
        {fieldDef.required && <Text style={s.required}> *</Text>}
      </Text>
      <TextInput
        style={[s.input, error ? s.inputError : undefined, disabled ? s.inputDisabled : undefined]}
        value={dateValue}
        onChangeText={(text) => onChange(text || undefined)}
        editable={!disabled}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9ca3af"
        keyboardType="numbers-and-punctuation"
      />
      {error != null && <Text style={s.error}>{error}</Text>}
      {fieldDef.description != null && <Text style={s.description}>{fieldDef.description}</Text>}
    </View>
  );
}
