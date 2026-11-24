import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { useIsDesktop } from "@/hooks/useIsDesktop";
import type { InfiniteListState } from "@/hooks/pagination/usePaged";

/** Página de resultados con cualquiera de las formas que devuelve el backend. */
interface PageShape<T> {
  items: T[];
  page: number;
  totalCount: number;
  hasNextPage: boolean;
}

/** Acepta `PagedResult`, `{status:'success',data}` (ApiResponse) y `{success:true,data}`. */
export function readPage<T>(raw: unknown): PageShape<T> {
  let node: any = raw;
  if (node?.status === "error") throw new Error(node?.error?.message ?? "No se pudo cargar la lista");
  if (node?.success === false) throw new Error(node?.message ?? "No se pudo cargar la lista");
  // desenvolver hasta encontrar `items`
  for (let i = 0; i < 3 && node && !Array.isArray(node?.items) && node?.data; i++) node = node.data;
  const items: T[] = Array.isArray(node?.items) ? node.items : Array.isArray(node) ? node : [];
  const totalCount = Number(node?.totalCount ?? items.length);
  const page = Number(node?.page ?? 1);
  const pageSize = Number(node?.pageSize ?? 0);
  const hasNextPage =
    typeof node?.hasNextPage === "boolean"
      ? node.hasNextPage
      : pageSize > 0
        ? page * pageSize < totalCount
        : false;
  return { items, page, totalCount, hasNextPage };
}

export interface UseMobileInfiniteListOptions<T> {
  /** Clave de la consulta: incluir filtros y búsqueda, NUNCA la página. */
  queryKey: readonly unknown[];
  /** Pide una página al backend. Puede devolver PagedResult o ApiResponse<PagedResult>. */
  fetchPage: (page: number, pageSize: number) => Promise<unknown>;
  pageSize: number;
  /** Condición adicional para ejecutar (p. ej. un id requerido). */
  enabled?: boolean;
  /** Identificador del registro para deduplicar al correrse las páginas. Por defecto `id`. */
  getKey?: (item: T) => string | number | undefined;
  staleTime?: number;
}

export interface MobileInfiniteList<T> {
  /** true en móvil (< 768 px): la pantalla debe mostrar `items` acumulados y desactivar su consulta paginada. */
  active: boolean;
  items: T[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  totalCount: number;
  /** Los acumulados con la forma de `PagedResult`, para reemplazar `query.data` sin tocar el render. */
  asPaged: {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  error: Error | null;
  /** Pasar a `<DataPagination infinite={...} />`. */
  infinite: InfiniteListState;
}

/**
 * Scroll infinito en móvil para pantallas que ya tienen su propia consulta paginada (estado `page` propio).
 * La pantalla conserva su consulta actual para escritorio (con `enabled: !mobile.active`) y usa esta para móvil.
 */
export function useMobileInfiniteList<T>({
  queryKey,
  fetchPage,
  pageSize,
  enabled = true,
  getKey,
  staleTime = 30_000,
}: UseMobileInfiniteListOptions<T>): MobileInfiniteList<T> {
  const isDesktop = useIsDesktop();
  const active = !isDesktop;

  const query = useInfiniteQuery({
    queryKey: [...queryKey, "infinite", pageSize],
    queryFn: async ({ pageParam }) => readPage<T>(await fetchPage(pageParam, pageSize)),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    staleTime,
    // Al salir de la pantalla se descartan las páginas acumuladas: al volver empieza de nuevo y no re-pide decenas de páginas
    gcTime: 60_000,
    enabled: enabled && active,
  });

  const pages = query.data?.pages ?? [];
  const items = useMemo(() => {
    const all = pages.flatMap((p) => p.items);
    const keyOf = getKey ?? ((item: T) => (item as Record<string, unknown>)?.id as string | number | undefined);
    if (all.length === 0 || keyOf(all[0]) === undefined) return all;
    return Array.from(new Map(all.map((item) => [String(keyOf(item)), item] as const)).values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const totalCount = pages[pages.length - 1]?.totalCount ?? 0;

  return {
    active,
    items,
    isLoading: query.isLoading,
    isError: query.isError && !query.data,
    errorMessage: query.isError && !query.data ? (query.error as Error | null)?.message : undefined,
    totalCount,
    asPaged: {
      items,
      page: pages.length || 1,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      hasPreviousPage: false,
      hasNextPage: query.hasNextPage ?? false,
    },
    error: query.isError && !query.data ? (query.error as Error | null) : null,
    infinite: {
      active,
      loadedCount: items.length,
      totalCount,
      hasNextPage: query.hasNextPage ?? false,
      isFetchingNextPage: query.isFetchingNextPage,
      isLoadMoreError: query.isError && !!query.data,
      fetchNextPage: () => {
        void query.fetchNextPage();
      },
    },
  };
}

/**
 * Devuelve la consulta paginada de la pantalla en escritorio y, en móvil, una copia con los datos acumulados
 * del scroll infinito. Así el render existente (`list.data`, `list.isLoading`…) no cambia.
 * Uso: `const list = withMobileList(listQuery, mobile)` con `listQuery` creada con `enabled: !mobile.active`.
 */
export function withMobileList<Q extends { data: unknown; isLoading: boolean; isError: boolean }, T>(
  query: Q,
  mobile: MobileInfiniteList<T>,
  /** 'api' cuando la pantalla espera `{ status: 'success', data: PagedResult }` en lugar del PagedResult directo. */
  shape: "paged" | "api" = "paged"
): Q {
  if (!mobile.active) return query;
  return {
    ...query,
    data: shape === "api" ? { status: "success", data: mobile.asPaged } : mobile.asPaged,
    isLoading: mobile.isLoading,
    isError: mobile.isError,
    isFetching: mobile.infinite.isFetchingNextPage,
    error: mobile.error,
  } as Q;
}
