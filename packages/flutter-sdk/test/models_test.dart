import 'package:flutter_test/flutter_test.dart';
import 'package:clawface_flutter_sdk/clawface_flutter_sdk.dart';

void main() {
  // ── Enums ───────────────────────────────────────────────────────────────

  group('FieldType', () {
    test('fromJson round-trips all values', () {
      for (final ft in FieldType.values) {
        expect(FieldType.fromJson(ft.value), ft);
        expect(ft.toJson(), ft.value);
      }
    });

    test('fromJson throws on unknown value', () {
      expect(() => FieldType.fromJson('unknown'), throwsArgumentError);
    });
  });

  group('InputType', () {
    test('fromJson round-trips all values', () {
      for (final it in InputType.values) {
        expect(InputType.fromJson(it.value), it);
        expect(it.toJson(), it.value);
      }
    });

    test('fromJson throws on unknown value', () {
      expect(() => InputType.fromJson('nope'), throwsArgumentError);
    });
  });

  group('FilterOp', () {
    test('fromJson round-trips all values', () {
      for (final op in FilterOp.values) {
        expect(FilterOp.fromJson(op.value), op);
        expect(op.toJson(), op.value);
      }
    });
  });

  // ── FieldDef ────────────────────────────────────────────────────────────

  group('FieldDef', () {
    test('minimal fromJson/toJson round-trip', () {
      final json = {'type': 'string'};
      final field = FieldDef.fromJson(json);
      expect(field.type, FieldType.string_);
      expect(field.required, isNull);
      expect(field.toJson(), {'type': 'string'});
    });

    test('full fromJson/toJson round-trip', () {
      final json = {
        'type': 'string',
        'required': true,
        'description': 'A name',
        'label': 'Name',
        'inputType': 'select',
        'options': ['a', 'b'],
        'displayFormat': 'bold',
        'order': 1,
        'group': 'basic',
        'hint': 'Enter name',
        'default': 'a',
      };
      final field = FieldDef.fromJson(json);
      expect(field.type, FieldType.string_);
      expect(field.required, true);
      expect(field.inputType, InputType.select);
      expect(field.options, ['a', 'b']);
      expect(field.defaultValue, 'a');

      final output = field.toJson();
      expect(output['type'], 'string');
      expect(output['required'], true);
      expect(output['inputType'], 'select');
      expect(output['options'], ['a', 'b']);
      expect(output['default'], 'a');
    });

    test('recursive FieldDef (array with items)', () {
      final json = {
        'type': 'array',
        'items': {'type': 'number'},
      };
      final field = FieldDef.fromJson(json);
      expect(field.type, FieldType.array);
      expect(field.items, isNotNull);
      expect(field.items!.type, FieldType.number_);

      final output = field.toJson();
      expect(output['items'], {'type': 'number'});
    });

    test('recursive FieldDef (object with properties)', () {
      final json = {
        'type': 'object',
        'properties': {
          'street': {'type': 'string'},
          'zip': {'type': 'number'},
        },
      };
      final field = FieldDef.fromJson(json);
      expect(field.type, FieldType.object_);
      expect(field.properties, isNotNull);
      expect(field.properties!.length, 2);
      expect(field.properties!['street']!.type, FieldType.string_);
      expect(field.properties!['zip']!.type, FieldType.number_);
    });

    test('copyWith creates modified copy', () {
      const field = FieldDef(type: FieldType.string_, label: 'old');
      final copy = field.copyWith(label: 'new', required: true);
      expect(copy.label, 'new');
      expect(copy.required, true);
      expect(copy.type, FieldType.string_);
    });
  });

  // ── GroupDef ────────────────────────────────────────────────────────────

  group('GroupDef', () {
    test('fromJson/toJson round-trip', () {
      final json = {'key': 'basic', 'label': 'Basic Info', 'order': 1};
      final group = GroupDef.fromJson(json);
      expect(group.key, 'basic');
      expect(group.label, 'Basic Info');
      expect(group.order, 1);
      expect(group.toJson(), json);
    });
  });

  // ── SchemaResponse ──────────────────────────────────────────────────────

  group('SchemaResponse', () {
    test('minimal fromJson/toJson round-trip', () {
      final json = {
        'userId': 'u1',
        'schemaName': 'contacts',
        'fields': {
          'name': {'type': 'string'},
        },
        'version': 1,
        'createdAt': '2024-01-01T00:00:00Z',
        'updatedAt': '2024-01-01T00:00:00Z',
      };
      final schema = SchemaResponse.fromJson(json);
      expect(schema.userId, 'u1');
      expect(schema.schemaName, 'contacts');
      expect(schema.fields.length, 1);
      expect(schema.fields['name']!.type, FieldType.string_);
      expect(schema.version, 1);
      expect(schema.displayName, isNull);
    });

    test('full fromJson with optional fields', () {
      final json = {
        'userId': 'u1',
        'schemaName': 'contacts',
        'displayName': 'Contacts',
        'description': 'My contacts',
        'icon': 'people',
        'fields': {
          'name': {'type': 'string'},
        },
        'groups': [
          {'key': 'basic', 'label': 'Basic', 'order': 1}
        ],
        'version': 2,
        'createdAt': '2024-01-01T00:00:00Z',
        'updatedAt': '2024-01-02T00:00:00Z',
        'purpose': 'Track contacts',
        'instructions': 'Use this for...',
        'examples': [
          {'name': 'Alice'}
        ],
        'tags': ['crm'],
        'createdBy': 'admin',
      };
      final schema = SchemaResponse.fromJson(json);
      expect(schema.displayName, 'Contacts');
      expect(schema.groups!.length, 1);
      expect(schema.tags, ['crm']);
      expect(schema.createdBy, 'admin');
    });
  });

  // ── SchemaInput ─────────────────────────────────────────────────────────

  group('SchemaInput', () {
    test('fromJson/toJson round-trip', () {
      final json = {
        'displayName': 'Tasks',
        'fields': {
          'title': {'type': 'string', 'required': true},
        },
      };
      final input = SchemaInput.fromJson(json);
      expect(input.displayName, 'Tasks');
      expect(input.fields['title']!.required, true);

      final output = input.toJson();
      expect(output['displayName'], 'Tasks');
      expect(output['fields']['title']['type'], 'string');
    });
  });

  // ── RecordResponse ──────────────────────────────────────────────────────

  group('RecordResponse', () {
    test('fromJson/toJson round-trip', () {
      final json = {
        'id': 'r1',
        'userId': 'u1',
        'schemaName': 'contacts',
        'data': {'name': 'Alice', 'age': 30},
        'createdAt': '2024-01-01T00:00:00Z',
        'updatedAt': '2024-01-01T00:00:00Z',
      };
      final record = RecordResponse.fromJson(json);
      expect(record.id, 'r1');
      expect(record.data['name'], 'Alice');
      expect(record.data['age'], 30);

      final output = record.toJson();
      expect(output['id'], 'r1');
      expect(output['data'], {'name': 'Alice', 'age': 30});
    });
  });

  // ── QueryFilter / QueryOptions / QueryResult ────────────────────────────

  group('QueryFilter', () {
    test('fromJson/toJson round-trip', () {
      final json = {'field': 'age', 'op': 'gte', 'value': 18};
      final filter = QueryFilter.fromJson(json);
      expect(filter.field, 'age');
      expect(filter.op, FilterOp.gte);
      expect(filter.value, 18);
      expect(filter.toJson(), json);
    });
  });

  group('QueryOptions', () {
    test('toJson omits null fields', () {
      const opts = QueryOptions(limit: 10, offset: 0);
      final json = opts.toJson();
      expect(json, {'limit': 10, 'offset': 0});
      expect(json.containsKey('filters'), false);
    });
  });

  group('QueryResult', () {
    test('fromJson with generic factory', () {
      final json = {
        'records': [
          {
            'id': 'r1',
            'userId': 'u1',
            'schemaName': 'contacts',
            'data': {'name': 'Bob'},
            'createdAt': '2024-01-01T00:00:00Z',
            'updatedAt': '2024-01-01T00:00:00Z',
          }
        ],
        'total': 42,
      };
      final result = QueryResult.fromJson(json, RecordResponse.fromJson);
      expect(result.records.length, 1);
      expect(result.records.first.id, 'r1');
      expect(result.total, 42);
    });
  });

  // ── ApiKeyResponse ──────────────────────────────────────────────────────

  group('ApiKeyResponse', () {
    test('fromJson/toJson round-trip', () {
      final json = {
        'id': 'k1',
        'prefix': 'cf_',
        'name': 'dev-key',
        'userId': 'u1',
        'scopes': ['read', 'write'],
        'createdAt': '2024-01-01T00:00:00Z',
        'lastUsedAt': '2024-01-02T00:00:00Z',
      };
      final key = ApiKeyResponse.fromJson(json);
      expect(key.id, 'k1');
      expect(key.scopes, ['read', 'write']);
      expect(key.expiresAt, isNull);
    });
  });

  group('ApiKeyCreateResponse', () {
    test('includes full key', () {
      final json = {
        'id': 'k1',
        'prefix': 'cf_',
        'name': 'dev-key',
        'userId': 'u1',
        'createdAt': '2024-01-01T00:00:00Z',
        'key': 'cf_abc123secret',
      };
      final resp = ApiKeyCreateResponse.fromJson(json);
      expect(resp.key, 'cf_abc123secret');
      expect(resp.id, 'k1');

      final output = resp.toJson();
      expect(output['key'], 'cf_abc123secret');
      expect(output['id'], 'k1');
    });
  });

  // ── Error Models ────────────────────────────────────────────────────────

  group('ValidationErrorDetail', () {
    test('fromJson/toJson', () {
      final json = {'field': 'name', 'message': 'required'};
      final err = ValidationErrorDetail.fromJson(json);
      expect(err.field, 'name');
      expect(err.toString(), 'name: required');
      expect(err.toJson(), json);
    });
  });

  group('ErrorResponse', () {
    test('fromJson with details', () {
      final json = {
        'error': 'VALIDATION_ERROR',
        'message': 'Validation failed',
        'details': [
          {'field': 'name', 'message': 'required'}
        ],
        'hint': 'Check the name field',
      };
      final err = ErrorResponse.fromJson(json);
      expect(err.error, 'VALIDATION_ERROR');
      expect(err.details!.length, 1);
      expect(err.hint, 'Check the name field');
    });
  });

  group('ApiError', () {
    test('toString formats correctly', () {
      const err = ApiError(400, 'BAD_REQUEST', 'Invalid input');
      expect(err.toString(), 'ApiError(400 BAD_REQUEST): Invalid input');
    });

    test('toString with hint and details', () {
      const err = ApiError(
        422,
        'VALIDATION_ERROR',
        'Validation failed',
        [ValidationErrorDetail(field: 'name', message: 'required')],
        'Check fields',
      );
      final str = err.toString();
      expect(str, contains('hint: Check fields'));
      expect(str, contains('name: required'));
    });
  });
}
