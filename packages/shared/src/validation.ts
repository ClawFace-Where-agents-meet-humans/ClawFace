import type {
  FieldDef,
  FieldType,
  SchemaInput,
  SchemaResponse,
  ValidationErrorDetail,
} from "./types.js";
import {
  SCHEMA_NAME_REGEX,
  FIELD_KEY_REGEX,
} from "./constants.js";
import { INPUT_TYPE_DEFAULTS } from "./types.js";

// ── Schema Validation (Layer 1) ──────────────────────────────────────────────

/**
 * Validate a schema definition before creating or updating.
 * Returns an array of errors — empty means valid.
 */
export function validateSchemaInput(
  schemaName: string,
  input: SchemaInput | Partial<SchemaInput>,
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];

  // Validate schemaName format
  if (!SCHEMA_NAME_REGEX.test(schemaName)) {
    errors.push({
      field: "schemaName",
      message:
        `schemaName '${schemaName}' is invalid. Must be lowercase alphanumeric with underscores, ` +
        `starting with a letter, max 50 chars (pattern: ${SCHEMA_NAME_REGEX.source})`,
    });
  }

  // Fields must exist and be non-empty
  const fields = input.fields;
  if (fields !== undefined) {
    if (Object.keys(fields).length === 0) {
      errors.push({
        field: "fields",
        message: "Schema must have at least one field",
      });
    } else {
      // Collect valid group keys if groups are defined
      const validGroupKeys = new Set(
        input.groups?.map((g) => g.key) ?? [],
      );
      const hasGroups = input.groups !== undefined && input.groups.length > 0;

      for (const [key, fieldDef] of Object.entries(fields)) {
        validateFieldDef(key, fieldDef, errors, hasGroups, validGroupKeys);
      }
    }
  }

  return errors;
}

function validateFieldDef(
  key: string,
  fieldDef: FieldDef,
  errors: ValidationErrorDetail[],
  hasGroups: boolean,
  validGroupKeys: Set<string>,
  prefix = "",
): void {
  const fullKey = prefix ? `${prefix}.${key}` : key;

  // Validate field key format
  if (!FIELD_KEY_REGEX.test(key)) {
    errors.push({
      field: fullKey,
      message:
        `Field key '${key}' is invalid. Must start with lowercase letter, ` +
        `contain only alphanumeric and underscores, max 50 chars`,
    });
  }

  // Validate inputType/type consistency
  if (fieldDef.inputType !== undefined) {
    const typeConfig = INPUT_TYPE_DEFAULTS[fieldDef.type];
    if (typeConfig && !typeConfig.allowed.includes(fieldDef.inputType)) {
      errors.push({
        field: fullKey,
        message:
          `inputType '${fieldDef.inputType}' is not compatible with type '${fieldDef.type}'. ` +
          `Allowed: ${typeConfig.allowed.join(", ")}`,
      });
    }
  }

  // Select must have non-empty options
  if (fieldDef.inputType === "select") {
    if (!fieldDef.options || fieldDef.options.length === 0) {
      errors.push({
        field: fullKey,
        message: `Field '${fullKey}' with inputType 'select' must have a non-empty 'options' array`,
      });
    }
  }

  // Object must have non-empty properties
  if (fieldDef.type === "object") {
    if (!fieldDef.properties || Object.keys(fieldDef.properties).length === 0) {
      errors.push({
        field: fullKey,
        message: `Field '${fullKey}' with type 'object' must have non-empty 'properties'`,
      });
    } else if (fieldDef.properties) {
      for (const [nestedKey, nestedDef] of Object.entries(fieldDef.properties)) {
        validateFieldDef(nestedKey, nestedDef, errors, hasGroups, validGroupKeys, fullKey);
      }
    }
  }

  // Group reference validation
  if (hasGroups && fieldDef.group !== undefined && !validGroupKeys.has(fieldDef.group)) {
    errors.push({
      field: fullKey,
      message:
        `Field '${fullKey}' references group '${fieldDef.group}' which is not defined. ` +
        `Available groups: ${[...validGroupKeys].join(", ")}`,
    });
  }
}

// ── Schema Normalization ─────────────────────────────────────────────────────

/**
 * Auto-fill defaults for missing optional fields:
 * - inputType defaults based on type
 * - label from field key (camelCase/snake_case → Title Case)
 * - sequential order for fields without explicit order
 * - array items default to { type: "string" }
 */
export function normalizeSchemaInput(input: SchemaInput): SchemaInput {
  const normalizedFields: Record<string, FieldDef> = {};
  let orderCounter = 1;

  for (const [key, fieldDef] of Object.entries(input.fields)) {
    const normalized: FieldDef = { ...fieldDef };

    // Auto-fill inputType
    if (normalized.inputType === undefined) {
      normalized.inputType = INPUT_TYPE_DEFAULTS[normalized.type]?.default;
    }

    // Auto-fill label
    if (normalized.label === undefined) {
      normalized.label = keyToLabel(key);
    }

    // Auto-fill order
    if (normalized.order === undefined) {
      normalized.order = orderCounter;
    }
    orderCounter++;

    // Default array items
    if (normalized.type === "array" && normalized.items === undefined) {
      normalized.items = { type: "string" };
    }

    // Recursively normalize nested object properties
    if (normalized.type === "object" && normalized.properties) {
      const nestedInput: SchemaInput = { fields: normalized.properties };
      const nestedNormalized = normalizeSchemaInput(nestedInput);
      normalized.properties = nestedNormalized.fields;
    }

    normalizedFields[key] = normalized;
  }

  return { ...input, fields: normalizedFields };
}

