import React from "react";
import type { FieldRendererProps } from "./registry.js";

export function TextAreaField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  return (
    <div className="ocl-field ocl-field--textarea">
      <label htmlFor={name} className="ocl-field__label">
        {fieldDef.label ?? name}
        {fieldDef.required && <span className="ocl-field__required">*</span>}
      </label>
      <textarea
        id={name}
        className={`ocl-field__input ocl-field__textarea${error ? " ocl-field__input--error" : ""}`}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
      />
      {error && <span className="ocl-field__error">{error}</span>}
      {fieldDef.description && <span className="ocl-field__description">{fieldDef.description}</span>}
    </div>
  );
}
