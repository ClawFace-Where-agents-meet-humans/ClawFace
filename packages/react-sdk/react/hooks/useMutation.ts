import { useState, useCallback } from "react";
import type { RecordResponse } from "@clawface/shared";
import { useOpenClawClient } from "../provider.js";
import type { ApiError } from "../../core/errors.js";

export interface MutationState<T, A extends unknown[] = unknown[]> {
  data: T | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  mutate: (...args: A) => Promise<T>;
  reset: () => void;
}

function useMutation<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
): MutationState<T, A> {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<ApiError | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (...args: A): Promise<T> => {
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await fn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err as ApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fn]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, mutate, reset };
}

export function useCreateRecord(schemaName: string) {
  const client = useOpenClawClient();
  return useMutation<RecordResponse, [Record<string, unknown>]>(
    useCallback((data: Record<string, unknown>) => client.createRecord(schemaName, data), [client, schemaName]),
  );
}

export function useUpdateRecord() {
  const client = useOpenClawClient();
  return useMutation<RecordResponse, [{ recordId: string; data: Record<string, unknown> }]>(
    useCallback(({ recordId, data }: { recordId: string; data: Record<string, unknown> }) =>
      client.updateRecord(recordId, data), [client]),
  );
}

export function useDeleteRecord() {
  const client = useOpenClawClient();
  return useMutation<void, [string]>(
    useCallback((recordId: string) => client.deleteRecord(recordId), [client]),
  );
}
