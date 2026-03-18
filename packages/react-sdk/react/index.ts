// Provider
export { OpenClawProvider, useOpenClawClient } from "./provider.js";
export type { OpenClawProviderProps } from "./provider.js";

// Hooks
export {
  useSchemas,
  useSchema,
  useRecords,
  useRecord,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useFieldValidation,
} from "./hooks/index.js";
export type {
  UseSchemasResult,
  UseSchemaResult,
  UseRecordsResult,
  UseRecordResult,
  MutationState,
} from "./hooks/index.js";

// Components
export {
  SchemaList,
  DataTable,
  RecordForm,
  RecordDetail,
  FieldGroup,
} from "./components/index.js";
export type {
  SchemaListProps,
  DataTableProps,
  RecordFormProps,
  RecordDetailProps,
  FieldGroupProps,
} from "./components/index.js";

// Fields (for custom field registration)
export {
  FieldRenderer,
  registerField,
  getFieldComponent,
  getRegistry,
} from "./fields/index.js";
export type { FieldRendererProps, FieldComponent } from "./fields/index.js";

// Re-export core client for convenience
export { OpenClawClient, ApiError } from "../core/index.js";
export type { OpenClawClientOptions } from "../core/index.js";
