// Ported from: packages/shared/src/validation.ts

import 'constants.dart';
import 'models/enums.dart';
import 'models/error.dart';
import 'models/field_def.dart';
import 'models/schema.dart';

// ── Schema Validation ───────────────────────────────────────────────────────

/// Validate a schema definition before creating or updating.
/// Returns a list of errors — empty means valid.
List<ValidationErrorDetail> validateSchemaInput(
  String schemaName,
  SchemaInput input,
) {
  final errors = <ValidationErrorDetail>[];

  // Validate schemaName format
  if (!schemaNameRegex.hasMatch(schemaName)) {
    errors.add(ValidationErrorDetail(
      field: 'schemaName',
      message:
          "schemaName '$schemaName' is invalid. Must be lowercase alphanumeric "
          "with underscores, starting with a letter, max 50 chars "
          "(pattern: ${schemaNameRegex.pattern})",
    ));
  }

  // Fields must exist and be non-empty
  if (input.fields.isEmpty) {
    errors.add(const ValidationErrorDetail(
      field: 'fields',
      message: 'Schema must have at least one field',
    ));
  } else {
    final validGroupKeys =
        input.groups?.map((g) => g.key).toSet() ?? <String>{};
    final hasGroups = input.groups != null && input.groups!.isNotEmpty;

    for (final entry in input.fields.entries) {
      _validateFieldDef(
          entry.key, entry.value, errors, hasGroups, validGroupKeys);
    }
  }

  return errors;
}

void _validateFieldDef(
  String key,
  FieldDef fieldDef,
  List<ValidationErrorDetail> errors,
  bool hasGroups,
  Set<String> validGroupKeys, [
  String prefix = '',
]) {
  final fullKey = prefix.isNotEmpty ? '$prefix.$key' : key;

  // Validate field key format
  if (!fieldKeyRegex.hasMatch(key)) {
    errors.add(ValidationErrorDetail(
      field: fullKey,
      message: "Field key '$key' is invalid. Must start with lowercase letter, "
          "contain only alphanumeric and underscores, max 50 chars",
    ));
  }

  // Validate inputType/type consistency
  if (fieldDef.inputType != null) {
    final typeConfig = inputTypeDefaults[fieldDef.type];
    if (typeConfig != null && !typeConfig.allowed.contains(fieldDef.inputType)) {
      errors.add(ValidationErrorDetail(
        field: fullKey,
        message:
            "inputType '${fieldDef.inputType!.value}' is not compatible with "
            "type '${fieldDef.type.value}'. "
            "Allowed: ${typeConfig.allowed.map((t) => t.value).join(', ')}",
      ));
    }
  }

  // Select must have non-empty options
  if (fieldDef.inputType == InputType.select) {
    if (fieldDef.options == null || fieldDef.options!.isEmpty) {
      errors.add(ValidationErrorDetail(
        field: fullKey,
        message:
            "Field '$fullKey' with inputType 'select' must have a non-empty 'options' array",
      ));
    }
  }

  // Object must have non-empty properties
  if (fieldDef.type == FieldType.object_) {
    if (fieldDef.properties == null || fieldDef.properties!.isEmpty) {
      errors.add(ValidationErrorDetail(
        field: fullKey,
        message:
            "Field '$fullKey' with type 'object' must have non-empty 'properties'",
      ));
    } else {
      for (final entry in fieldDef.properties!.entries) {
        _validateFieldDef(
            entry.key, entry.value, errors, hasGroups, validGroupKeys, fullKey);
      }
    }
  }

  // Group reference validation
  if (hasGroups &&
      fieldDef.group != null &&
      !validGroupKeys.contains(fieldDef.group)) {
    errors.add(ValidationErrorDetail(
      field: fullKey,
      message: "Field '$fullKey' references group '${fieldDef.group}' which is "
          "not defined. Available groups: ${validGroupKeys.join(', ')}",
    ));
  }
}

// ── Schema Normalization ────────────────────────────────────────────────────

/// Auto-fill defaults for missing optional fields.
SchemaInput normalizeSchemaInput(SchemaInput input) {
  final normalizedFields = <String, FieldDef>{};
  var orderCounter = 1;

  for (final entry in input.fields.entries) {
    var normalized = entry.value;

    // Auto-fill inputType
    if (normalized.inputType == null) {
      final defaultType = inputTypeDefaults[normalized.type]?.defaultType;
      if (defaultType != null) {
        normalized = normalized.copyWith(inputType: defaultType);
      }
    }

    // Auto-fill label
    if (normalized.label == null) {
      normalized = normalized.copyWith(label: keyToLabel(entry.key));
    }

    // Auto-fill order
    if (normalized.order == null) {
      normalized = normalized.copyWith(order: orderCounter);
    }
    orderCounter++;

    // Default array items
    if (normalized.type == FieldType.array && normalized.items == null) {
      normalized =
          normalized.copyWith(items: const FieldDef(type: FieldType.string_));
    }

    // Recursively normalize nested object properties
    if (normalized.type == FieldType.object_ && normalized.properties != null) {
      final nestedInput = SchemaInput(fields: normalized.properties!);
      final nestedNormalized = normalizeSchemaInput(nestedInput);
      normalized = normalized.copyWith(properties: nestedNormalized.fields);
    }

    normalizedFields[entry.key] = normalized;
  }

  return SchemaInput(
    displayName: input.displayName,
    description: input.description,
    icon: input.icon,
    fields: normalizedFields,
    groups: input.groups,
    purpose: input.purpose,
    instructions: input.instructions,
    examples: input.examples,
    tags: input.tags,
    createdBy: input.createdBy,
  );
}

