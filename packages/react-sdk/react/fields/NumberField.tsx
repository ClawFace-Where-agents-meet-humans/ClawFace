import React from "react";
import type { FieldRendererProps } from "./registry.js";

export function NumberField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  return (
    <div className="ocl-field ocl-field--number">
      <label htmlFor={name} className="ocl-field__label">
        {fieldDef.label ?? name}
        {fieldDef.required && <span className="ocl-field__required">*</span>}
      </label>
      <input
        id={name}
        type="number"
        className={`ocl-field__input${error ? " ocl-field__input--error" : ""}`}
        value={value !== undefined && value !== null ? String(value) : ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            onChange(undefined);
          } else {
            const num = Number(v);
            // Only propagate valid numbers — reject NaN
            if (!isNaN(num)) {
              onChange(num);
            }
          }
        }}
        disabled={disabled}
      />
      {error && <span className="ocl-field__error">{error}</span>}
      {fieldDef.description && <span className="ocl-field__description">{fieldDef.description}</span>}
    </div>
  );
}
