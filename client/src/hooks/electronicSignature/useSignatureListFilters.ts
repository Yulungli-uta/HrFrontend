// Filtro (texto + estado) y paginación en cliente, compartido entre la bandeja y el
// listado de procesos creados: ambos listan hasta 200 filas del backend sin paginación
// propia, así que se resuelve en el cliente en vez de duplicar la lógica en cada página.
import { useMemo, useState } from "react";
import type { SigningProcessListItem } from "@/types/electronic-signature";

export function useSignatureListFilters(rows: SigningProcessListItem[], statusOf: (row: SigningProcessListItem) => string) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const statusOptions = useMemo(() => {
    const set = new Set(rows.map(statusOf));
    return Array.from(set);
  }, [rows, statusOf]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !term || row.processNumber.toLowerCase().includes(term) || row.title.toLowerCase().includes(term);
      const matchesStatus = status === "ALL" || statusOf(row) === status;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status, statusOf]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const setSearchAndReset = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const setStatusAndReset = (value: string) => {
    setStatus(value);
    setPage(1);
  };
  const setPageSizeAndReset = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    search,
    setSearch: setSearchAndReset,
    status,
    setStatus: setStatusAndReset,
    statusOptions,
    filtered,
    paged,
    page: currentPage,
    pageSize,
    setPageSize: setPageSizeAndReset,
    pageCount,
    setPage,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < pageCount,
    totalCount: filtered.length,
  };
}
