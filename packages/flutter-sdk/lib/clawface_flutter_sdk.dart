/// ClawFace Flutter SDK — schema-driven CRUD client with Provider integration.
///
/// ```dart
/// import 'package:clawface_flutter_sdk/clawface_flutter_sdk.dart';
///
/// // Wrap your app
/// ClawFaceProvider(
///   baseUrl: 'http://localhost:3000/api',
///   apiKey: 'cf_...',
///   child: MyApp(),
/// )
///
/// // Access the client
/// final client = ClawFaceProvider.of(context);
/// final schemas = await client.listSchemas();
/// ```
library clawface_flutter_sdk;

// Models
export 'src/models/enums.dart';
export 'src/models/field_def.dart';
export 'src/models/schema.dart';
export 'src/models/record.dart';
export 'src/models/api_key.dart';
export 'src/models/error.dart';

// Constants & Validation
export 'src/constants.dart';
export 'src/validation.dart';

// Client
export 'src/client.dart';

// Flutter Integration
export 'src/provider.dart';
export 'src/notifiers/schemas_notifier.dart';
export 'src/notifiers/schema_notifier.dart';
export 'src/notifiers/records_notifier.dart';