/// Convert camelCase or snake_case key to Title Case label.
String keyToLabel(String key) {
  // Handle snake_case: split on underscores
  if (key.contains('_')) {
    return key
        .split('_')
        .map((word) =>
            word.isNotEmpty ? word[0].toUpperCase() + word.substring(1) : '')
        .join(' ');
  }
  // Handle camelCase: split on uppercase transitions
  return key
      .replaceAllMapped(
          RegExp(r'([a-z])([A-Z])'), (m) => '${m[1]} ${m[2]}')
      .replaceFirstMapped(RegExp(r'^.'), (m) => m[0]!.toUpperCase());
}

// ── Record Validation ───────────────────────────────────────────────────────

/// Validate record data against a schema.
/// Returns a list of errors — empty means valid.
List<ValidationErrorDetail> validateRecordData(
  SchemaResponse schema,
  Map<String, dynamic> data,
) {
  final errors = <ValidationErrorDetail>[];
  final definedFieldNames = schema.fields.keys.toList();

  // Check for unknown fields
  for (final key in data.keys) {
    if (!schema.fields.containsKey(key)) {
      errors.add(ValidationErrorDetail(
        field: key,
        message:
            "Unknown field '$key'. Defined fields: [${definedFieldNames.join(', ')}]",
      ));
    }
  }

  // Validate each defined field
  for (final entry in schema.fields.entries) {
    _validateFieldValue(entry.key, entry.value, data[entry.key], errors);
  }

  return errors;
}

void _validateFieldValue(
  String fieldPath,
  FieldDef fieldDef,
  dynamic value,
  List<ValidationErrorDetail> errors,
) {
  // Required check
  if (fieldDef.required == true && value == null) {
    errors.add(ValidationErrorDetail(
      field: fieldPath,
      message: "Field '$fieldPath' is required",
    ));
    return;
  }

  // Skip validation for optional missing fields
  if (value == null) return;

  // Type-specific validation
  _validateType(fieldPath, fieldDef, value, errors);
}

void _validateType(
  String fieldPath,
  FieldDef fieldDef,
  dynamic value,
  List<ValidationErrorDetail> errors,
) {
  switch (fieldDef.type) {
    case FieldType.string_:
      if (value is! String) {
        errors.add(ValidationErrorDetail(
          field: fieldPath,
          message:
              "Field '$fieldPath' must be string, got ${value.runtimeType}",
        ));
        return;
      }
      // Select option validation
      if (fieldDef.inputType == InputType.select &&
          fieldDef.options != null &&
          fieldDef.options!.isNotEmpty) {
        if (!fieldDef.options!.contains(value)) {
          errors.add(ValidationErrorDetail(
            field: fieldPath,
            message: "Field '$fieldPath' value '$value' is not a valid option. "
                "Allowed: [${fieldDef.options!.join(', ')}]",
          ));
        }
      }

    case FieldType.number_:
      if (value is! num) {
        errors.add(ValidationErrorDetail(
          field: fieldPath,
          message:
              "Field '$fieldPath' must be number, got ${value.runtimeType}",
        ));
      }

    case FieldType.boolean_:
      if (value is! bool) {
        errors.add(ValidationErrorDetail(
          field: fieldPath,
          message:
              "Field '$fieldPath' must be boolean, got ${value.runtimeType}",
        ));
      }

    case FieldType.date:
      if (value is! String) {
        errors.add(ValidationErrorDetail(
          field: fieldPath,
          message:
              "Field '$fieldPath' must be a date string (ISO 8601), got ${value.runtimeType}",
        ));
        return;
      }
      if (DateTime.tryParse(value) == null) {
        errors.add(ValidationErrorDetail(
          field: fieldPath,
          message:
              "Field '$fieldPath' must be a valid ISO 8601 date string, got '$value'",
        ));
      }

    case FieldType.array:
      if (value is! List) {
        errors.add(ValidationErrorDetail(
          field: fieldPath,
          message:
              "Field '$fieldPath' must be an array, got ${value.runtimeType}",
        ));
        return;
      }
      if (fieldDef.items != null) {
        for (var i = 0; i < value.length; i++) {
          _validateType('$fieldPath[$i]', fieldDef.items!, value[i], errors);
        }
      }

    case FieldType.object_:
      if (value is! Map) {
        errors.add(ValidationErrorDetail(
          field: fieldPath,
          message:
              "Field '$fieldPath' must be an object, got ${value.runtimeType}",
        ));
        return;
      }
      if (fieldDef.properties != null) {
        final objValue = Map<String, dynamic>.from(value);
        // Check unknown nested fields
        for (final nestedKey in objValue.keys) {
          if (!fieldDef.properties!.containsKey(nestedKey)) {
            errors.add(ValidationErrorDetail(
              field: '$fieldPath.$nestedKey',
              message: "Unknown field '$fieldPath.$nestedKey'. "
                  "Defined fields: [${fieldDef.properties!.keys.join(', ')}]",
            ));
          }
        }
        // Validate each nested field
        for (final entry in fieldDef.properties!.entries) {
          _validateFieldValue(
              '$fieldPath.${entry.key}', entry.value, objValue[entry.key], errors);
        }
      }
  }
}
