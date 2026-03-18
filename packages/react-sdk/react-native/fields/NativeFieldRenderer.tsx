import React from "react";
import { View, Text } from "react-native";
import type { FieldRendererProps } from "./registry.js";
import { getNativeFieldComponent } from "./registry.js";
import { INPUT_TYPE_DEFAULTS } from "@clawface/shared";
import { fieldStyles as s } from "../styles.js";

export function NativeFieldRenderer(props: FieldRendererProps): React.JSX.Element {
  const inputType = props.fieldDef.inputType ?? INPUT_TYPE_DEFAULTS[props.fieldDef.type]?.default ?? "text";
  const Component = getNativeFieldComponent(inputType);

  if (!Component) {
    return (
      <View style={s.unsupported}>
        <Text style={s.unsupportedText}>Unsupported input type: {inputType}</Text>
      </View>
    );
  }

  return <Component {...props} />;
}
