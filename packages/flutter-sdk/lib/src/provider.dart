import 'package:flutter/widgets.dart';

import 'client.dart';

/// Provides a [ClawFaceClient] to the widget tree.
///
/// Usage:
/// ```dart
/// ClawFaceProvider(
///   baseUrl: 'http://localhost:3000/api',
///   userId: 'user-123',       // dev mode
///   // apiKey: 'cf_...',      // production
///   child: MyApp(),
/// )
/// ```
///
/// Access the client:
/// ```dart
/// final client = ClawFaceProvider.of(context);
/// ```
class ClawFaceProvider extends InheritedWidget {
  final ClawFaceClient client;

  ClawFaceProvider({
    super.key,
    required String baseUrl,
    String? userId,
    String? apiKey,
    Map<String, String>? headers,
    required super.child,
  }) : client = ClawFaceClient(
          baseUrl: baseUrl,
          userId: userId,
          apiKey: apiKey,
          headers: headers,
        );

  /// Get the [ClawFaceClient] from the nearest ancestor [ClawFaceProvider].
  static ClawFaceClient of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<ClawFaceProvider>();
    if (provider == null) {
      throw FlutterError(
          'ClawFaceProvider.of() called without a ClawFaceProvider ancestor.\n'
          'Wrap your widget tree with ClawFaceProvider.');
    }
    return provider.client;
  }

  @override
  bool updateShouldNotify(ClawFaceProvider oldWidget) =>
      client != oldWidget.client;
}
