import { describe, it, expect } from "vitest";
import {
  validateSchemaInput,
  validateRecordData,
  normalizeSchemaInput,
} from "../src/validation.js";
import type { FieldDef, SchemaDoc, SchemaInput } from "../src/types.js";

// ── Schema Validation Tests ──────────────────────────────────────────────────

describe("validateSchemaInput", () => {
  it("rejects empty fields object", () => {
    const errors = validateSchemaInput("contacts", { fields: {} });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "fields", message: expect.stringContaining("at least one field") }),
    );
  });

  it("rejects invalid schemaName format", () => {
    const errors = validateSchemaInput("My Contacts", { fields: { name: { type: "string" } } });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "schemaName" }),
    );
  });

  it("rejects schemaName starting with number", () => {
    const errors = validateSchemaInput("123abc", { fields: { name: { type: "string" } } });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "schemaName" }),
    );
  });

  it("accepts valid schemaName", () => {
    const errors = validateSchemaInput("my_contacts", { fields: { name: { type: "string" } } });
    expect(errors.filter((e) => e.field === "schemaName")).toHaveLength(0);
  });

  it("rejects invalid field key format", () => {
    const errors = validateSchemaInput("test", {
      fields: { "bad field!": { type: "string" } },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "bad field!" }),
    );
  });

  it("accepts camelCase field keys", () => {
    const errors = validateSchemaInput("test", {
      fields: { firstName: { type: "string" } },
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects mismatched inputType/type", () => {
    const errors = validateSchemaInput("test", {
      fields: { age: { type: "number", inputType: "textarea" } },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "age", message: expect.stringContaining("inputType") }),
    );
  });

  it("accepts compatible inputType/type", () => {
    const errors = validateSchemaInput("test", {
      fields: { bio: { type: "string", inputType: "textarea" } },
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects select without options", () => {
    const errors = validateSchemaInput("test", {
      fields: { role: { type: "string", inputType: "select" } },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "role", message: expect.stringContaining("options") }),
    );
  });

  it("rejects select with empty options array", () => {
    const errors = validateSchemaInput("test", {
      fields: { role: { type: "string", inputType: "select", options: [] } },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "role", message: expect.stringContaining("options") }),
    );
  });

  it("accepts select with valid options", () => {
    const errors = validateSchemaInput("test", {
      fields: { role: { type: "string", inputType: "select", options: ["a", "b"] } },
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects object type without properties", () => {
    const errors = validateSchemaInput("test", {
      fields: { address: { type: "object" } },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "address", message: expect.stringContaining("properties") }),
    );
  });

  it("rejects object type with empty properties", () => {
    const errors = validateSchemaInput("test", {
      fields: { address: { type: "object", properties: {} } },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "address", message: expect.stringContaining("properties") }),
    );
  });

  it("accepts object type with valid properties", () => {
    const errors = validateSchemaInput("test", {
      fields: {
        address: {
          type: "object",
          properties: { street: { type: "string" }, city: { type: "string" } },
        },
      },
    });
    expect(errors).toHaveLength(0);
  });

  it("validates nested field keys in object properties", () => {
    const errors = validateSchemaInput("test", {
      fields: {
        address: {
          type: "object",
          properties: { "bad key!": { type: "string" } },
        },
      },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "address.bad key!" }),
    );
  });

  it("validates group references when groups defined", () => {
    const errors = validateSchemaInput("test", {
      fields: { name: { type: "string", group: "nonexistent" } },
      groups: [{ key: "basic", label: "Basic", order: 1 }],
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "name", message: expect.stringContaining("group") }),
    );
  });

  it("accepts valid group references", () => {
    const errors = validateSchemaInput("test", {
      fields: { name: { type: "string", group: "basic" } },
      groups: [{ key: "basic", label: "Basic", order: 1 }],
    });
    expect(errors).toHaveLength(0);
  });
});

// ── normalizeSchemaInput Tests ───────────────────────────────────────────────

