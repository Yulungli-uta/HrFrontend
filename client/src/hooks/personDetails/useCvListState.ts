import { useEffect, useMemo, useState } from "react";

export interface CvSortOption<T> {
  value: string;
  label: string;
  compare: (a: T, b: T) => number;
}

export interface CvFilterField<T> {
  /** Clave interna del filtro (única dentro de la pestaña). */
  key: string;
  /** Etiqueta mostrada en el drawer de filtros y en el chip activo. */
  label: string;
  /** Opciones disponibles — se arman dinámicamente con `buildFilterOptions`. */
  options: { value: string; label: string }[];
  /** Extrae el valor comparable del registro para este filtro. */
  getValue: (item: T) => string | null | undefined;
}

interface UseCvListStateOptions<T> {
  /** Arreglo completo ya cargado (las 10 pestañas de hoja de vida no paginan en el backend). */
  items: T[];
  /** Texto concatenado y buscable de cada registro (se compara en minúsculas). */
  searchText: (item: T) => string;
  /** Opciones de ordenamiento disponibles para el usuario. */
  sortOptions: CvSortOption<T>[];
  /** Valor por defecto entre `sortOptions`. Por defecto usa la primera opción. */
  defaultSort?: string;
  /** Registros por página inicial. Por defecto 6. */
  defaultPageSize?: number;
  /** Filtros por campo disponibles (drawer "Filtros"). Opcional. */
  filterFields?: CvFilterField<T>[];
}

/** Arma opciones únicas y ordenadas a partir de los valores presentes en los datos ya cargados. */
export function buildFilterOptions(values: Array<string | null | undefined>): { value: string; label: string }[] {
  const unique = Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== "")));
  unique.sort((a, b) => a.localeCompare(b));
  return unique.map((v) => ({ value: v, label: v }));
}

/**
 * Estado compartido de búsqueda + filtros + orden + paginado en memoria para
 * las listas de la Hoja de Vida. Los endpoints de estas entidades
 * (`GET .../person/{id}`) devuelven el arreglo completo sin soporte de query
 * params, así que paginar en el backend implicaría tocar ~10 controladores;
 * con los volúmenes reales (máx. ~300 registros/persona) paginar en el
 * navegador es seguro y no requiere cambios de contrato de API.
 */
export function useCvListState<T>({
  items,
  searchText,
  sortOptions,
  defaultSort,
  defaultPageSize = 6,
  filterFields = [],
}: UseCvListStateOptions<T>) {
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState(defaultSort ?? sortOptions[0]?.value ?? "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const normalizedSearch = search.trim().toLowerCase();
  const activeFilterKeys = Object.keys(filterValues).filter((k) => filterValues[k]);
  const filterSignature = activeFilterKeys.map((k) => `${k}=${filterValues[k]}`).join("&");

  const filtered = useMemo(() => {
    let result = items;
    if (activeFilterKeys.length > 0) {
      result = result.filter((item) =>
        activeFilterKeys.every((key) => {
          const field = filterFields.find((f) => f.key === key);
          if (!field) return true;
          return field.getValue(item) === filterValues[key];
        })
      );
    }
    if (normalizedSearch) {
      result = result.filter((item) => searchText(item).toLowerCase().includes(normalizedSearch));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, normalizedSearch, searchText, filterSignature]);

  const sorted = useMemo(() => {
    const option = sortOptions.find((o) => o.value === sortValue);
    if (!option) return filtered;
    return [...filtered].sort(option.compare);
  }, [filtered, sortOptions, sortValue]);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  // Vuelve a la primera página cuando cambia búsqueda, orden o filtros, para
  // no quedar "varado" en una página que ya no tiene datos correspondientes.
  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, sortValue, filterSignature]);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  return {
    search,
    setSearch,
    sortValue,
    setSortValue,
    sortOptions,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    paginatedItems,
    totalCount,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
    isFiltering: normalizedSearch.length > 0 || activeFilterKeys.length > 0,
    filterFields,
    filterValues,
    setFilterValue: (key: string, value: string) =>
      setFilterValues((prev) => ({ ...prev, [key]: value })),
    clearFilters: () => setFilterValues({}),
    activeFilterCount: activeFilterKeys.length,
  };
}
