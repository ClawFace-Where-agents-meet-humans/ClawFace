import React from "react";
import type { FieldRendererProps } from "./registry.js";

export function ToggleField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  return (
    <div className="ocl-field ocl-field--toggle">
      <label className="ocl-field__toggle-label">
        <input
          id={name}
          type="checkbox"
          className="ocl-field__toggle-input"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="ocl-field__toggle-switch" />
        <span className="ocl-field__label">
          {fieldDef.label ?? name}
          {fieldDef.required && <span className="ocl-field__required">*</span>}
        </span>
      </label>
      {error && <span className="ocl-field__error">{error}</span>}
      {fieldDef.description && <span className="ocl-field__description">{fieldDef.description}</span>}
    </div>
  );
}
