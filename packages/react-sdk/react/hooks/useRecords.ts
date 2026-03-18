import { useState, useEffect, useCallback, useRef } from "react";
import type { RecordResponse, QueryOptions, QueryResult } from "@clawface/shared";
import { useOpenClawClient } from "../provider.js";
import type { ApiError } from "../../core/errors.js";

export interface UseRecordsResult {
  data: QueryResult<RecordResponse> | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  refetch: () => Promise<void>;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
}

export function useRecords(schemaName: string, options?: Omit<QueryOptions, "limit" | "offset">): UseRecordsResult {
  const client = useOpenClawClient();
  const [data, setData] = useState<QueryResult<RecordResponse> | undefined>();
  const [error, setError] = useState<ApiError | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Stabilize options reference — only update when the serialized value changes
  const optionsRef = useRef(options);
  const optionsKey = JSON.stringify(options);
  const prevOptionsKeyRef = useRef(optionsKey);
  if (prevOptionsKeyRef.current !== optionsKey) {
    prevOptionsKeyRef.current = optionsKey;
    optionsRef.current = options;
  }
  const stableOptions = optionsRef.current;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await client.queryRecords(schemaName, {
        ...stableOptions,
        limit: pageSize,
        offset: page * pageSize,
      });
      setData(result);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [client, schemaName, page, pageSize, stableOptions]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, error, isLoading, refetch, page, setPage, pageSize, setPageSize };
}
