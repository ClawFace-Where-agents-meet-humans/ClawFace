// Ported from: packages/shared/src/types.ts — ApiKeyResponse, ApiKeyCreateResponse

/// API key metadata (key hash never exposed).
class ApiKeyResponse {
  final String id;
  final String prefix;
  final String name;
  final String userId;
  final List<String>? scopes;
  final String createdAt;
  final String? lastUsedAt;
  final String? expiresAt;

  const ApiKeyResponse({
    required this.id,
    required this.prefix,
    required this.name,
    required this.userId,
    this.scopes,
    required this.createdAt,
    this.lastUsedAt,
    this.expiresAt,
  });

  factory ApiKeyResponse.fromJson(Map<String, dynamic> json) {
    return ApiKeyResponse(
      id: json['id'] as String,
      prefix: json['prefix'] as String,
      name: json['name'] as String,
      userId: json['userId'] as String,
      scopes: (json['scopes'] as List<dynamic>?)?.cast<String>(),
      createdAt: json['createdAt'] as String,
      lastUsedAt: json['lastUsedAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'id': id,
      'prefix': prefix,
      'name': name,
      'userId': userId,
      'createdAt': createdAt,
    };
    if (scopes != null) json['scopes'] = scopes;
    if (lastUsedAt != null) json['lastUsedAt'] = lastUsedAt;
    if (expiresAt != null) json['expiresAt'] = expiresAt;
    return json;
  }
}

/// API key creation response — includes the full key (shown only once).
class ApiKeyCreateResponse extends ApiKeyResponse {
  final String key;

  const ApiKeyCreateResponse({
    required super.id,
    required super.prefix,
    required super.name,
    required super.userId,
    super.scopes,
    required super.createdAt,
    super.lastUsedAt,
    super.expiresAt,
    required this.key,
  });

  factory ApiKeyCreateResponse.fromJson(Map<String, dynamic> json) {
    return ApiKeyCreateResponse(
      id: json['id'] as String,
      prefix: json['prefix'] as String,
      name: json['name'] as String,
      userId: json['userId'] as String,
      scopes: (json['scopes'] as List<dynamic>?)?.cast<String>(),
      createdAt: json['createdAt'] as String,
      lastUsedAt: json['lastUsedAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
      key: json['key'] as String,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final json = super.toJson();
    json['key'] = key;
    return json;
  }
}
