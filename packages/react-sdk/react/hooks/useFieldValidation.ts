import { useState, useEffect, useRef } from "react";
import type { SchemaResponse } from "@clawface/shared";
import { validateRecordData } from "@clawface/shared";

/**
 * Debounced client-side field validation using shared validateRecordData.
 * Returns a map of field name → error message (undefined if valid).
 */
export function useFieldValidation(
  schema: SchemaResponse | undefined,
  data: Record<string, unknown>,
  debounceMs = 300,
): Record<string, string | undefined> {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Stabilize data reference
  const dataRef = useRef(data);
  const dataKey = JSON.stringify(data);
  const prevDataKeyRef = useRef(dataKey);
  if (prevDataKeyRef.current !== dataKey) {
    prevDataKeyRef.current = dataKey;
    dataRef.current = data;
  }
  const stableData = dataRef.current;

  useEffect(() => {
    if (!schema) {
      setErrors({});
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const validationErrors = validateRecordData(schema, stableData);
      const errorMap: Record<string, string | undefined> = {};
      for (const err of validationErrors) {
        errorMap[err.field] = err.message;
      }
      setErrors(errorMap);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [schema, dataKey, debounceMs, stableData]);

  return errors;
}
