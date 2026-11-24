import { useState, useCallback, useMemo } from 'react';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import type { PagedRequest, PagedResult, ApiResponse } from '@/lib/api';
import { useIsDesktop } from '@/hooks/useIsDesktop';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface UsePagedOptions<T> {
  /** Clave única para React Query (se combina con los parámetros de paginación). */
  queryKey: string | readonly unknown[];
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
  /**
   * Scroll infinito en móvil (< 768 px): acumula las páginas y carga la siguiente al llegar al final.
   * Por defecto: true. En escritorio siempre pagina como antes. Poner false para forzar paginador en móvil.
   */
  mobileInfinite?: boolean;
}

/** Estado del scroll infinito; se pasa tal cual a `<DataPagination infinite={...} />`. */
export interface InfiniteListState {
  /** true cuando la lista está en modo scroll infinito (móvil). */
  active: boolean;
  /** Registros acumulados hasta ahora. */
  loadedCount: number;
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Falló la carga de la página siguiente (lo ya cargado se conserva). */
  isLoadMoreError: boolean;
  fetchNextPage: () => void;
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
  /**
   * Establecer el término de búsqueda para filtrar en el servidor.
   * Resetea automáticamente a página 1 para evitar páginas inexistentes.
   */
  setSearch: (term: string) => void;
  /** Limpiar el término de búsqueda y volver a la página 1. */
  clearSearch: () => void;
  /** Parámetros actuales de paginación (incluye search si está activo). */
  currentParams: PagedRequest;
  /** Estado del scroll infinito móvil. Pasar a `<DataPagination infinite={infinite} />`. */
  infinite: InfiniteListState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook reutilizable para consumir endpoints paginados del backend.
 * Soporta paginación, ordenamiento y búsqueda en servidor.
 *
 * Uso:
 * ```tsx
 * const { items, isLoading, totalCount, goToPage, setSearch } = usePaged<Employee>({
 *   queryKey: 'employees',
 *   queryFn: (params) => EmpleadosAPI.listPaged(params),
 *   initialPageSize: 20,
 * });
 *
 * // Búsqueda en servidor (no filtra localmente)
 * <input onChange={(e) => setSearch(e.target.value)} />
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
    mobileInfinite = true,
  } = options;

  const isDesktop = useIsDesktop();
  const infiniteMode = mobileInfinite && !isDesktop;

  const [params, setParams] = useState<PagedRequest>({
    page: initialPage,
    pageSize: initialPageSize,
    sortBy: initialSortBy,
    sortDirection: initialSortDirection,
  });

  const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  const { data, isLoading: pagedLoading, isError: pagedError } = useQuery({
    queryKey: [...normalizedKey, params],
    queryFn: () => queryFn(params),
    placeholderData: keepPreviousData,
    staleTime,
    enabled: enabled && !infiniteMode,
  });

  // Móvil: la clave no lleva la página, así que al cambiar filtros, búsqueda u orden la lista vuelve a empezar
  const { page: _ignoredPage, ...paramsWithoutPage } = params;
  const infiniteQuery = useInfiniteQuery({
    queryKey: [...normalizedKey, 'infinite', paramsWithoutPage],
    queryFn: async ({ pageParam }) => {
      const res = await queryFn({ ...params, page: pageParam });
      if (res.status !== 'success') throw new Error(res.error.message);
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    staleTime,
    gcTime: 60_000,
    enabled: enabled && infiniteMode,
  });

  const infinitePages = infiniteQuery.data?.pages ?? [];
  const infiniteItems = useMemo(() => {
    const all = infinitePages.flatMap((p) => p.items);
    // Al eliminar o inactivar, los registros se corren entre páginas: se deduplica por id cuando existe
    const keyOf = (item: T) => {
      const record = item as Record<string, unknown>;
      return record?.id ?? record?.Id ?? record?.ID;
    };
    if (all.length === 0 || keyOf(all[0]) === undefined) return all;
    return Array.from(new Map(all.map((item) => [String(keyOf(item)), item] as const)).values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infiniteQuery.data]);

  const lastInfinitePage = infinitePages[infinitePages.length - 1];

  // Extraer datos del resultado (modo paginado) o de la última página (modo infinito)
  const pagedData: PagedResult<T> | null = infiniteMode
    ? lastInfinitePage ?? null
    : data?.status === 'success'
      ? data.data
      : null;

  const isLoading = infiniteMode ? infiniteQuery.isLoading : pagedLoading;
  const isError = infiniteMode ? infiniteQuery.isError && !infiniteQuery.data : pagedError;

  const errorMessage = infiniteMode
    ? (infiniteQuery.isError && !infiniteQuery.data ? (infiniteQuery.error as Error | null)?.message : undefined)
    : data?.status === 'error' ? data.error.message : undefined;

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

  /**
   * Guarda el término de búsqueda tal como lo escribe el usuario (sin trim)
   * para que los espacios intermedios sean válidos al buscar por nombre completo.
   *
   * El trim() se aplica únicamente al construir la query string hacia el backend
   * (en pagination.ts / createApiService), por lo que espacios al inicio/fin
   * se limpian antes de llegar al servidor pero no afectan lo que ve el input.
   *
   * Si el término resultante (tras trim) es vacío, se elimina el filtro.
   * Resetea a página 1 para evitar páginas inexistentes.
   */
  const setSearch = useCallback((term: string) => {
    setParams(prev => ({
      ...prev,
      // Guardamos el valor sin trim para que el input pueda mostrar espacios
      // (ej: "María Lozano"). El factory de API hace trim antes de enviar.
      search: term,
      page: 1,
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setParams(prev => ({ ...prev, search: undefined, page: 1 }));
  }, []);

  return {
    items: infiniteMode ? infiniteItems : pagedData?.items ?? [],
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
    setSearch,
    clearSearch,
    currentParams: params,
    infinite: {
      active: infiniteMode,
      loadedCount: infiniteItems.length,
      totalCount: pagedData?.totalCount ?? 0,
      hasNextPage: infiniteQuery.hasNextPage ?? false,
      isFetchingNextPage: infiniteQuery.isFetchingNextPage,
      isLoadMoreError: infiniteQuery.isError && !!infiniteQuery.data,
      fetchNextPage: () => {
        void infiniteQuery.fetchNextPage();
      },
    },
  };
}
