/**
 * Isolated field registry for React Native.
 *
 * The web entry point (react/fields/registry.ts) has its own module-level Map
 * and the RN entry point has this one. This prevents cross-contamination when
 * both are accidentally imported in the same bundle (monorepo, SSR, tests).
 */

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

const nativeRegistry = new Map<InputType, FieldComponent>();

export function registerNativeField(inputType: InputType, component: FieldComponent): void {
  nativeRegistry.set(inputType, component);
}

export function getNativeFieldComponent(inputType: InputType): FieldComponent | undefined {
  return nativeRegistry.get(inputType);
}

export function getNativeRegistry(): Map<InputType, FieldComponent> {
  return nativeRegistry;
}

/**
 * Convenience aliases so consumers can use the same `registerField` name
 * regardless of platform. These operate on the *native* registry only.
 */
export const registerField = registerNativeField;
export const getFieldComponent = getNativeFieldComponent;
export const getRegistry = getNativeRegistry;
