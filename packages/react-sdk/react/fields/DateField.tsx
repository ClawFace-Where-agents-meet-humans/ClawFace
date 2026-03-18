import React from "react";
import type { FieldRendererProps } from "./registry.js";

export function DateField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  // Extract YYYY-MM-DD from value (handles ISO strings, date-only strings)
  let dateValue = "";
  if (typeof value === "string" && value.length >= 10) {
    dateValue = value.substring(0, 10);
  }

  return (
    <div className="ocl-field ocl-field--date">
      <label htmlFor={name} className="ocl-field__label">
        {fieldDef.label ?? name}
        {fieldDef.required && <span className="ocl-field__required">*</span>}
      </label>
      <input
        id={name}
        type="date"
        className={`ocl-field__input${error ? " ocl-field__input--error" : ""}`}
        value={dateValue}
        onChange={(e) => {
          // Store as ISO date string (YYYY-MM-DD) to avoid timezone shifts.
          // If full ISO timestamp is needed, the consumer can convert.
          onChange(e.target.value || undefined);
        }}
        disabled={disabled}
      />
      {error && <span className="ocl-field__error">{error}</span>}
      {fieldDef.description && <span className="ocl-field__description">{fieldDef.description}</span>}
    </div>
  );
}