describe("normalizeSchemaInput", () => {
  it("auto-fills default inputType based on field type", () => {
    const input: SchemaInput = {
      fields: {
        name: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
        birthday: { type: "date" },
      },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.name.inputType).toBe("text");
    expect(result.fields.age.inputType).toBe("number");
    expect(result.fields.active.inputType).toBe("toggle");
    expect(result.fields.birthday.inputType).toBe("date");
  });

  it("auto-fills label from camelCase field key", () => {
    const input: SchemaInput = {
      fields: { firstName: { type: "string" } },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.firstName.label).toBe("First Name");
  });

  it("auto-fills label from snake_case field key", () => {
    const input: SchemaInput = {
      fields: { first_name: { type: "string" } },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.first_name.label).toBe("First Name");
  });

  it("preserves explicitly set label", () => {
    const input: SchemaInput = {
      fields: { name: { type: "string", label: "Full Name" } },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.name.label).toBe("Full Name");
  });

  it("auto-fills sequential order when not provided", () => {
    const input: SchemaInput = {
      fields: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
      },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.name.order).toBe(1);
    expect(result.fields.email.order).toBe(2);
    expect(result.fields.phone.order).toBe(3);
  });

  it("preserves explicitly set order", () => {
    const input: SchemaInput = {
      fields: {
        name: { type: "string", order: 10 },
        email: { type: "string" },
      },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.name.order).toBe(10);
    // email gets next sequential
    expect(result.fields.email.order).toBe(2);
  });

  it("defaults array items to { type: 'string' } when missing", () => {
    const input: SchemaInput = {
      fields: { tags: { type: "array" } },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.tags.items).toEqual({ type: "string" });
  });

  it("preserves explicitly set inputType", () => {
    const input: SchemaInput = {
      fields: { bio: { type: "string", inputType: "textarea" } },
    };
    const result = normalizeSchemaInput(input);
    expect(result.fields.bio.inputType).toBe("textarea");
  });
});

// ── Record Validation Tests ──────────────────────────────────────────────────

