import React from "react";
import { View, Text, TextInput } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import { fieldStyles as s } from "../styles.js";

export function NativeTextAreaField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  return (
    <View style={s.container}>
      <Text style={s.label}>
        {fieldDef.label ?? name}
        {fieldDef.required && <Text style={s.required}> *</Text>}
      </Text>
      <TextInput
        style={[s.input, s.textarea, error ? s.inputError : undefined, disabled ? s.inputDisabled : undefined]}
        value={(value as string) ?? ""}
        onChangeText={(text) => onChange(text || undefined)}
        editable={!disabled}
        multiline
        numberOfLines={4}
        placeholderTextColor="#9ca3af"
      />
      {error != null && <Text style={s.error}>{error}</Text>}
      {fieldDef.description != null && <Text style={s.description}>{fieldDef.description}</Text>}
    </View>
  );
}
