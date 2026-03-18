import type React from "react";
import type { FieldDef, InputType } from "@clawface/shared";

export interface FieldRendererProps {
  name: string;
  fieldDef: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export type FieldComponent = React.ComponentType<FieldRendererProps>;

const registry = new Map<InputType, FieldComponent>();

export function registerField(inputType: InputType, component: FieldComponent): void {
  registry.set(inputType, component);
}

export function getFieldComponent(inputType: InputType): FieldComponent | undefined {
  return registry.get(inputType);
}

export function getRegistry(): Map<InputType, FieldComponent> {
  return registry;
}
