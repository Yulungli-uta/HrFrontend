import { useEffect, useRef, useState } from "react";
import { usePaged } from "@/hooks/pagination/usePaged";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ApiResponse, PagedRequest, PagedResult } from "@/lib/api";

/** Filtro de estado de los listados de catálogos. */
export type ActiveFilter = "all" | "active" | "inactive";

/** Valor que se envía al servidor (undefined = sin filtro). */
export const toIsActive = (filter: ActiveFilter): boolean | undefined =>
  filter === "all" ? undefined : filter === "active";

interface Options<T, F extends Record<string, unknown>> {
  /** Prefijo de caché del listado (los filtros se agregan solos). */
  queryKey: readonly unknown[];
  /** Filtros del servidor; al cambiar, el listado vuelve a la página 1. */
  filters: F;
  fetcher: (params: PagedRequest & F) => Promise<ApiResponse<PagedResult<T>>>;
  pageSize?: number;
}

/**
 * Listado de catálogo paginado y filtrado en el servidor: `usePaged` + búsqueda con espera al escribir
 * + regreso a la página 1 cuando cambia cualquier filtro.
 */
export function useCatalogPaged<T, F extends Record<string, unknown>>({ queryKey, filters, fetcher, pageSize = 10 }: Options<T, F>) {
  const [searchText, setSearchText] = useState("");
  const debounced = useDebouncedValue(searchText, 300);

  const paged = usePaged<T>({
    queryKey: [...queryKey, filters],
    queryFn: (params) => fetcher({ ...params, ...filters }),
    initialPageSize: pageSize,
    initialSortBy: "description",
  });

  const { setSearch, goToPage, currentParams } = paged;
  useEffect(() => {
    if ((currentParams.search ?? "") !== debounced) setSearch(debounced);
  }, [debounced, currentParams.search, setSearch]);

  const filtersKey = JSON.stringify(filters);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    goToPage(1);
  }, [filtersKey, goToPage]);

  return { ...paged, searchText, setSearchText };
}
