import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  NonTitularRosterAPI,
  TeacherRosterAPI,
  type ApiResponse,
  type NonTitularRosterFilter,
  type NonTitularRosterItemDto,
  type NonTitularRosterSummaryDto,
  type TeacherRosterFilter,
  type TeacherRosterItemDto,
  type TeacherRosterSummaryDto,
} from "@/lib/api";
import type { PagedResult } from "@/lib/api/core/pagination";

/** `apiFetch` no lanza: devuelve `status: 'error'`. Se convierte en excepción para que React Query exponga `error`. */
function unwrap<T>(res: ApiResponse<T>, defaultMessage: string): T {
  if (res.status === "error") throw new Error(res.error.message || defaultMessage);
  return res.data;
}

// Vigencia corta: los sueldos y acciones se corrigen desde otras pantallas y esta lista debe reflejarlo sin recargar a mano.
const STALE_MS = 15_000;

export function useTeacherRosterList(filter: TeacherRosterFilter, page: number, pageSize: number) {
  return useQuery<PagedResult<TeacherRosterItemDto>>({
    queryKey: ["teacher-roster", "list", filter, page, pageSize],
    queryFn: async () => unwrap(await TeacherRosterAPI.list(filter, page, pageSize), "Error al cargar los docentes titulares"),
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
  });
}

export function useTeacherRosterSummary(filter: TeacherRosterFilter) {
  // El servidor cuenta cada grupo de tarjetas con todos los filtros menos el suyo propio, así que se envía el filtro completo.
  return useQuery<TeacherRosterSummaryDto>({
    queryKey: ["teacher-roster", "summary", filter],
    queryFn: async () => unwrap(await TeacherRosterAPI.summary(filter), "Error al cargar el resumen de docentes"),
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
  });
}

export function useNonTitularRosterList(filter: NonTitularRosterFilter, page: number, pageSize: number) {
  return useQuery<PagedResult<NonTitularRosterItemDto>>({
    queryKey: ["teacher-roster", "non-titular", "list", filter, page, pageSize],
    queryFn: async () => unwrap(await NonTitularRosterAPI.list(filter, page, pageSize), "Error al cargar los docentes no titulares"),
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
  });
}

export function useNonTitularRosterSummary(filter: NonTitularRosterFilter) {
  return useQuery<NonTitularRosterSummaryDto>({
    queryKey: ["teacher-roster", "non-titular", "summary", filter],
    queryFn: async () => unwrap(await NonTitularRosterAPI.summary(filter), "Error al cargar el resumen de docentes no titulares"),
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
  });
}
