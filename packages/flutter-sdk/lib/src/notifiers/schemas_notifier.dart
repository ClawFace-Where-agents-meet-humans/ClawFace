import 'package:flutter/foundation.dart';

import '../client.dart';
import '../models/error.dart';
import '../models/schema.dart';

/// Notifier for a list of schemas. Mirrors the React `useSchemas()` hook.
///
/// Usage with Provider:
/// ```dart
/// ChangeNotifierProvider(
///   create: (ctx) => SchemasNotifier(ClawFaceProvider.of(ctx))..fetch(),
///   child: ...,
/// )
/// ```
class SchemasNotifier extends ChangeNotifier {
  final ClawFaceClient _client;

  List<SchemaResponse>? data;
  ApiError? error;
  bool isLoading = true;

  SchemasNotifier(this._client);

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      data = await _client.listSchemas();
    } on ApiError catch (e) {
      error = e;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refetch() => fetch();
}
