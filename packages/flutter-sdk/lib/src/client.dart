// Ported from: packages/react-sdk/core/client.ts — OpenClawClient

import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models/api_key.dart';
import 'models/error.dart';
import 'models/record.dart';
import 'models/schema.dart';

/// HTTP client for the ClawFace REST API.
///
/// Supports two auth modes:
/// - Dev mode (`AUTH_MODE=none`): pass [userId] — sent as `X-User-Id` header.
/// - Production (`AUTH_MODE=apikey`): pass [apiKey] — sent as `Authorization: Bearer`.
class ClawFaceClient {
  final String _baseUrl;
  final String? _userId;
  final String? _apiKey;
  final Map<String, String> _extraHeaders;
  final http.Client _httpClient;

  ClawFaceClient({
    required String baseUrl,
    String? userId,
    String? apiKey,
    Map<String, String>? headers,
    http.Client? httpClient,
  })  : assert(userId != null || apiKey != null,
            'ClawFaceClient requires either userId (dev mode) or apiKey (production)'),
        _baseUrl = baseUrl.replaceAll(RegExp(r'/+$'), ''),
        _userId = userId,
        _apiKey = apiKey,
        _extraHeaders = headers ?? {},
        _httpClient = httpClient ?? http.Client();

  /// Close the underlying HTTP client. Call when done.
  void close() => _httpClient.close();

  // ── Schema Operations ───────────────────────────────────────────────────

