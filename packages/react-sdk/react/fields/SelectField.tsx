import React from "react";
import type { FieldRendererProps } from "./registry.js";

export function SelectField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  return (
    <div className="ocl-field ocl-field--select">
      <label htmlFor={name} className="ocl-field__label">
        {fieldDef.label ?? name}
        {fieldDef.required && <span className="ocl-field__required">*</span>}
      </label>
      <select
        id={name}
        className={`ocl-field__input${error ? " ocl-field__input--error" : ""}`}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
      >
        <option value="">— Select —</option>
        {fieldDef.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {error && <span className="ocl-field__error">{error}</span>}
      {fieldDef.description && <span className="ocl-field__description">{fieldDef.description}</span>}
    </div>
  );
}
