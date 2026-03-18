import React from "react";
import type { FieldRendererProps } from "./registry.js";
import { getFieldComponent } from "./registry.js";
import { INPUT_TYPE_DEFAULTS } from "@clawface/shared";

export function FieldRenderer(props: FieldRendererProps): React.JSX.Element {
  const inputType = props.fieldDef.inputType ?? INPUT_TYPE_DEFAULTS[props.fieldDef.type]?.default ?? "text";
  const Component = getFieldComponent(inputType);

  if (!Component) {
    return (
      <div className="ocl-field ocl-field--unsupported">
        <span>Unsupported input type: {inputType}</span>
      </div>
    );
  }

  return <Component {...props} />;
}
