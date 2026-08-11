// src/lib/api/services/audit.ts
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { AuditSearchFilter, PagedAuditResult } from '@/types/audit';

const AUDIT_BASE = '/api/v1/rh/audit';

export const AuditAPI = {
  /**
   * Consulta filtrada y paginada de correcciones manuales (Action=CORRECTION) en HR.Audit —
   * usada por la pantalla "Historial de Correcciones". Requiere el permiso AUDIT.READ.
   */
  searchCorrections: (filter?: AuditSearchFilter): Promise<ApiResponse<PagedAuditResult>> => {
    const params = new URLSearchParams();
    if (filter?.tableName) params.set('tableName', filter.tableName);
    if (filter?.recordId) params.set('recordId', filter.recordId);
    if (filter?.userName) params.set('userName', filter.userName);
    if (filter?.dateFrom) params.set('dateFrom', filter.dateFrom);
    if (filter?.dateTo) params.set('dateTo', filter.dateTo);
    params.set('page', String(filter?.page ?? 1));
    params.set('pageSize', String(filter?.pageSize ?? 20));
    return apiFetch<PagedAuditResult>(`${AUDIT_BASE}/search?${params.toString()}`);
  },
};
