import 'package:flutter/foundation.dart';

import '../client.dart';
import '../models/error.dart';
import '../models/record.dart';

/// Notifier for paginated records. Mirrors the React `useRecords()` hook.
///
/// Usage with Provider:
/// ```dart
/// ChangeNotifierProvider(
///   create: (ctx) => RecordsNotifier(
///     ClawFaceProvider.of(ctx),
///     'contacts',
///   )..fetch(),
///   child: ...,
/// )
/// ```
class RecordsNotifier extends ChangeNotifier {
  final ClawFaceClient _client;
  final String schemaName;

  QueryResult<RecordResponse>? data;
  ApiError? error;
  bool isLoading = true;
  int page = 0;
  int pageSize = 20;
  QueryOptions? _options;

  RecordsNotifier(this._client, this.schemaName, [QueryOptions? options])
      : _options = options;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      data = await _client.queryRecords(
        schemaName,
        QueryOptions(
          filters: _options?.filters,
          orderBy: _options?.orderBy,
          orderDir: _options?.orderDir,
          limit: pageSize,
          offset: page * pageSize,
        ),
      );
    } on ApiError catch (e) {
      error = e;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void setPage(int newPage) {
    if (newPage == page) return;
    page = newPage;
    fetch();
  }

  void setPageSize(int newSize) {
    if (newSize == pageSize) return;
    pageSize = newSize;
    page = 0;
    fetch();
  }

  void setOptions(QueryOptions? options) {
    _options = options;
    page = 0;
    fetch();
  }

  Future<void> refetch() => fetch();
}
