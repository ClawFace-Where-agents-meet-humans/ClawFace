export type { FieldRendererProps, FieldComponent } from "./registry.js";
export { registerField, getFieldComponent, getRegistry } from "./registry.js";
export { FieldRenderer } from "./FieldRenderer.js";
export { TextField } from "./TextField.js";
export { TextAreaField } from "./TextAreaField.js";
export { SelectField } from "./SelectField.js";
export { DateField } from "./DateField.js";
export { ToggleField } from "./ToggleField.js";
export { NumberField } from "./NumberField.js";
export { ListField } from "./ListField.js";
export { GroupField } from "./GroupField.js";

// Register default field components
import { registerField } from "./registry.js";
import { TextField } from "./TextField.js";
import { TextAreaField } from "./TextAreaField.js";
import { SelectField } from "./SelectField.js";
import { DateField } from "./DateField.js";
import { ToggleField } from "./ToggleField.js";
import { NumberField } from "./NumberField.js";
import { ListField } from "./ListField.js";
import { GroupField } from "./GroupField.js";

registerField("text", TextField);
registerField("textarea", TextAreaField);
registerField("select", SelectField);
registerField("date", DateField);
registerField("toggle", ToggleField);
registerField("number", NumberField);
registerField("list", ListField);
registerField("group", GroupField);