/** Convert camelCase or snake_case key to Title Case label. */
function keyToLabel(key: string): string {
  // Handle snake_case: split on underscores
  if (key.includes("_")) {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  // Handle camelCase: split on uppercase transitions
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

// ── Record Validation (Layer 2) ──────────────────────────────────────────────

/** Schema-like structure needed for record validation (works with both SchemaDoc and SchemaResponse). */
export interface SchemaLike {
  fields: Record<string, FieldDef>;
  schemaName: string;
}

/**
 * Validate record data against a schema.
 * Returns an array of errors — empty means valid.
 */
export function validateRecordData(
  schema: SchemaLike,
  data: Record<string, unknown>,
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];
  const definedFieldNames = Object.keys(schema.fields);

  // Check for unknown fields
  for (const key of Object.keys(data)) {
    if (!(key in schema.fields)) {
      errors.push({
        field: key,
        message: `Unknown field '${key}'. Defined fields: [${definedFieldNames.join(", ")}]`,
      });
    }
  }

  // Validate each defined field
  for (const [key, fieldDef] of Object.entries(schema.fields)) {
    const value = data[key];
    validateFieldValue(key, fieldDef, value, errors);
  }

  return errors;
}

function validateFieldValue(
  fieldPath: string,
  fieldDef: FieldDef,
  value: unknown,
  errors: ValidationErrorDetail[],
): void {
  // Required check
  if (fieldDef.required && (value === undefined || value === null)) {
    errors.push({
      field: fieldPath,
      message: `Field '${fieldPath}' is required`,
    });
    return;
  }

  // Skip validation for optional missing fields
  if (value === undefined || value === null) {
    return;
  }

  // Type-specific validation
  validateType(fieldPath, fieldDef, value, errors);
}

function validateType(
  fieldPath: string,
  fieldDef: FieldDef,
  value: unknown,
  errors: ValidationErrorDetail[],
): void {
  const typeValidators: Record<FieldType, () => void> = {
    string: () => {
      if (typeof value !== "string") {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be string, got ${typeof value}`,
        });
        return;
      }
      // Select option validation
      if (fieldDef.inputType === "select" && fieldDef.options && fieldDef.options.length > 0) {
        if (!fieldDef.options.includes(value)) {
          errors.push({
            field: fieldPath,
            message:
              `Field '${fieldPath}' value '${value}' is not a valid option. ` +
              `Allowed: [${fieldDef.options.join(", ")}]`,
          });
        }
      }
    },

    number: () => {
      if (typeof value !== "number" || isNaN(value)) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be number, got ${typeof value === "number" ? "NaN" : typeof value}`,
        });
      }
    },

    boolean: () => {
      if (typeof value !== "boolean") {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be boolean, got ${typeof value}`,
        });
      }
    },

    date: () => {
      if (typeof value !== "string") {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be a date string (ISO 8601), got ${typeof value}`,
        });
        return;
      }
      if (isNaN(Date.parse(value))) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be a valid ISO 8601 date string, got '${value}'`,
        });
      }
    },

    array: () => {
      if (!Array.isArray(value)) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be an array, got ${typeof value}`,
        });
        return;
      }
      // Validate array items if items schema defined
      if (fieldDef.items) {
        for (let i = 0; i < value.length; i++) {
          validateType(`${fieldPath}[${i}]`, fieldDef.items, value[i], errors);
        }
      }
    },

    object: () => {
      if (typeof value !== "object" || Array.isArray(value) || value === null) {
        errors.push({
          field: fieldPath,
          message: `Field '${fieldPath}' must be an object, got ${Array.isArray(value) ? "array" : typeof value}`,
        });
        return;
      }
      // Validate nested properties
      if (fieldDef.properties) {
        const objValue = value as Record<string, unknown>;
        // Check unknown nested fields
        for (const nestedKey of Object.keys(objValue)) {
          if (!(nestedKey in fieldDef.properties)) {
            errors.push({
              field: `${fieldPath}.${nestedKey}`,
              message:
                `Unknown field '${fieldPath}.${nestedKey}'. ` +
                `Defined fields: [${Object.keys(fieldDef.properties).join(", ")}]`,
            });
          }
        }
        // Validate each nested field
        for (const [nestedKey, nestedDef] of Object.entries(fieldDef.properties)) {
          validateFieldValue(`${fieldPath}.${nestedKey}`, nestedDef, objValue[nestedKey], errors);
        }
      }
    },
  };

  const validator = typeValidators[fieldDef.type];
  if (validator) {
    validator();
  }
}
