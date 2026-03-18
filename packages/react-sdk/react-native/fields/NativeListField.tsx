import React, { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import type { FieldDef } from "@clawface/shared";
import { NativeFieldRenderer } from "./NativeFieldRenderer.js";
import { fieldStyles as fs, listStyles as s } from "../styles.js";

/** Monotonically increasing ID for stable list keys. */
let nextStableId = 0;

export function NativeListField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  const itemDef: FieldDef = fieldDef.items ?? { type: "string" };

  // Assign a stable key to each item that persists across re-renders.
  const keysRef = useRef<number[]>([]);
  while (keysRef.current.length < items.length) {
    keysRef.current.push(nextStableId++);
  }
  keysRef.current.length = items.length;

  const handleItemChange = (index: number, newValue: unknown) => {
    const updated = [...items];
    updated[index] = newValue;
    onChange(updated);
  };

  const handleAdd = () => {
    keysRef.current.push(nextStableId++);
    onChange([...items, undefined]);
  };

  const handleRemove = (index: number) => {
    keysRef.current.splice(index, 1);
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <View style={fs.container}>
      <Text style={fs.label}>
        {fieldDef.label ?? name}
        {fieldDef.required && <Text style={fs.required}> *</Text>}
      </Text>
      {error != null && <Text style={fs.error}>{error}</Text>}

      {items.map((item, index) => (
        <View key={keysRef.current[index]} style={s.item}>
          <View style={s.itemField}>
            <NativeFieldRenderer
              name={`${name}[${index}]`}
              fieldDef={itemDef}
              value={item}
              onChange={(v) => handleItemChange(index, v)}
              disabled={disabled}
            />
          </View>
          {!disabled && (
            <Pressable style={s.removeBtn} onPress={() => handleRemove(index)}>
              <Text style={s.removeBtnText}>Remove</Text>
            </Pressable>
          )}
        </View>
      ))}

      {!disabled && (
        <Pressable style={s.addBtn} onPress={handleAdd}>
          <Text style={s.addBtnText}>+ Add item</Text>
        </Pressable>
      )}
      {fieldDef.description != null && <Text style={fs.description}>{fieldDef.description}</Text>}
    </View>
  );
}
