// Ported from: packages/shared/src/constants.ts, types.ts (INPUT_TYPE_DEFAULTS)

import 'models/enums.dart';

/// Valid schema name: lowercase letter, then lowercase alphanumeric + underscore, max 50 chars.
final RegExp schemaNameRegex = RegExp(r'^[a-z][a-z0-9_]{0,49}$');

/// Valid field key: lowercase letter, then alphanumeric + underscore, max 50 chars.
final RegExp fieldKeyRegex = RegExp(r'^[a-z][a-zA-Z0-9_]{0,49}$');

/// Maximum number of records returned per query.
const int maxQueryLimit = 100;

/// Default number of records returned per query.
const int defaultQueryLimit = 20;

/// Defines which InputTypes are allowed for each FieldType and the default.
class InputTypeConfig {
  final List<InputType> allowed;
  final InputType defaultType;
  const InputTypeConfig(this.allowed, this.defaultType);
}

final Map<FieldType, InputTypeConfig> inputTypeDefaults = {
  FieldType.string_: InputTypeConfig(
    [InputType.text, InputType.textarea, InputType.select],
    InputType.text,
  ),
  FieldType.number_: InputTypeConfig(
    [InputType.number],
    InputType.number,
  ),
  FieldType.boolean_: InputTypeConfig(
    [InputType.toggle],
    InputType.toggle,
  ),
  FieldType.date: InputTypeConfig(
    [InputType.date],
    InputType.date,
  ),
  FieldType.array: InputTypeConfig(
    [InputType.list],
    InputType.list,
  ),
  FieldType.object_: InputTypeConfig(
    [InputType.group],
    InputType.group,
  ),
};
