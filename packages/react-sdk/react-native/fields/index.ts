export type { FieldRendererProps, FieldComponent } from "./registry.js";
export {
  registerField, getFieldComponent, getRegistry,
  registerNativeField, getNativeFieldComponent, getNativeRegistry,
} from "./registry.js";
export { NativeFieldRenderer } from "./NativeFieldRenderer.js";
export { NativeTextField } from "./NativeTextField.js";
export { NativeTextAreaField } from "./NativeTextAreaField.js";
export { NativeSelectField } from "./NativeSelectField.js";
export { NativeDateField } from "./NativeDateField.js";
export { NativeToggleField } from "./NativeToggleField.js";
export { NativeNumberField } from "./NativeNumberField.js";
export { NativeListField } from "./NativeListField.js";
export { NativeGroupField } from "./NativeGroupField.js";

// Register native field components as defaults in the *native* registry
import { registerNativeField } from "./registry.js";
import { NativeTextField } from "./NativeTextField.js";
import { NativeTextAreaField } from "./NativeTextAreaField.js";
import { NativeSelectField } from "./NativeSelectField.js";
import { NativeDateField } from "./NativeDateField.js";
import { NativeToggleField } from "./NativeToggleField.js";
import { NativeNumberField } from "./NativeNumberField.js";
import { NativeListField } from "./NativeListField.js";
import { NativeGroupField } from "./NativeGroupField.js";

registerNativeField("text", NativeTextField);
registerNativeField("textarea", NativeTextAreaField);
registerNativeField("select", NativeSelectField);
registerNativeField("date", NativeDateField);
registerNativeField("toggle", NativeToggleField);
registerNativeField("number", NativeNumberField);
registerNativeField("list", NativeListField);
registerNativeField("group", NativeGroupField);
