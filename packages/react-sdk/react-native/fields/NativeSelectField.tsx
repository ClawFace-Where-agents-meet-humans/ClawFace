import React, { useState } from "react";
import { View, Text, Pressable, Modal, FlatList } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import { fieldStyles as fs, selectStyles as s } from "../styles.js";

export function NativeSelectField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const options = fieldDef.options ?? [];

  const handleSelect = (opt: string | undefined) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <View style={fs.container}>
      <Text style={fs.label}>
        {fieldDef.label ?? name}
        {fieldDef.required && <Text style={fs.required}> *</Text>}
      </Text>

      <Pressable
        style={[s.trigger, error ? s.triggerError : undefined, disabled ? s.triggerDisabled : undefined]}
        onPress={() => !disabled && setOpen(true)}
      >
        {value ? (
          <Text style={s.triggerText}>{String(value)}</Text>
        ) : (
          <Text style={s.triggerPlaceholder}>— Select —</Text>
        )}
        <Text style={s.triggerArrow}>▼</Text>
      </Pressable>

      {error != null && <Text style={fs.error}>{error}</Text>}
      {fieldDef.description != null && <Text style={fs.description}>{fieldDef.description}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        {/* Backdrop — closes modal on tap */}
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          {/* Content sheet — stop propagation so taps inside don't dismiss */}
          <Pressable style={s.modal} onPress={() => { /* swallow */ }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{fieldDef.label ?? name}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={s.modalDone}>Done</Text>
              </Pressable>
            </View>

            {/* Clear option */}
            <Pressable
              style={[s.option, !value ? s.optionSelected : undefined]}
              onPress={() => handleSelect(undefined)}
            >
              <Text style={s.optionText}>— None —</Text>
              {!value && <Text style={s.optionCheck}>✓</Text>}
            </Pressable>

            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.option, value === item ? s.optionSelected : undefined]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={s.optionText}>{item}</Text>
                  {value === item && <Text style={s.optionCheck}>✓</Text>}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