  Future<List<SchemaResponse>> listSchemas() async {
    final json = await _request<List<dynamic>>('GET', '/schemas');
    return json
        .map((s) => SchemaResponse.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  Future<SchemaResponse> getSchema(String schemaName) async {
    final json = await _request<Map<String, dynamic>>(
        'GET', '/schemas/${Uri.encodeComponent(schemaName)}');
    return SchemaResponse.fromJson(json);
  }

  Future<SchemaResponse> createSchema(
      String schemaName, SchemaInput input) async {
    final json = await _request<Map<String, dynamic>>(
      'POST',
      '/schemas/${Uri.encodeComponent(schemaName)}',
      body: input.toJson(),
    );
    return SchemaResponse.fromJson(json);
  }

  Future<SchemaResponse> updateSchema(
      String schemaName, SchemaInput input) async {
    final json = await _request<Map<String, dynamic>>(
      'PATCH',
      '/schemas/${Uri.encodeComponent(schemaName)}',
      body: input.toJson(),
    );
    return SchemaResponse.fromJson(json);
  }

  Future<void> deleteSchema(String schemaName,
      {bool deleteData = false}) async {
    final qs = deleteData ? '?deleteData=true' : '';
    await _request<void>(
        'DELETE', '/schemas/${Uri.encodeComponent(schemaName)}$qs');
  }

  // ── Record Operations ─────────────────────────────────────────────────

  Future<QueryResult<RecordResponse>> queryRecords(
    String schemaName, [
    QueryOptions? options,
  ]) async {
    final params = <String, String>{};
    if (options?.filters != null && options!.filters!.isNotEmpty) {
      params['filters'] =
          jsonEncode(options.filters!.map((f) => f.toJson()).toList());
    }
    if (options?.orderBy != null) params['orderBy'] = options!.orderBy!;
    if (options?.orderDir != null) params['orderDir'] = options!.orderDir!;
    if (options?.limit != null) params['limit'] = options!.limit.toString();
    if (options?.offset != null) params['offset'] = options!.offset.toString();

    final qs =
        params.isNotEmpty ? '?${Uri(queryParameters: params).query}' : '';
    final path = '/schemas/${Uri.encodeComponent(schemaName)}/records$qs';

    final json = await _request<Map<String, dynamic>>('GET', path);
    return QueryResult.fromJson(json, RecordResponse.fromJson);
  }

  Future<RecordResponse> getRecord(String recordId) async {
    final json = await _request<Map<String, dynamic>>(
        'GET', '/records/${Uri.encodeComponent(recordId)}');
    return RecordResponse.fromJson(json);
  }

  Future<RecordResponse> createRecord(
      String schemaName, Map<String, dynamic> data) async {
    final json = await _request<Map<String, dynamic>>(
      'POST',
      '/schemas/${Uri.encodeComponent(schemaName)}/records',
      body: {'data': data},
    );
    return RecordResponse.fromJson(json);
  }

  Future<RecordResponse> updateRecord(
      String recordId, Map<String, dynamic> data) async {
    final json = await _request<Map<String, dynamic>>(
      'PUT',
      '/records/${Uri.encodeComponent(recordId)}',
      body: {'data': data},
    );
    return RecordResponse.fromJson(json);
  }

  Future<void> deleteRecord(String recordId) async {
    await _request<void>('DELETE', '/records/${Uri.encodeComponent(recordId)}');
  }

  Future<int> countRecords(String schemaName) async {
    final json = await _request<Map<String, dynamic>>(
        'GET', '/schemas/${Uri.encodeComponent(schemaName)}/records/count');
    return json['count'] as int;
  }

  // ── API Key Management ────────────────────────────────────────────────

  Future<ApiKeyCreateResponse> createApiKey({
    required String name,
    List<String>? scopes,
    String? expiresAt,
  }) async {
    final body = <String, dynamic>{'name': name};
    if (scopes != null) body['scopes'] = scopes;
    if (expiresAt != null) body['expiresAt'] = expiresAt;

    final json = await _request<Map<String, dynamic>>(
      'POST',
      '/auth/keys',
      body: body,
    );
    return ApiKeyCreateResponse.fromJson(json);
  }

  Future<List<ApiKeyResponse>> listApiKeys() async {
    final json = await _request<List<dynamic>>('GET', '/auth/keys');
    return json
        .map((k) => ApiKeyResponse.fromJson(k as Map<String, dynamic>))
        .toList();
  }

  Future<void> deleteApiKey(String keyId) async {
    await _request<void>('DELETE', '/auth/keys/${Uri.encodeComponent(keyId)}');
  }

  // ── Internal ──────────────────────────────────────────────────────────

  Future<T> _request<T>(String method, String path,
      {Map<String, dynamic>? body}) async {
    final url = Uri.parse('$_baseUrl$path');
    final headers = <String, String>{..._extraHeaders};

    // Auth headers
    if (_apiKey != null) {
      headers['Authorization'] = 'Bearer $_apiKey';
    }
    if (_userId != null) {
      headers['X-User-Id'] = _userId!;
    }

    if (body != null) {
      headers['Content-Type'] = 'application/json';
    }

    late http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await _httpClient.get(url, headers: headers);
        case 'POST':
          response = await _httpClient.post(url,
              headers: headers, body: body != null ? jsonEncode(body) : null);
        case 'PUT':
          response = await _httpClient.put(url,
              headers: headers, body: body != null ? jsonEncode(body) : null);
        case 'PATCH':
          response = await _httpClient.patch(url,
              headers: headers, body: body != null ? jsonEncode(body) : null);
        case 'DELETE':
          response = await _httpClient.delete(url, headers: headers);
        default:
          throw ArgumentError('Unsupported HTTP method: $method');
      }
    } catch (e) {
      if (e is ApiError) rethrow;
      throw ApiError(0, 'NETWORK_ERROR', 'Network error: $e');
    }

    // 204 No Content
    if (response.statusCode == 204) {
      return null as T;
    }

    // Parse JSON
    dynamic json;
    try {
      json = jsonDecode(response.body);
    } catch (_) {
      if (response.statusCode >= 400) {
        throw ApiError(response.statusCode, 'UNKNOWN_ERROR',
            response.reasonPhrase ?? 'HTTP ${response.statusCode}');
      }
      throw ApiError(
          response.statusCode, 'PARSE_ERROR', 'Response was not valid JSON');
    }

    if (response.statusCode >= 400) {
      final errBody = json is Map<String, dynamic> ? json : null;
      throw ApiError(
        response.statusCode,
        (errBody?['error'] as String?) ?? 'UNKNOWN_ERROR',
        (errBody?['message'] as String?) ??
            response.reasonPhrase ??
            'HTTP ${response.statusCode}',
        errBody?['details'] != null
            ? (errBody!['details'] as List<dynamic>)
                .map((d) =>
                    ValidationErrorDetail.fromJson(d as Map<String, dynamic>))
                .toList()
            : null,
        errBody?['hint'] as String?,
      );
    }

    return json as T;
  }
}
