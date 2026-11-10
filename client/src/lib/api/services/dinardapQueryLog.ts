/**
 * Archivo: src/lib/api/services/dinardapQueryLog.ts
 *
 * Auditoría de consultas a DINARDAP hechas desde HrBackend: quién consultó (usuario o proceso del sistema), qué paquete,
 * a qué identificación (siempre enmascarada por el servidor), cuándo y con qué resultado. Requiere el permiso AUDIT.READ.
 */
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedResult } from '../core/pagination';

export type DinardapPackage = 'REGISTRO_CIVIL' | 'TITULOS' | 'TCE';
export type DinardapOrigin = 'USER' | 'SYSTEM';
export type DinardapOutcome = 'OK' | 'UNAVAILABLE' | 'FORBIDDEN';

export interface DinardapQueryLogItem {
  id: number;
  /** Hora de Ecuador sin zona (datetime del servidor). */
  queriedAt: string;
  origin: DinardapOrigin;
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  employeeId: number | null;
  package: DinardapPackage;
  /** Identificación consultada, enmascarada (p. ej. 171*****39). */
  identificationMasked: string;
  outcome: DinardapOutcome;
  durationMs: number | null;
  sourceIp: string | null;
  context: string | null;
}

export interface DinardapQueryLogFilters {
  /** "yyyy-MM-dd" */
  from?: string;
  /** "yyyy-MM-dd" */
  to?: string;
  /** Correo o nombre del usuario. */
  user?: string;
  package?: DinardapPackage | '';
  origin?: DinardapOrigin | '';
  outcome?: DinardapOutcome | '';
  page: number;
  pageSize: number;
}

const BASE = '/api/v1/rh/dinardap-query-log';

export const DinardapQueryLogAPI = {
  /** Listado paginado, de la consulta más reciente a la más antigua. */
  search: (filters: DinardapQueryLogFilters): Promise<ApiResponse<PagedResult<DinardapQueryLogItem>>> => {
    const qs = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
    if (filters.from) qs.set('from', filters.from);
    if (filters.to) qs.set('to', filters.to);
    if (filters.user?.trim()) qs.set('user', filters.user.trim());
    if (filters.package) qs.set('package', filters.package);
    if (filters.origin) qs.set('origin', filters.origin);
    if (filters.outcome) qs.set('outcome', filters.outcome);
    return apiFetch<PagedResult<DinardapQueryLogItem>>(`${BASE}?${qs.toString()}`);
  },
};
