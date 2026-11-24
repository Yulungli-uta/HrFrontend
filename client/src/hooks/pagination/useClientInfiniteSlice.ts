import { useMemo } from "react";

import { useIsDesktop } from "@/hooks/useIsDesktop";
import type { InfiniteListState } from "@/hooks/pagination/usePaged";

export interface UseClientInfiniteSliceOptions {
  /** Página actual del estado de la pantalla (base 1). */
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
}

/**
 * Scroll infinito en móvil para listas que se paginan EN MEMORIA (los datos completos ya están cargados).
 * En escritorio devuelve la página actual; en móvil devuelve todo lo acumulado hasta `page * pageSize`
 * y `infinite.fetchNextPage` avanza `page`. No hace peticiones al servidor.
 */
export function useClientInfiniteSlice<T>(allItems: readonly T[], { page, setPage, pageSize }: UseClientInfiniteSliceOptions) {
  const isDesktop = useIsDesktop();
  const active = !isDesktop;
  const totalCount = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const visibleItems = useMemo(() => {
    if (active) return allItems.slice(0, page * pageSize);
    const start = (page - 1) * pageSize;
    return allItems.slice(start, start + pageSize);
  }, [active, allItems, page, pageSize]);

  const infinite: InfiniteListState = {
    active,
    loadedCount: visibleItems.length,
    totalCount,
    hasNextPage: page < totalPages,
    isFetchingNextPage: false,
    isLoadMoreError: false,
    fetchNextPage: () => setPage(Math.min(page + 1, totalPages)),
  };

  return { visibleItems, infinite };
}
