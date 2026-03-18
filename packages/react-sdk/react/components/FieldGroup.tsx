import React from "react";
import type { FieldDef, GroupDef } from "@clawface/shared";
import { FieldRenderer } from "../fields/FieldRenderer.js";

export interface FieldGroupProps {
  group: GroupDef;
  fields: Array<{ key: string; fieldDef: FieldDef }>;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors: Record<string, string | undefined>;
  disabled?: boolean;
}

export function FieldGroup({ group, fields, data, onChange, errors, disabled }: FieldGroupProps): React.JSX.Element {
  return (
    <fieldset className="ocl-group">
      <legend className="ocl-group__label">{group.label}</legend>
      <div className="ocl-group__fields">
        {fields.map(({ key, fieldDef }) => (
          <FieldRenderer
            key={key}
            name={key}
            fieldDef={fieldDef}
            value={data[key]}
            onChange={(v) => onChange(key, v)}
            error={errors[key]}
            disabled={disabled}
          />
        ))}
      </div>
    </fieldset>
  );
}
