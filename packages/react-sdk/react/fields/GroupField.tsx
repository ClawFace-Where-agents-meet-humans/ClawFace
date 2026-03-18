import React from "react";
import type { FieldRendererProps } from "./registry.js";
import { FieldRenderer } from "./FieldRenderer.js";

export function GroupField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  const objValue = (typeof value === "object" && value !== null && !Array.isArray(value))
    ? value as Record<string, unknown>
    : {};

  const handlePropertyChange = (key: string, newValue: unknown) => {
    onChange({ ...objValue, [key]: newValue });
  };

  const properties = fieldDef.properties ?? {};
  const sortedKeys = Object.keys(properties).sort(
    (a, b) => (properties[a].order ?? 0) - (properties[b].order ?? 0),
  );

  return (
    <fieldset className="ocl-field ocl-field--group">
      <legend className="ocl-field__label">
        {fieldDef.label ?? name}
        {fieldDef.required && <span className="ocl-field__required">*</span>}
      </legend>
      {error && <span className="ocl-field__error">{error}</span>}
      <div className="ocl-group__fields">
        {sortedKeys.map((key) => (
          <FieldRenderer
            key={key}
            name={`${name}.${key}`}
            fieldDef={properties[key]}
            value={objValue[key]}
            onChange={(v) => handlePropertyChange(key, v)}
            disabled={disabled}
          />
        ))}
      </div>
      {fieldDef.description && <span className="ocl-field__description">{fieldDef.description}</span>}
    </fieldset>
  );
}
