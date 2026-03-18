// Ported from: packages/shared/src/types.ts — FieldDef, GroupDef

import 'enums.dart';

/// Definition of a single field in a schema.
class FieldDef {
  final FieldType type;
  final bool? required;
  final String? description;
  final String? label;
  final InputType? inputType;
  final List<String>? options;
  final String? displayFormat;
  final int? order;
  final String? group;
  final String? hint;
  final dynamic defaultValue;
  final FieldDef? items;
  final Map<String, FieldDef>? properties;

  const FieldDef({
    required this.type,
    this.required,
    this.description,
    this.label,
    this.inputType,
    this.options,
    this.displayFormat,
    this.order,
    this.group,
    this.hint,
    this.defaultValue,
    this.items,
    this.properties,
  });

  factory FieldDef.fromJson(Map<String, dynamic> json) {
    return FieldDef(
      type: FieldType.fromJson(json['type'] as String),
      required: json['required'] as bool?,
      description: json['description'] as String?,
      label: json['label'] as String?,
      inputType: json['inputType'] != null
          ? InputType.fromJson(json['inputType'] as String)
          : null,
      options: (json['options'] as List<dynamic>?)?.cast<String>(),
      displayFormat: json['displayFormat'] as String?,
      order: json['order'] as int?,
      group: json['group'] as String?,
      hint: json['hint'] as String?,
      defaultValue: json['default'],
      items: json['items'] != null
          ? FieldDef.fromJson(json['items'] as Map<String, dynamic>)
          : null,
      properties: json['properties'] != null
          ? (json['properties'] as Map<String, dynamic>).map(
              (k, v) => MapEntry(k, FieldDef.fromJson(v as Map<String, dynamic>)))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{'type': type.toJson()};
    if (required != null) json['required'] = required;
    if (description != null) json['description'] = description;
    if (label != null) json['label'] = label;
    if (inputType != null) json['inputType'] = inputType!.toJson();
    if (options != null) json['options'] = options;
    if (displayFormat != null) json['displayFormat'] = displayFormat;
    if (order != null) json['order'] = order;
    if (group != null) json['group'] = group;
    if (hint != null) json['hint'] = hint;
    if (defaultValue != null) json['default'] = defaultValue;
    if (items != null) json['items'] = items!.toJson();
    if (properties != null) {
      json['properties'] =
          properties!.map((k, v) => MapEntry(k, v.toJson()));
    }
    return json;
  }

  FieldDef copyWith({
    FieldType? type,
    bool? required,
    String? description,
    String? label,
    InputType? inputType,
    List<String>? options,
    String? displayFormat,
    int? order,
    String? group,
    String? hint,
    dynamic defaultValue,
    FieldDef? items,
    Map<String, FieldDef>? properties,
  }) {
    return FieldDef(
      type: type ?? this.type,
      required: required ?? this.required,
      description: description ?? this.description,
      label: label ?? this.label,
      inputType: inputType ?? this.inputType,
      options: options ?? this.options,
      displayFormat: displayFormat ?? this.displayFormat,
      order: order ?? this.order,
      group: group ?? this.group,
      hint: hint ?? this.hint,
      defaultValue: defaultValue ?? this.defaultValue,
      items: items ?? this.items,
      properties: properties ?? this.properties,
    );
  }
}

/// UI field grouping definition.
class GroupDef {
  final String key;
  final String label;
  final int order;

  const GroupDef({
    required this.key,
    required this.label,
    required this.order,
  });

  factory GroupDef.fromJson(Map<String, dynamic> json) {
    return GroupDef(
      key: json['key'] as String,
      label: json['label'] as String,
      order: json['order'] as int,
    );
  }

  Map<String, dynamic> toJson() => {
        'key': key,
        'label': label,
        'order': order,
      };
}
