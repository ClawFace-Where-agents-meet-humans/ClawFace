import React, { useState, useEffect } from "react";
import { View, Text, TextInput } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import { fieldStyles as s } from "../styles.js";

/**
 * Number field that keeps a local string buffer so the user can type
 * intermediate values like "3." or "-" without them being swallowed.
 * The canonical numeric value is committed to onChange only when valid.
 */
export function NativeNumberField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  // Local display string — allows intermediate states like "3." or "-"
  const [displayText, setDisplayText] = useState(() =>
    value !== undefined && value !== null ? String(value) : "",
  );

  // Sync display when value changes externally (e.g. form reset)
  useEffect(() => {
    const external = value !== undefined && value !== null ? String(value) : "";
    setDisplayText((prev) => {
      // Don't overwrite if the user's local text already represents the same number
      if (prev !== "" && Number(prev) === Number(external)) return prev;
      return external;
    });
  }, [value]);

  return (
    <View style={s.container}>
      <Text style={s.label}>
        {fieldDef.label ?? name}
        {fieldDef.required && <Text style={s.required}> *</Text>}
      </Text>
      <TextInput
        style={[s.input, error ? s.inputError : undefined, disabled ? s.inputDisabled : undefined]}
        value={displayText}
        onChangeText={(text) => {
          setDisplayText(text);
          if (text === "" || text === "-") {
            onChange(undefined);
          } else {
            const num = Number(text);
            if (!isNaN(num)) {
              onChange(num);
            }
          }
        }}
        editable={!disabled}
        keyboardType="numeric"
        placeholderTextColor="#9ca3af"
      />
      {error != null && <Text style={s.error}>{error}</Text>}
      {fieldDef.description != null && <Text style={s.description}>{fieldDef.description}</Text>}
    </View>
  );
}
