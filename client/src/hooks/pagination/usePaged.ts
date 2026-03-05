import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { PagedRequest, PagedResult, ApiResponse } from '@/lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface UsePagedOptions<T> {
  /** Clave única para React Query (se combina con los parámetros de paginación). */
  queryKey: string | string[];
  /** Función que llama al backend con los parámetros de paginación. */
  queryFn: (params: PagedRequest) => Promise<ApiResponse<PagedResult<T>>>;
  /** Tamaño de página inicial. Por defecto: 20. */
  initialPageSize?: number;
  /** Página inicial. Por defecto: 1. */
  initialPage?: number;
  /** Campo de ordenamiento inicial. */
  initialSortBy?: string;
  /** Dirección de ordenamiento inicial. Por defecto: 'asc'. */
  initialSortDirection?: 'asc' | 'desc';
  /** Tiempo en ms que los datos se consideran frescos. Por defecto: 30000 (30s). */
  staleTime?: number;
  /** Si es false, no ejecuta la query. Por defecto: true. */
  enabled?: boolean;
}

export interface UsePagedResult<T> {
  /** Lista de registros de la página actual. */
  items: T[];
  /** Número de página actual (base 1). */
  page: number;
  /** Cantidad de registros por página. */
  pageSize: number;
  /** Total de registros en la base de datos. */
  totalCount: number;
  /** Total de páginas calculadas. */
  totalPages: number;
  /** Indica si existe una página anterior. */
  hasPreviousPage: boolean;
  /** Indica si existe una página siguiente. */
  hasNextPage: boolean;
  /** Estado de carga. */
  isLoading: boolean;
  /** Estado de error. */
  isError: boolean;
  /** Mensaje de error si existe. */
  errorMessage?: string;
  /** Ir a una página específica. */
  goToPage: (page: number) => void;
  /** Ir a la página siguiente. */
  nextPage: () => void;
  /** Ir a la página anterior. */
  prevPage: () => void;
  /** Cambiar el tamaño de página. */
  setPageSize: (size: number) => void;
  /** Cambiar el campo de ordenamiento. */
  setSortBy: (field: string, direction?: 'asc' | 'desc') => void;
  /** Parámetros actuales de paginación. */
  currentParams: PagedRequest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook reutilizable para consumir endpoints paginados del backend.
 *
 * Uso:
 * ```tsx
 * const { items, isLoading, totalCount, goToPage, nextPage } = usePaged<Employee>({
 *   queryKey: 'employees',
 *   queryFn: (params) => EmpleadosAPI.listPaged(params),
 *   initialPageSize: 20,
 * });
 * ```
 */
export function usePaged<T>(options: UsePagedOptions<T>): UsePagedResult<T> {
  const {
    queryKey,
    queryFn,
    initialPageSize = 20,
    initialPage = 1,
    initialSortBy,
    initialSortDirection = 'asc',
    staleTime = 30_000,
    enabled = true,
  } = options;

  const [params, setParams] = useState<PagedRequest>({
    page: initialPage,
    pageSize: initialPageSize,
    sortBy: initialSortBy,
    sortDirection: initialSortDirection,
  });

  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...normalizedKey, params],
    queryFn: () => queryFn(params),
    placeholderData: keepPreviousData,
    staleTime,
    enabled,
  });

  // Extraer datos del resultado
  const pagedData: PagedResult<T> | null =
    data?.status === 'success' ? data.data : null;

  const errorMessage =
    data?.status === 'error' ? data.error.message : undefined;

  // ── Acciones de navegación ──────────────────────────────────────────────

  const goToPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    setParams(prev => ({
      ...prev,
      page: Math.min(prev.page + 1, pagedData?.totalPages ?? prev.page),
    }));
  }, [pagedData?.totalPages]);

  const prevPage = useCallback(() => {
    setParams(prev => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setParams(prev => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  const setSortBy = useCallback((field: string, direction: 'asc' | 'desc' = 'asc') => {
    setParams(prev => ({ ...prev, sortBy: field, sortDirection: direction, page: 1 }));
  }, []);

  return {
    items: pagedData?.items ?? [],
    page: pagedData?.page ?? params.page,
    pageSize: pagedData?.pageSize ?? params.pageSize,
    totalCount: pagedData?.totalCount ?? 0,
    totalPages: pagedData?.totalPages ?? 0,
    hasPreviousPage: pagedData?.hasPreviousPage ?? false,
    hasNextPage: pagedData?.hasNextPage ?? false,
    isLoading,
    isError,
    errorMessage,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    setSortBy,
    currentParams: params,
  };
}
