import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;
import 'package:clawface_flutter_sdk/clawface_flutter_sdk.dart';
import 'package:clawface_flutter_sdk/src/client.dart';

void main() {
  // Helper: create a MockClient that returns a canned response.
  ClawFaceClient makeClient(
    http_testing.MockClientHandler handler, {
    String? userId,
    String? apiKey,
  }) {
    return ClawFaceClient(
      baseUrl: 'http://localhost:3000/api',
      userId: userId ?? 'test-user',
      apiKey: apiKey,
      httpClient: http_testing.MockClient(handler),
    );
  }

  http.Response jsonResponse(Object body, {int status = 200}) {
    return http.Response(jsonEncode(body), status,
        headers: {'content-type': 'application/json'});
  }

  // ── Auth Headers ────────────────────────────────────────────────────────

  group('auth headers', () {
    test('sends X-User-Id in dev mode', () async {
      String? capturedUserId;
      final client = makeClient((req) async {
        capturedUserId = req.headers['X-User-Id'];
        return jsonResponse([]);
      }, userId: 'dev-user');

      await client.listSchemas();
      expect(capturedUserId, 'dev-user');
      client.close();
    });

    test('sends Authorization Bearer in api key mode', () async {
      String? capturedAuth;
      final client = makeClient((req) async {
        capturedAuth = req.headers['Authorization'];
        return jsonResponse([]);
      }, userId: null, apiKey: 'cf_secret');

      await client.listSchemas();
      expect(capturedAuth, 'Bearer cf_secret');
      client.close();
    });
  });

  // ── Schema Operations ──────────────────────────────────────────────────

  group('listSchemas', () {
    test('parses array of schemas', () async {
      final client = makeClient((_) async {
        return jsonResponse([
          {
            'userId': 'u1',
            'schemaName': 'contacts',
            'fields': {
              'name': {'type': 'string'}
            },
            'version': 1,
            'createdAt': '2024-01-01T00:00:00Z',
            'updatedAt': '2024-01-01T00:00:00Z',
          }
        ]);
      });
      final schemas = await client.listSchemas();
      expect(schemas.length, 1);
      expect(schemas.first.schemaName, 'contacts');
      client.close();
    });
  });

  group('getSchema', () {
    test('calls correct path and parses response', () async {
      Uri? capturedUrl;
      final client = makeClient((req) async {
        capturedUrl = req.url;
        return jsonResponse({
          'userId': 'u1',
          'schemaName': 'contacts',
          'fields': {
            'name': {'type': 'string'}
          },
          'version': 1,
          'createdAt': '2024-01-01T00:00:00Z',
          'updatedAt': '2024-01-01T00:00:00Z',
        });
      });
      final schema = await client.getSchema('contacts');
      expect(capturedUrl!.path, '/api/schemas/contacts');
      expect(schema.schemaName, 'contacts');
      client.close();
    });
  });

  group('createSchema', () {
    test('sends POST with body', () async {
      String? capturedMethod;
      String? capturedBody;
      final client = makeClient((req) async {
        capturedMethod = req.method;
        capturedBody = req.body;
        return jsonResponse({
          'userId': 'u1',
          'schemaName': 'tasks',
          'fields': {
            'title': {'type': 'string'}
          },
          'version': 1,
          'createdAt': '2024-01-01T00:00:00Z',
          'updatedAt': '2024-01-01T00:00:00Z',
        });
      });

      final input = SchemaInput(fields: {
        'title': const FieldDef(type: FieldType.string_),
      });
      await client.createSchema('tasks', input);
      expect(capturedMethod, 'POST');
      expect(jsonDecode(capturedBody!)['fields']['title']['type'], 'string');
      client.close();
    });
  });

  group('deleteSchema', () {
    test('sends DELETE and handles 204', () async {
      String? capturedMethod;
      Uri? capturedUrl;
      final client = makeClient((req) async {
        capturedMethod = req.method;
        capturedUrl = req.url;
        return http.Response('', 204);
      });
      await client.deleteSchema('contacts');
      expect(capturedMethod, 'DELETE');
      expect(capturedUrl!.path, '/api/schemas/contacts');
      expect(capturedUrl!.query, isEmpty);
      client.close();
    });

    test('appends deleteData query param', () async {
      Uri? capturedUrl;
      final client = makeClient((req) async {
        capturedUrl = req.url;
        return http.Response('', 204);
      });
      await client.deleteSchema('contacts', deleteData: true);
      expect(capturedUrl!.query, contains('deleteData=true'));
      client.close();
    });
  });

  // ── Record Operations ──────────────────────────────────────────────────

  group('queryRecords', () {
    test('builds query params and parses result', () async {
      Uri? capturedUrl;
      final client = makeClient((req) async {
        capturedUrl = req.url;
        return jsonResponse({
          'records': [
            {
              'id': 'r1',
              'userId': 'u1',
              'schemaName': 'contacts',
              'data': {'name': 'Alice'},
              'createdAt': '2024-01-01T00:00:00Z',
              'updatedAt': '2024-01-01T00:00:00Z',
            }
          ],
          'total': 1,
        });
      });

      final result = await client.queryRecords(
        'contacts',
        const QueryOptions(limit: 10, offset: 0, orderBy: 'name', orderDir: 'asc'),
      );

      expect(result.records.length, 1);
      expect(result.total, 1);
      expect(capturedUrl!.queryParameters['limit'], '10');
      expect(capturedUrl!.queryParameters['offset'], '0');
      expect(capturedUrl!.queryParameters['orderBy'], 'name');
      client.close();
    });

    test('works without options', () async {
      final client = makeClient((_) async {
        return jsonResponse({'records': [], 'total': 0});
      });
      final result = await client.queryRecords('contacts');
      expect(result.records, isEmpty);
      expect(result.total, 0);
      client.close();
    });
  });

  group('createRecord', () {
    test('sends POST with data payload', () async {
      Map<String, dynamic>? capturedBody;
      final client = makeClient((req) async {
        capturedBody = jsonDecode(req.body) as Map<String, dynamic>;
        return jsonResponse({
          'id': 'r-new',
          'userId': 'u1',
          'schemaName': 'contacts',
          'data': {'name': 'Bob'},
          'createdAt': '2024-01-01T00:00:00Z',
          'updatedAt': '2024-01-01T00:00:00Z',
        });
      });
      final record =
          await client.createRecord('contacts', {'name': 'Bob'});
      expect(record.id, 'r-new');
      expect(capturedBody!['data'], {'name': 'Bob'});
      client.close();
    });
  });

  group('deleteRecord', () {
    test('handles 204', () async {
      final client = makeClient((req) async {
        return http.Response('', 204);
      });
      await client.deleteRecord('r1');
      client.close();
    });
  });

  group('countRecords', () {
    test('returns count', () async {
      final client = makeClient((_) async {
        return jsonResponse({'count': 42});
      });
      final count = await client.countRecords('contacts');
      expect(count, 42);
      client.close();
    });
  });

  // ── Error Handling ─────────────────────────────────────────────────────

  group('error handling', () {
    test('throws ApiError on 4xx with JSON body', () async {
      final client = makeClient((_) async {
        return http.Response(
          jsonEncode({
            'error': 'NOT_FOUND',
            'message': 'Schema not found',
            'hint': 'Check schema name',
          }),
          404,
          headers: {'content-type': 'application/json'},
        );
      });

      try {
        await client.getSchema('nonexistent');
        fail('Expected ApiError');
      } on ApiError catch (e) {
        expect(e.status, 404);
        expect(e.code, 'NOT_FOUND');
        expect(e.message, 'Schema not found');
        expect(e.hint, 'Check schema name');
      }
      client.close();
    });

    test('throws ApiError on 4xx with non-JSON body', () async {
      final client = makeClient((_) async {
        return http.Response('Bad Gateway', 502);
      });

      try {
        await client.listSchemas();
        fail('Expected ApiError');
      } on ApiError catch (e) {
        expect(e.status, 502);
        expect(e.code, 'UNKNOWN_ERROR');
      }
      client.close();
    });

    test('throws ApiError with validation details', () async {
      final client = makeClient((_) async {
        return http.Response(
          jsonEncode({
            'error': 'VALIDATION_ERROR',
            'message': 'Invalid schema',
            'details': [
              {'field': 'name', 'message': 'required'},
              {'field': 'age', 'message': 'must be number'},
            ],
          }),
          422,
          headers: {'content-type': 'application/json'},
        );
      });

      try {
        await client.createSchema(
            'test', const SchemaInput(fields: {}));
        fail('Expected ApiError');
      } on ApiError catch (e) {
        expect(e.status, 422);
        expect(e.details, isNotNull);
        expect(e.details!.length, 2);
        expect(e.details!.first.field, 'name');
      }
      client.close();
    });
  });

  // ── API Key Operations ─────────────────────────────────────────────────

  group('API key operations', () {
    test('createApiKey', () async {
      final client = makeClient((_) async {
        return jsonResponse({
          'id': 'k1',
          'prefix': 'cf_',
          'name': 'test-key',
          'userId': 'u1',
          'createdAt': '2024-01-01T00:00:00Z',
          'key': 'cf_full_secret_key',
        });
      });
      final resp = await client.createApiKey(name: 'test-key');
      expect(resp.key, 'cf_full_secret_key');
      expect(resp.name, 'test-key');
      client.close();
    });

    test('listApiKeys', () async {
      final client = makeClient((_) async {
        return jsonResponse([
          {
            'id': 'k1',
            'prefix': 'cf_',
            'name': 'key-1',
            'userId': 'u1',
            'createdAt': '2024-01-01T00:00:00Z',
          }
        ]);
      });
      final keys = await client.listApiKeys();
      expect(keys.length, 1);
      expect(keys.first.name, 'key-1');
      client.close();
    });

    test('deleteApiKey', () async {
      final client = makeClient((_) async {
        return http.Response('', 204);
      });
      await client.deleteApiKey('k1');
      client.close();
    });
  });
}
