import { useState, useEffect, useCallback } from "react";
import type { RecordResponse } from "@clawface/shared";
import { useOpenClawClient } from "../provider.js";
import type { ApiError } from "../../core/errors.js";

export interface UseRecordResult {
  data: RecordResponse | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useRecord(recordId: string | undefined): UseRecordResult {
  const client = useOpenClawClient();
  const [data, setData] = useState<RecordResponse | undefined>();
  const [error, setError] = useState<ApiError | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!recordId) {
      setData(undefined);
      setError(undefined);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await client.getRecord(recordId);
      setData(result);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [client, recordId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, isLoading, refetch };
}
