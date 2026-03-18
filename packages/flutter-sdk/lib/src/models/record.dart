// Ported from: packages/shared/src/types.ts — RecordResponse, QueryFilter, QueryOptions, QueryResult

import 'enums.dart';

/// A data record within a schema.
class RecordResponse {
  final String id;
  final String userId;
  final String schemaName;
  final Map<String, dynamic> data;
  final String createdAt;
  final String updatedAt;

  const RecordResponse({
    required this.id,
    required this.userId,
    required this.schemaName,
    required this.data,
    required this.createdAt,
    required this.updatedAt,
  });

  factory RecordResponse.fromJson(Map<String, dynamic> json) {
    return RecordResponse(
      id: json['id'] as String,
      userId: json['userId'] as String,
      schemaName: json['schemaName'] as String,
      data: Map<String, dynamic>.from(json['data'] as Map),
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'schemaName': schemaName,
        'data': data,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}

/// A single filter condition for querying records.
class QueryFilter {
  final String field;
  final FilterOp op;
  final dynamic value;

  const QueryFilter({
    required this.field,
    required this.op,
    required this.value,
  });

  factory QueryFilter.fromJson(Map<String, dynamic> json) {
    return QueryFilter(
      field: json['field'] as String,
      op: FilterOp.fromJson(json['op'] as String),
      value: json['value'],
    );
  }

  Map<String, dynamic> toJson() => {
        'field': field,
        'op': op.toJson(),
        'value': value,
      };
}

/// Options for querying records (filters, sorting, pagination).
class QueryOptions {
  final List<QueryFilter>? filters;
  final String? orderBy;
  final String? orderDir;
  final int? limit;
  final int? offset;

  const QueryOptions({
    this.filters,
    this.orderBy,
    this.orderDir,
    this.limit,
    this.offset,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (filters != null) json['filters'] = filters!.map((f) => f.toJson()).toList();
    if (orderBy != null) json['orderBy'] = orderBy;
    if (orderDir != null) json['orderDir'] = orderDir;
    if (limit != null) json['limit'] = limit;
    if (offset != null) json['offset'] = offset;
    return json;
  }
}

/// Paginated query result.
class QueryResult<T> {
  final List<T> records;
  final int total;

  const QueryResult({
    required this.records,
    required this.total,
  });

  factory QueryResult.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    return QueryResult(
      records: (json['records'] as List<dynamic>)
          .map((r) => fromJsonT(r as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
    );
  }
}
