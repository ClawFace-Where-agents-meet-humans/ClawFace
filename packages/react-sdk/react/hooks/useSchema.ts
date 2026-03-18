import { useState, useEffect, useCallback } from "react";
import type { SchemaResponse } from "@clawface/shared";
import { useOpenClawClient } from "../provider.js";
import type { ApiError } from "../../core/errors.js";

export interface UseSchemaResult {
  data: SchemaResponse | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useSchema(schemaName: string): UseSchemaResult {
  const client = useOpenClawClient();
  const [data, setData] = useState<SchemaResponse | undefined>();
  const [error, setError] = useState<ApiError | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await client.getSchema(schemaName);
      setData(result);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [client, schemaName]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, isLoading, refetch };
}