describe("validateRecordData", () => {
  const schema: SchemaDoc = {
    id: "user1:contacts",
    pk: "user1",
    userId: "user1",
    schemaName: "contacts",
    fields: {
      name: { type: "string", required: true, label: "Name", inputType: "text", order: 1 },
      email: { type: "string", required: false, label: "Email", inputType: "text", order: 2 },
      age: { type: "number", required: false, label: "Age", inputType: "number", order: 3 },
      active: { type: "boolean", required: false, label: "Active", inputType: "toggle", order: 4 },
      birthday: { type: "date", required: false, label: "Birthday", inputType: "date", order: 5 },
      role: {
        type: "string",
        required: false,
        label: "Role",
        inputType: "select",
        options: ["admin", "user", "guest"],
        order: 6,
      },
    },
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("accepts valid complete data", () => {
    const errors = validateRecordData(schema, {
      name: "John",
      email: "john@example.com",
      age: 30,
      active: true,
      birthday: "1996-03-18",
      role: "admin",
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts valid data with only required fields", () => {
    const errors = validateRecordData(schema, { name: "John" });
    expect(errors).toHaveLength(0);
  });

  it("rejects missing required field", () => {
    const errors = validateRecordData(schema, { email: "john@example.com" });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "name", message: expect.stringContaining("required") }),
    );
  });

  it("rejects null for required field", () => {
    const errors = validateRecordData(schema, { name: null });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "name", message: expect.stringContaining("required") }),
    );
  });

  it("rejects empty data object", () => {
    const errors = validateRecordData(schema, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown fields and lists valid fields", () => {
    const errors = validateRecordData(schema, { name: "John", unknownField: "value" });
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: "unknownField",
        message: expect.stringMatching(/[Uu]nknown field/),
      }),
    );
    // Error message should list valid fields
    const unknownErr = errors.find((e) => e.field === "unknownField");
    expect(unknownErr?.message).toContain("name");
  });

  it("rejects wrong type: string expected, got number", () => {
    const errors = validateRecordData(schema, { name: 42 });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "name", message: expect.stringContaining("string") }),
    );
  });

  it("rejects wrong type: number expected, got string (no coercion)", () => {
    const errors = validateRecordData(schema, { name: "John", age: "thirty" });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "age", message: expect.stringContaining("number") }),
    );
  });

  it("rejects string-number for number field (no coercion)", () => {
    const errors = validateRecordData(schema, { name: "John", age: "42" });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "age", message: expect.stringContaining("number") }),
    );
  });

  it("rejects NaN for number field", () => {
    const errors = validateRecordData(schema, { name: "John", age: NaN });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "age", message: expect.stringContaining("number") }),
    );
  });

  it("rejects wrong type: boolean expected, got string", () => {
    const errors = validateRecordData(schema, { name: "John", active: "yes" });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "active", message: expect.stringContaining("boolean") }),
    );
  });

  it("rejects invalid date string", () => {
    const errors = validateRecordData(schema, { name: "John", birthday: "not-a-date" });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "birthday", message: expect.stringContaining("date") }),
    );
  });

  it("accepts ISO 8601 date string", () => {
    const errors = validateRecordData(schema, { name: "John", birthday: "2026-03-18T10:30:00Z" });
    expect(errors).toHaveLength(0);
  });

  it("accepts date-only string", () => {
    const errors = validateRecordData(schema, { name: "John", birthday: "2026-03-18" });
    expect(errors).toHaveLength(0);
  });

  it("rejects invalid select option", () => {
    const errors = validateRecordData(schema, { name: "John", role: "superadmin" });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "role", message: expect.stringContaining("superadmin") }),
    );
  });

  it("accepts valid select option", () => {
    const errors = validateRecordData(schema, { name: "John", role: "admin" });
    expect(errors).toHaveLength(0);
  });

  // Nested object validation
  it("validates nested object fields", () => {
    const schemaWithObject: SchemaDoc = {
      ...schema,
      fields: {
        ...schema.fields,
        address: {
          type: "object",
          label: "Address",
          inputType: "group",
          order: 7,
          properties: {
            street: { type: "string", required: true, label: "Street", inputType: "text", order: 1 },
            city: { type: "string", required: true, label: "City", inputType: "text", order: 2 },
          },
        },
      },
    };

    const errors = validateRecordData(schemaWithObject, {
      name: "John",
      address: { street: "123 Main St" },
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "address.city", message: expect.stringContaining("required") }),
    );
  });

  it("rejects non-object for object field", () => {
    const schemaWithObject: SchemaDoc = {
      ...schema,
      fields: {
        ...schema.fields,
        address: {
          type: "object",
          label: "Address",
          inputType: "group",
          order: 7,
          properties: {
            street: { type: "string", label: "Street", inputType: "text", order: 1 },
          },
        },
      },
    };

    const errors = validateRecordData(schemaWithObject, {
      name: "John",
      address: "not an object",
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "address", message: expect.stringContaining("object") }),
    );
  });

  // Array validation
  it("validates array items", () => {
    const schemaWithArray: SchemaDoc = {
      ...schema,
      fields: {
        ...schema.fields,
        tags: {
          type: "array",
          label: "Tags",
          inputType: "list",
          order: 7,
          items: { type: "string" },
        },
      },
    };

    const errors = validateRecordData(schemaWithArray, {
      name: "John",
      tags: ["valid", 42, "also valid"],
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "tags[1]", message: expect.stringContaining("string") }),
    );
  });

  it("rejects non-array for array field", () => {
    const schemaWithArray: SchemaDoc = {
      ...schema,
      fields: {
        ...schema.fields,
        tags: { type: "array", label: "Tags", inputType: "list", order: 7, items: { type: "string" } },
      },
    };

    const errors = validateRecordData(schemaWithArray, {
      name: "John",
      tags: "not an array",
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "tags", message: expect.stringContaining("array") }),
    );
  });

  it("collects multiple errors at once", () => {
    const errors = validateRecordData(schema, {
      age: "not a number",
      active: "not a boolean",
      unknownField: "value",
    });
    // Should have: missing required 'name', wrong type 'age', wrong type 'active', unknown field
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});
