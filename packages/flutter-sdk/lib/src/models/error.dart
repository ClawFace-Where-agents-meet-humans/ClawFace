// Ported from: packages/shared/src/types.ts — ValidationErrorDetail, ErrorResponse
// Ported from: packages/react-sdk/core/errors.ts — ApiError

/// Field-level validation error detail.
class ValidationErrorDetail {
  final String field;
  final String message;

  const ValidationErrorDetail({
    required this.field,
    required this.message,
  });

  factory ValidationErrorDetail.fromJson(Map<String, dynamic> json) {
    return ValidationErrorDetail(
      field: json['field'] as String,
      message: json['message'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'field': field,
        'message': message,
      };

  @override
  String toString() => '$field: $message';
}

/// Structured error response from the API.
class ErrorResponse {
  final String error;
  final String message;
  final List<ValidationErrorDetail>? details;
  final String? hint;

  const ErrorResponse({
    required this.error,
    required this.message,
    this.details,
    this.hint,
  });

  factory ErrorResponse.fromJson(Map<String, dynamic> json) {
    return ErrorResponse(
      error: json['error'] as String,
      message: json['message'] as String,
      details: (json['details'] as List<dynamic>?)
          ?.map((d) => ValidationErrorDetail.fromJson(d as Map<String, dynamic>))
          .toList(),
      hint: json['hint'] as String?,
    );
  }
}

/// Exception thrown by [ClawFaceClient] on API errors.
class ApiError implements Exception {
  final int status;
  final String code;
  final String message;
  final List<ValidationErrorDetail>? details;
  final String? hint;

  const ApiError(
    this.status,
    this.code,
    this.message, [
    this.details,
    this.hint,
  ]);

  @override
  String toString() {
    final buffer = StringBuffer('ApiError($status $code): $message');
    if (hint != null) buffer.write(' — hint: $hint');
    if (details != null && details!.isNotEmpty) {
      buffer.write('\n  ${details!.join('\n  ')}');
    }
    return buffer.toString();
  }
}
