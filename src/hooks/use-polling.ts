"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UsePollingOptions<T> {
  /** URL to poll */
  url: string;
  /** Polling interval in ms (default: 2000) */
  interval?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Stop condition - return true to stop polling */
  stopWhen?: (data: T) => boolean;
  /** Called on each successful fetch */
  onData?: (data: T) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export function usePolling<T>({
  url,
  interval = 2000,
  enabled = true,
  stopWhen,
  onData,
  onError,
}: UsePollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStopped, setIsStopped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = (await response.json()) as T;
      setData(result);
      setError(null);
      setIsLoading(false);
      onData?.(result);

      if (stopWhen?.(result)) {
        setIsStopped(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      onError?.(error);
    }
  }, [url, stopWhen, onData, onError]);

  useEffect(() => {
    if (!enabled || isStopped) return;

    // Initial fetch
    fetchData();

    // Start polling
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isStopped, interval, fetchData]);

  return { data, isLoading, error, isStopped };
}
