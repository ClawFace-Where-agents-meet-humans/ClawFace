import React from "react";
import { View, Text } from "react-native";
import type { FieldDef, GroupDef } from "@clawface/shared";
import { NativeFieldRenderer } from "../fields/NativeFieldRenderer.js";
import { groupStyles as s } from "../styles.js";

export interface NativeFieldGroupProps {
  group: GroupDef;
  fields: Array<{ key: string; fieldDef: FieldDef }>;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors: Record<string, string | undefined>;
  disabled?: boolean;
}

export function NativeFieldGroup({ group, fields, data, onChange, errors, disabled }: NativeFieldGroupProps): React.JSX.Element {
  return (
    <View style={s.container}>
      <Text style={s.legend}>{group.label}</Text>
      {fields.map(({ key, fieldDef }) => (
        <NativeFieldRenderer
          key={key}
          name={key}
          fieldDef={fieldDef}
          value={data[key]}
          onChange={(v) => onChange(key, v)}
          error={errors[key]}
          disabled={disabled}
        />
      ))}
    </View>
  );
}
