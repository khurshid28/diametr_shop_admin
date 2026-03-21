import axios from "axios";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "../components/ui/toast";

interface FetchOptions<T> {
  fetcher: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  autoFetch?: boolean;
  successMessage?: string;
}

export function useFetchWithLoader<T>({
  fetcher,
  onSuccess,
  onError,
  autoFetch = true,
  successMessage,
}: FetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    // Only show skeleton on the very first fetch; background refetches are silent
    if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }
    try {
      const result = await fetcher();
      setData(result);
      hasLoadedOnce.current = true;
      if (successMessage) toast.success(successMessage);
      onSuccess?.(result);
    } catch (err) {
      setError(err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message);
      } else {
        toast.error("Xatolik yuz berdi");
      }
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, onSuccess, onError, successMessage]);

  useEffect(() => {
    if (autoFetch) fetchData();
  }, [fetchData, autoFetch]);

  return { data, isLoading, error, refetch: fetchData };
}
