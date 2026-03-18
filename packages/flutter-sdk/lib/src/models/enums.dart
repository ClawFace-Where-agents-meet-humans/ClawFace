// Ported from: packages/shared/src/types.ts — FieldType, InputType, FilterOp

/// Data type for a schema field.
enum FieldType {
  string_('string'),
  number_('number'),
  boolean_('boolean'),
  date('date'),
  array('array'),
  object_('object');

  final String value;
  const FieldType(this.value);

  String toJson() => value;

  static FieldType fromJson(String json) =>
      values.firstWhere((e) => e.value == json,
          orElse: () => throw ArgumentError('Unknown FieldType: $json'));
}

/// UI input type for a schema field.
enum InputType {
  text('text'),
  textarea('textarea'),
  select('select'),
  date('date'),
  toggle('toggle'),
  number('number'),
  list('list'),
  group('group');

  final String value;
  const InputType(this.value);

  String toJson() => value;

  static InputType fromJson(String json) =>
      values.firstWhere((e) => e.value == json,
          orElse: () => throw ArgumentError('Unknown InputType: $json'));
}

/// Filter operator for query conditions.
enum FilterOp {
  eq('eq'),
  ne('ne'),
  gt('gt'),
  gte('gte'),
  lt('lt'),
  lte('lte'),
  contains('contains');

  final String value;
  const FilterOp(this.value);

  String toJson() => value;

  static FilterOp fromJson(String json) =>
      values.firstWhere((e) => e.value == json,
          orElse: () => throw ArgumentError('Unknown FilterOp: $json'));
}
