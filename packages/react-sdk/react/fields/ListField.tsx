import React from "react";
import type { FieldRendererProps } from "./registry.js";
import { FieldRenderer } from "./FieldRenderer.js";
import type { FieldDef } from "@clawface/shared";

export function ListField({ name, fieldDef, value, onChange, error, disabled }: FieldRendererProps): React.JSX.Element {
  const items = Array.isArray(value) ? value : [];
  const itemDef: FieldDef = fieldDef.items ?? { type: "string" };

  const handleItemChange = (index: number, newValue: unknown) => {
    const updated = [...items];
    updated[index] = newValue;
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...items, undefined]);
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="ocl-field ocl-field--list">
      <label className="ocl-field__label">
        {fieldDef.label ?? name}
        {fieldDef.required && <span className="ocl-field__required">*</span>}
      </label>
      {error && <span className="ocl-field__error">{error}</span>}
      <div className="ocl-list__items">
        {items.map((item, index) => (
          <div key={index} className="ocl-list__item">
            <FieldRenderer
              name={`${name}[${index}]`}
              fieldDef={itemDef}
              value={item}
              onChange={(v) => handleItemChange(index, v)}
              disabled={disabled}
            />
            {!disabled && (
              <button
                type="button"
                className="ocl-list__remove"
                onClick={() => handleRemove(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <button type="button" className="ocl-list__add" onClick={handleAdd}>
          + Add item
        </button>
      )}
      {fieldDef.description && <span className="ocl-field__description">{fieldDef.description}</span>}
    </div>
  );
}
