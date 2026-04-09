//src/hooks/usePagedCombobox.ts
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, PagedResult } from "@/lib/api";

export interface ComboboxOption<T = unknown> {
  value: number | string;
  label: string;
  detail?: string;
  extra?: string;
  raw?: T;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface UsePagedComboboxParams<TItem> {
  queryKey: string;
  queryFn: (params: {
    page: number;
    pageSize: number;
    search?: string;
  }) => Promise<ApiResponse<PagedResult<TItem>>>;
  mapFn: (item: TItem) => ComboboxOption<TItem> | null;
  enabled?: boolean;
  initialPageSize?: number;
  debounceMs?: number;
  staleTime?: number;
}

export function usePagedCombobox<TItem>({
  queryKey,
  queryFn,
  mapFn,
  enabled = true,
  initialPageSize = 10,
  debounceMs = 400,
  staleTime = 30_000,
}: UsePagedComboboxParams<TItem>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, debounceMs);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const params = useMemo(
    () => ({
      page,
      pageSize: initialPageSize,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [page, initialPageSize, debouncedSearch]
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => queryFn(params),
    enabled,
    staleTime,
  });

  const paged = data?.status === "success" ? data.data : undefined;

  const options = useMemo(() => {
    const items = paged?.items ?? [];
    return items.map(mapFn).filter(Boolean) as ComboboxOption<TItem>[];
  }, [paged, mapFn]);

  const totalPages = paged?.totalPages ?? 1;
  const totalCount = paged?.totalCount ?? 0;
  const pageSize = paged?.pageSize ?? initialPageSize;
  const hasPreviousPage = paged?.hasPreviousPage ?? page > 1;
  const hasNextPage = paged?.hasNextPage ?? page < totalPages;

  const reset = () => {
    setSearchTerm("");
    setPage(1);
  };

  return {
    options,
    isLoading,
    isFetching,
    refetch,
    searchTerm,
    setSearchTerm,
    page,
    pageSize,
    totalPages,
    totalCount,
    hasPreviousPage,
    hasNextPage,
    goToPage: setPage,
    goPrev: () => setPage((p) => Math.max(1, p - 1)),
    goNext: () => setPage((p) => Math.min(totalPages, p + 1)),
    reset,
  };
}