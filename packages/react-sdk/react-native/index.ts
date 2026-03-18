// ── Provider & Client (shared with web — no DOM deps) ──────────────────────
export { OpenClawProvider, useOpenClawClient } from "../react/provider.js";
export type { OpenClawProviderProps } from "../react/provider.js";

// ── Hooks (shared with web — no DOM deps) ───────────────────────────────────
export {
  useSchemas,
  useSchema,
  useRecords,
  useRecord,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useFieldValidation,
} from "../react/hooks/index.js";
export type {
  UseSchemasResult,
  UseSchemaResult,
  UseRecordsResult,
  UseRecordResult,
  MutationState,
} from "../react/hooks/index.js";

// ── Native Components ───────────────────────────────────────────────────────
export {
  NativeSchemaList,
  NativeDataTable,
  NativeRecordForm,
  NativeRecordDetail,
  NativeFieldGroup,
} from "./components/index.js";
export type {
  NativeSchemaListProps,
  NativeDataTableProps,
  NativeRecordFormProps,
  NativeRecordDetailProps,
  NativeFieldGroupProps,
} from "./components/index.js";

// ── Native Fields ───────────────────────────────────────────────────────────
// Importing the field index registers all native field components via registerNativeField().
export {
  NativeFieldRenderer,
  NativeTextField,
  NativeTextAreaField,
  NativeSelectField,
  NativeDateField,
  NativeToggleField,
  NativeNumberField,
  NativeListField,
  NativeGroupField,
  registerField,
  getFieldComponent,
  getRegistry,
  registerNativeField,
  getNativeFieldComponent,
  getNativeRegistry,
} from "./fields/index.js";
export type { FieldRendererProps, FieldComponent } from "./fields/index.js";

// ── Core Client (convenience re-export) ─────────────────────────────────────
export { OpenClawClient, ApiError } from "../core/index.js";
export type { OpenClawClientOptions } from "../core/index.js";
