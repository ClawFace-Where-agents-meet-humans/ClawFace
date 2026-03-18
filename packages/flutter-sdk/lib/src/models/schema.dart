// Ported from: packages/shared/src/types.ts — SchemaResponse, SchemaInput

import 'field_def.dart';

/// Full schema definition returned by the API.
class SchemaResponse {
  final String userId;
  final String schemaName;
  final String? displayName;
  final String? description;
  final String? icon;
  final Map<String, FieldDef> fields;
  final List<GroupDef>? groups;
  final int version;
  final String createdAt;
  final String updatedAt;
  final String? purpose;
  final String? instructions;
  final List<Map<String, dynamic>>? examples;
  final List<String>? tags;
  final String? createdBy;

  const SchemaResponse({
    required this.userId,
    required this.schemaName,
    this.displayName,
    this.description,
    this.icon,
    required this.fields,
    this.groups,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.purpose,
    this.instructions,
    this.examples,
    this.tags,
    this.createdBy,
  });

  factory SchemaResponse.fromJson(Map<String, dynamic> json) {
    return SchemaResponse(
      userId: json['userId'] as String,
      schemaName: json['schemaName'] as String,
      displayName: json['displayName'] as String?,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      fields: (json['fields'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(k, FieldDef.fromJson(v as Map<String, dynamic>)),
      ),
      groups: (json['groups'] as List<dynamic>?)
          ?.map((g) => GroupDef.fromJson(g as Map<String, dynamic>))
          .toList(),
      version: json['version'] as int,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      purpose: json['purpose'] as String?,
      instructions: json['instructions'] as String?,
      examples: (json['examples'] as List<dynamic>?)
          ?.map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      tags: (json['tags'] as List<dynamic>?)?.cast<String>(),
      createdBy: json['createdBy'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'userId': userId,
      'schemaName': schemaName,
      'fields': fields.map((k, v) => MapEntry(k, v.toJson())),
      'version': version,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
    if (displayName != null) json['displayName'] = displayName;
    if (description != null) json['description'] = description;
    if (icon != null) json['icon'] = icon;
    if (groups != null) json['groups'] = groups!.map((g) => g.toJson()).toList();
    if (purpose != null) json['purpose'] = purpose;
    if (instructions != null) json['instructions'] = instructions;
    if (examples != null) json['examples'] = examples;
    if (tags != null) json['tags'] = tags;
    if (createdBy != null) json['createdBy'] = createdBy;
    return json;
  }
}

/// Schema input for creating or updating a schema.
class SchemaInput {
  final String? displayName;
  final String? description;
  final String? icon;
  final Map<String, FieldDef> fields;
  final List<GroupDef>? groups;
  final String? purpose;
  final String? instructions;
  final List<Map<String, dynamic>>? examples;
  final List<String>? tags;
  final String? createdBy;

  const SchemaInput({
    this.displayName,
    this.description,
    this.icon,
    required this.fields,
    this.groups,
    this.purpose,
    this.instructions,
    this.examples,
    this.tags,
    this.createdBy,
  });

  factory SchemaInput.fromJson(Map<String, dynamic> json) {
    return SchemaInput(
      displayName: json['displayName'] as String?,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      fields: (json['fields'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(k, FieldDef.fromJson(v as Map<String, dynamic>)),
      ),
      groups: (json['groups'] as List<dynamic>?)
          ?.map((g) => GroupDef.fromJson(g as Map<String, dynamic>))
          .toList(),
      purpose: json['purpose'] as String?,
      instructions: json['instructions'] as String?,
      examples: (json['examples'] as List<dynamic>?)
          ?.map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      tags: (json['tags'] as List<dynamic>?)?.cast<String>(),
      createdBy: json['createdBy'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'fields': fields.map((k, v) => MapEntry(k, v.toJson())),
    };
    if (displayName != null) json['displayName'] = displayName;
    if (description != null) json['description'] = description;
    if (icon != null) json['icon'] = icon;
    if (groups != null) json['groups'] = groups!.map((g) => g.toJson()).toList();
    if (purpose != null) json['purpose'] = purpose;
    if (instructions != null) json['instructions'] = instructions;
    if (examples != null) json['examples'] = examples;
    if (tags != null) json['tags'] = tags;
    if (createdBy != null) json['createdBy'] = createdBy;
    return json;
  }
}
