// src/lib/api/services/massVacationPlans.ts
import { createApiService } from '../core/pagination';
import type { PagedResult } from '../core/pagination';
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

/** Código de HR.ref_Types (categoría MASS_VACATION_PLAN_STATUS) — usar para lógica/comparaciones. */
export type MassVacationPlanStatus = 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

export interface MassVacationPlanDto {
  planId: number;
  departmentId: number | null;
  departmentName: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  /** Modo "por horas": con valor, aplica solo esa franja de startDate (formato HH:mm:ss). */
  startTime: string | null;
  endTime: string | null;
  vacationYear: number;
  statusTypeId: number;
  /** Código, ej. "PLANNED" — usar para lógica/comparaciones. */
  status: MassVacationPlanStatus;
  /** Etiqueta en español, ej. "Planificado" — usar solo para mostrar. */
  statusLabel: string;
  totalEmployeesInScope: number;
  totalExcluded: number;
  executedBy: number | null;
  executedAt: string | null;
  createdAt: string | null;
}

export interface MassVacationPlanCreateDto {
  departmentId: number | null;
  description: string | null;
  startDate: string;
  endDate: string;
  /** Modo "por horas": si se especifican, startDate debe ser igual a endDate. */
  startTime: string | null;
  endTime: string | null;
  vacationYear: number;
}

export type MassVacationPlanUpdateDto = MassVacationPlanCreateDto;

export interface MassVacationPlanRosterItemDto {
  employeeId: number;
  idCard: string;
  fullName: string;
  departmentName: string | null;
  isExcluded: boolean;
  exclusionReason: string | null;
}

export interface MassVacationPlanExclusionSetDto {
  employeeId: number;
  isExcluded: boolean;
  reason?: string | null;
}

export interface MassVacationPlanCancelDto {
  reason?: string | null;
}

export interface MassVacationPlanListParams {
  page: number;
  pageSize: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

const BASE = '/api/v1/rh/mass-vacation-plans';

export const MassVacationPlansAPI = {
  ...createApiService<MassVacationPlanDto, MassVacationPlanCreateDto, MassVacationPlanUpdateDto>(BASE),

  /** Listado paginado con búsqueda por descripción y filtro por rango de fechas (solapamiento). */
  listPagedFiltered: (params: MassVacationPlanListParams): Promise<ApiResponse<PagedResult<MassVacationPlanDto>>> => {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params.toDate ? { toDate: params.toDate } : {}),
    });
    return apiFetch<PagedResult<MassVacationPlanDto>>(`${BASE}/paged?${qs.toString()}`);
  },

  getRoster: (planId: number): Promise<ApiResponse<MassVacationPlanRosterItemDto[]>> =>
    apiFetch<MassVacationPlanRosterItemDto[]>(`${BASE}/${planId}/roster`),

  setExclusion: (planId: number, dto: MassVacationPlanExclusionSetDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/${planId}/exclusion`, { method: 'PUT', body: JSON.stringify(dto) }),

  /** Anula un plan mientras está en Planificado. No hay ejecución manual: el paso a
   * En Ejecución/Finalizado ocurre automáticamente por fecha en el backend. */
  cancel: (planId: number, dto?: MassVacationPlanCancelDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/${planId}/cancel`, { method: 'POST', body: JSON.stringify(dto ?? {}) }),

  getApplicableForEmployee: (employeeId: number): Promise<ApiResponse<MassVacationPlanDto[]>> =>
    apiFetch<MassVacationPlanDto[]>(`${BASE}/employee/${employeeId}/applicable`),
};
