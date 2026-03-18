import 'package:flutter_test/flutter_test.dart';
import 'package:clawface_flutter_sdk/clawface_flutter_sdk.dart';

void main() {
  // ── keyToLabel ──────────────────────────────────────────────────────────

  group('keyToLabel', () {
    test('converts camelCase to Title Case', () {
      expect(keyToLabel('firstName'), 'First Name');
      expect(keyToLabel('phoneNumber'), 'Phone Number');
    });

    test('converts snake_case to Title Case', () {
      expect(keyToLabel('first_name'), 'First Name');
      expect(keyToLabel('phone_number'), 'Phone Number');
    });

    test('capitalizes single word', () {
      expect(keyToLabel('name'), 'Name');
      expect(keyToLabel('age'), 'Age');
    });
  });

  // ── validateSchemaInput ─────────────────────────────────────────────────

  group('validateSchemaInput', () {
    test('valid schema passes', () {
      final input = SchemaInput(fields: {
        'name': const FieldDef(type: FieldType.string_),
        'age': const FieldDef(type: FieldType.number_),
      });
      final errors = validateSchemaInput('contacts', input);
      expect(errors, isEmpty);
    });

    test('invalid schema name', () {
      final input = SchemaInput(fields: {
        'name': const FieldDef(type: FieldType.string_),
      });
      final errors = validateSchemaInput('Invalid-Name!', input);
      expect(errors.length, 1);
      expect(errors.first.field, 'schemaName');
    });

    test('schema name starting with number is invalid', () {
      final input = SchemaInput(fields: {
        'name': const FieldDef(type: FieldType.string_),
      });
      final errors = validateSchemaInput('1invalid', input);
      expect(errors, isNotEmpty);
      expect(errors.first.field, 'schemaName');
    });

    test('empty fields', () {
      const input = SchemaInput(fields: {});
      final errors = validateSchemaInput('test', input);
      expect(errors.length, 1);
      expect(errors.first.field, 'fields');
      expect(errors.first.message, contains('at least one field'));
    });

    test('invalid field key', () {
      final input = SchemaInput(fields: {
        '123bad': const FieldDef(type: FieldType.string_),
      });
      final errors = validateSchemaInput('test', input);
      expect(errors, isNotEmpty);
      expect(errors.first.field, '123bad');
    });

    test('incompatible inputType for type', () {
      final input = SchemaInput(fields: {
        'name': const FieldDef(
          type: FieldType.number_,
          inputType: InputType.textarea,
        ),
      });
      final errors = validateSchemaInput('test', input);
      expect(errors.length, 1);
      expect(errors.first.message, contains('not compatible'));
    });

    test('select without options', () {
      final input = SchemaInput(fields: {
        'status': const FieldDef(
          type: FieldType.string_,
          inputType: InputType.select,
        ),
      });
      final errors = validateSchemaInput('test', input);
      expect(errors.length, 1);
      expect(errors.first.message, contains("non-empty 'options'"));
    });

    test('select with empty options', () {
      final input = SchemaInput(fields: {
        'status': const FieldDef(
          type: FieldType.string_,
          inputType: InputType.select,
          options: [],
        ),
      });
      final errors = validateSchemaInput('test', input);
      expect(errors.length, 1);
      expect(errors.first.message, contains("non-empty 'options'"));
    });

    test('object without properties', () {
      final input = SchemaInput(fields: {
        'address': const FieldDef(type: FieldType.object_),
      });
      final errors = validateSchemaInput('test', input);
      expect(errors.length, 1);
      expect(errors.first.message, contains("non-empty 'properties'"));
    });

    test('invalid group reference', () {
      final input = SchemaInput(
        fields: {
          'name': const FieldDef(type: FieldType.string_, group: 'nonexistent'),
        },
        groups: [const GroupDef(key: 'basic', label: 'Basic', order: 1)],
      );
      final errors = validateSchemaInput('test', input);
      expect(errors.length, 1);
      expect(errors.first.message, contains("group 'nonexistent'"));
    });

    test('valid group reference passes', () {
      final input = SchemaInput(
        fields: {
          'name': const FieldDef(type: FieldType.string_, group: 'basic'),
        },
        groups: [const GroupDef(key: 'basic', label: 'Basic', order: 1)],
      );
      final errors = validateSchemaInput('test', input);
      expect(errors, isEmpty);
    });

    test('nested object field validation', () {
      final input = SchemaInput(fields: {
        'address': FieldDef(type: FieldType.object_, properties: {
          '123bad': const FieldDef(type: FieldType.string_),
        }),
      });
      final errors = validateSchemaInput('test', input);
      expect(errors, isNotEmpty);
      expect(errors.any((e) => e.field == 'address.123bad'), true);
    });
  });

  // ── normalizeSchemaInput ────────────────────────────────────────────────

  group('normalizeSchemaInput', () {
    test('auto-fills inputType', () {
      final input = SchemaInput(fields: {
        'name': const FieldDef(type: FieldType.string_),
        'age': const FieldDef(type: FieldType.number_),
        'active': const FieldDef(type: FieldType.boolean_),
      });
      final normalized = normalizeSchemaInput(input);
      expect(normalized.fields['name']!.inputType, InputType.text);
      expect(normalized.fields['age']!.inputType, InputType.number);
      expect(normalized.fields['active']!.inputType, InputType.toggle);
    });

    test('does not overwrite existing inputType', () {
      final input = SchemaInput(fields: {
        'bio': const FieldDef(
            type: FieldType.string_, inputType: InputType.textarea),
      });
      final normalized = normalizeSchemaInput(input);
      expect(normalized.fields['bio']!.inputType, InputType.textarea);
    });

    test('auto-fills label from camelCase key', () {
      final input = SchemaInput(fields: {
        'firstName': const FieldDef(type: FieldType.string_),
      });
      final normalized = normalizeSchemaInput(input);
      expect(normalized.fields['firstName']!.label, 'First Name');
    });

    test('does not overwrite existing label', () {
      final input = SchemaInput(fields: {
        'name': const FieldDef(type: FieldType.string_, label: 'Full Name'),
      });
      final normalized = normalizeSchemaInput(input);
      expect(normalized.fields['name']!.label, 'Full Name');
    });

    test('auto-fills order sequentially', () {
      final input = SchemaInput(fields: {
        'a': const FieldDef(type: FieldType.string_),
        'b': const FieldDef(type: FieldType.string_),
        'c': const FieldDef(type: FieldType.string_),
      });
      final normalized = normalizeSchemaInput(input);
      expect(normalized.fields['a']!.order, 1);
      expect(normalized.fields['b']!.order, 2);
      expect(normalized.fields['c']!.order, 3);
    });

    test('auto-fills array items with string type', () {
      final input = SchemaInput(fields: {
        'tags': const FieldDef(type: FieldType.array),
      });
      final normalized = normalizeSchemaInput(input);
      expect(normalized.fields['tags']!.items, isNotNull);
      expect(normalized.fields['tags']!.items!.type, FieldType.string_);
    });

    test('recursively normalizes nested object properties', () {
      final input = SchemaInput(fields: {
        'address': FieldDef(type: FieldType.object_, properties: {
          'street': const FieldDef(type: FieldType.string_),
        }),
      });
      final normalized = normalizeSchemaInput(input);
      final street = normalized.fields['address']!.properties!['street']!;
      expect(street.inputType, InputType.text);
      expect(street.label, 'Street');
    });

    test('preserves other schema fields', () {
      final input = SchemaInput(
        displayName: 'My Schema',
        description: 'desc',
        tags: ['test'],
        fields: {
          'name': const FieldDef(type: FieldType.string_),
        },
      );
      final normalized = normalizeSchemaInput(input);
      expect(normalized.displayName, 'My Schema');
      expect(normalized.description, 'desc');
      expect(normalized.tags, ['test']);
    });
  });

  // ── validateRecordData ──────────────────────────────────────────────────

  group('validateRecordData', () {
    final schema = SchemaResponse(
      userId: 'u1',
      schemaName: 'contacts',
      fields: {
        'name': const FieldDef(type: FieldType.string_, required: true),
        'age': const FieldDef(type: FieldType.number_),
        'active': const FieldDef(type: FieldType.boolean_),
        'birthday': const FieldDef(type: FieldType.date),
        'tags': const FieldDef(
          type: FieldType.array,
          items: FieldDef(type: FieldType.string_),
        ),
        'status': const FieldDef(
          type: FieldType.string_,
          inputType: InputType.select,
          options: ['active', 'inactive'],
        ),
        'address': FieldDef(type: FieldType.object_, properties: {
          'city': const FieldDef(type: FieldType.string_, required: true),
        }),
      },
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    );

    test('valid data passes', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'age': 30,
        'active': true,
      });
      expect(errors, isEmpty);
    });

    test('missing required field', () {
      final errors = validateRecordData(schema, {'age': 25});
      expect(errors.length, 1);
      expect(errors.first.field, 'name');
      expect(errors.first.message, contains('required'));
    });

    test('unknown field', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'nonexistent': 'value',
      });
      expect(errors.length, 1);
      expect(errors.first.field, 'nonexistent');
      expect(errors.first.message, contains('Unknown field'));
    });

    test('wrong type for string field', () {
      final errors = validateRecordData(schema, {'name': 123});
      expect(errors.length, 1);
      expect(errors.first.message, contains('must be string'));
    });

    test('wrong type for number field', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'age': 'not-a-number',
      });
      expect(errors.length, 1);
      expect(errors.first.message, contains('must be number'));
    });

    test('wrong type for boolean field', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'active': 'yes',
      });
      expect(errors.length, 1);
      expect(errors.first.message, contains('must be boolean'));
    });

    test('invalid date string', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'birthday': 'not-a-date',
      });
      expect(errors.length, 1);
      expect(errors.first.message, contains('valid ISO 8601'));
    });

    test('valid date string passes', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'birthday': '2024-01-15T00:00:00Z',
      });
      expect(errors, isEmpty);
    });

    test('array with wrong item type', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'tags': ['ok', 123],
      });
      expect(errors.length, 1);
      expect(errors.first.field, 'tags[1]');
    });

    test('non-array value for array field', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'tags': 'not-an-array',
      });
      expect(errors.length, 1);
      expect(errors.first.message, contains('must be an array'));
    });

    test('invalid select option', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'status': 'deleted',
      });
      expect(errors.length, 1);
      expect(errors.first.message, contains('not a valid option'));
    });

    test('valid select option passes', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'status': 'active',
      });
      expect(errors, isEmpty);
    });

    test('nested object validation — missing required nested field', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'address': <String, dynamic>{},
      });
      expect(errors.length, 1);
      expect(errors.first.field, 'address.city');
    });

    test('nested object validation — unknown nested field', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'address': {'city': 'NY', 'unknown': 'val'},
      });
      expect(errors.length, 1);
      expect(errors.first.field, 'address.unknown');
    });

    test('non-object value for object field', () {
      final errors = validateRecordData(schema, {
        'name': 'Alice',
        'address': 'not-an-object',
      });
      expect(errors.length, 1);
      expect(errors.first.message, contains('must be an object'));
    });

    test('optional field with null value passes', () {
      final errors = validateRecordData(schema, {'name': 'Alice'});
      expect(errors, isEmpty);
    });
  });
}
