import 'package:flutter/foundation.dart';

import '../client.dart';
import '../models/error.dart';
import '../models/schema.dart';

/// Notifier for a single schema. Mirrors the React `useSchema(name)` hook.
class SchemaNotifier extends ChangeNotifier {
  final ClawFaceClient _client;
  final String schemaName;

  SchemaResponse? data;
  ApiError? error;
  bool isLoading = true;

  SchemaNotifier(this._client, this.schemaName);

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      data = await _client.getSchema(schemaName);
    } on ApiError catch (e) {
      error = e;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refetch() => fetch();
}
