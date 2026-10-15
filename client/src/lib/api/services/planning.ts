/**
 * Archivo: src/lib/api/services/planning.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Archivo conservado dentro del bloque funcional correspondiente.
 * - Se mantiene la implementacion original y solo se agrega esta cabecera descriptiva
 *   para facilitar ubicacion y revision del servicio.
 */

// src/lib/api/services/planning.ts

/**
 * APIs de planificación de tiempo
 * TimePlannings, TimePlanningEmployees, TimePlanningExecutions
 * ScheduleChangePlans
 */

import { apiFetch } from '../core/fetch';
import { handleApiError } from '../utils/error-handling';
import { createApiService as createCrudService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';
import { PagedRequest, PagedResult } from '../core/pagination';
import type {
  CreateScheduleChangePlanRequest,
  ScheduleChangePlanResponse,
} from '@/types/sheduleChangePlansType';

// =============================================================================
// DTOs de Planificación de Tiempo
// =============================================================================

export interface TimePlanningEmployeeCreateDTO {
  planID: number;
  employeeID: number;
  employeeStatusTypeID?: number;
  assignedHours?: number;
  assignedMinutes?: number;
  actualHours?: number;
  actualMinutes?: number;
}

export interface TimePlanningEmployeeUpdateDTO {
  planEmployeeID: number;
  actualHours?: number;
  actualMinutes?: number;
  employeeStatusTypeID?: number;
  isEligible?: boolean;
}

export interface TimePlanningExecutionCreateDTO {
  planEmployeeID: number;
  workDate: string;
  startTime: string;
  endTime: string;
  comments?: string;
  verifiedBy?: number;
}

export interface TimePlanningExecutionUpdateDTO {
  executionID: number;
  startTime?: string;
  endTime?: string;
  comments?: string;
  verifiedBy?: number;
  verifiedAt?: string;
}

export interface TimePlanningCreateDTO {
  planType: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  overtimeType?: string;
  factor?: number;
  owedMinutes?: number;
  planStatusTypeID: number;
  createdBy: number;
  requiresApproval: boolean;
  employees?: TimePlanningEmployeeCreateDTO[];
}

// =============================================================================
// API de Planificaciones de Tiempo
// =============================================================================

export const TimePlanningsAPI = {
  ...createCrudService<any, TimePlanningCreateDTO>('/api/v1/rh/planning/timePlannings'),

  /**
   * Obtiene planificaciones creadas por un jefe/responsable.
   * Se expone con ambos nombres para evitar regresiones en consumidores existentes.
   */
  getByCreateBy: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/boss/${employeeId}`),

  /** @alias getByCreateBy — nombre canónico con 'd' final */
  getByCreatedBy: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/boss/${employeeId}`),

  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/employee/${employeeId}`),

  getByStatus: (statusTypeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/status/${statusTypeId}`),
};

// =============================================================================
// API de Empleados en Planificación
// =============================================================================

export const TimePlanningEmployeesAPI = {
  /**
   * Lista todos los empleados de una planificación.
   * GET /planning/employees/by-plan/{planId}
   */
  getByPlan: (planId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/by-plan/${planId}`),

  /**
   * Obtiene un empleado de planificación por su ID.
   * GET /planning/employees/{id}
   * Nota: el backend no incluye planId en esta ruta.
   */
  getById: (id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/${id}`),

  /**
   * Actualiza un empleado en la planificación.
   * PUT /planning/employees/{id}
   * Nota: el backend no incluye planId en esta ruta.
   */
  update: (
    id: number,
    data: TimePlanningEmployeeUpdateDTO
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Elimina un empleado de la planificación.
   * DELETE /planning/employees/{id}
   * Nota: el backend no incluye planId en esta ruta.
   */
  remove: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/rh/planning/employees/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Agrega un empleado a una planificación existente.
   * POST /planning/employees
   * El planID viaja dentro del body (TimePlanningEmployeeCreateDTO.PlanID),
   * no como parámetro de ruta ni query string.
   */
  addEmployee: (
    data: TimePlanningEmployeeCreateDTO
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// API de Ejecuciones de Planificación
// =============================================================================

export const TimePlanningExecutionsAPI = {
  getByPlanEmployee: (planEmployeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions`),

  registerWorkTime: (
    planEmployeeId: number,
    data: TimePlanningExecutionCreateDTO
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getById: (planEmployeeId: number, id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions/${id}`),

  update: (
    planEmployeeId: number,
    id: number,
    data: TimePlanningExecutionUpdateDTO
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/${planEmployeeId}/executions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (planEmployeeId: number, id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/rh/planning/${planEmployeeId}/executions/${id}`, {
      method: 'DELETE',
    }),
};

// =============================================================================
// API de Planes de Cambio de Horario
// =============================================================================

export const ScheduleChangePlansAPI = {
  listPaged: (
    params: PagedRequest
  ): Promise<ApiResponse<PagedResult<ScheduleChangePlanResponse>>> => {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    return apiFetch<PagedResult<ScheduleChangePlanResponse>>(
      `/schedule-change-plans?${qs.toString()}`
    );
  },

  getByBoss: (bossId: number): Promise<ApiResponse<ScheduleChangePlanResponse[]>> =>
    apiFetch<ScheduleChangePlanResponse[]>(`/schedule-change-plans/boss/${bossId}`),

  getById: (id: number): Promise<ApiResponse<ScheduleChangePlanResponse>> =>
    apiFetch<ScheduleChangePlanResponse>(`/schedule-change-plans/${id}`),

  create: async (payload: CreateScheduleChangePlanRequest): Promise<ScheduleChangePlanResponse> => {
    const response = await apiFetch<ScheduleChangePlanResponse>('/schedule-change-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (response.status === 'error') {
      throw new Error(handleApiError(response.error, 'No se pudo crear la planificación.'));
    }
    return response.data;
  },

  approve: async (payload: {
    planID: number;
    approvedByID: number;
    isApproved: boolean;
    rejectionReason?: string | null;
  }): Promise<void> => {
    const response = await apiFetch<void>(
      `/schedule-change-plans/${payload.planID}/approve`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    if (response.status === 'error') {
      throw new Error(handleApiError(response.error, 'No se pudo aprobar o rechazar el plan.'));
    }
  },

  cancel: async (payload: { planID: number; reason: string }): Promise<void> => {
    const response = await apiFetch<void>(
      `/schedule-change-plans/${payload.planID}/cancel`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
    if (response.status === 'error') {
      throw new Error(handleApiError(response.error, 'No se pudo cancelar el plan.'));
    }
  },
};
// =============================================================================
// Consulta de planificaciones para Recursos Humanos (solo lectura, paginada)
// =============================================================================

export interface TimePlanningOverviewFilter {
  page?: number;
  pageSize?: number;
  /** 'Overtime' | 'Recovery' | '' (todos). */
  planType?: string;
  startDate?: string;
  endDate?: string;
  planStatusTypeId?: number;
  employeeStatusTypeId?: number;
  departmentId?: number;
  search?: string;
}

export interface TimePlanningOverviewItem {
  planId: number;
  planType: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  overtimeType?: string | null;
  factor?: number | null;
  planStatusTypeId: number;
  planStatusName: string;
  createdByName: string;
  createdAt?: string | null;
  totalEmployees: number;
  totalAssignedHours: number;
  totalActualHours: number;
}

export interface TimePlanningOverviewEmployee {
  planEmployeeId: number;
  planId: number;
  employeeId: number;
  employeeName: string;
  idCard: string;
  departmentName: string;
  assignedHours?: number | null;
  actualHours?: number | null;
  employeeStatusTypeId: number;
  employeeStatusName: string;
  isEligible: boolean;
  executionCount: number;
  executedOvertimeMinutes: number;
}

export interface TimePlanningOverviewExecution {
  executionId: number;
  workDate: string;
  startTime?: string | null;
  endTime?: string | null;
  totalMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  holidayMinutes: number;
  exceededMinutes: number;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  comments?: string | null;
}

export interface TimePlanningPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

const OVERVIEW_BASE = '/api/v1/rh/planning/overview';

export const TimePlanningOverviewAPI = {
  /** GET /planning/overview — planificaciones paginadas con totales de empleados y horas. */
  getPlans: (
    filter: TimePlanningOverviewFilter
  ): Promise<ApiResponse<TimePlanningPagedResult<TimePlanningOverviewItem>>> => {
    const qs = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      // planType vacío significa "todos" (el backend usa 'Overtime' si el parámetro no viaja).
      if (value === undefined || value === null) return;
      if (value === '' && key !== 'planType') return;
      qs.set(key, String(value));
    });
    return apiFetch<TimePlanningPagedResult<TimePlanningOverviewItem>>(`${OVERVIEW_BASE}?${qs.toString()}`);
  },

  /** GET /planning/overview/employees/{planEmployeeId}/executions — horas trabajadas de un empleado del plan. */
  getEmployeeExecutions: (planEmployeeId: number): Promise<ApiResponse<TimePlanningOverviewExecution[]>> =>
    apiFetch<TimePlanningOverviewExecution[]>(`${OVERVIEW_BASE}/employees/${planEmployeeId}/executions`),

  /** GET /planning/overview/{planId}/employees — empleados de un plan, paginados. */
  getPlanEmployees: (
    planId: number,
    params: { page?: number; pageSize?: number; employeeStatusTypeId?: number; search?: string }
  ): Promise<ApiResponse<TimePlanningPagedResult<TimePlanningOverviewEmployee>>> => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      qs.set(key, String(value));
    });
    return apiFetch<TimePlanningPagedResult<TimePlanningOverviewEmployee>>(
      `${OVERVIEW_BASE}/${planId}/employees?${qs.toString()}`
    );
  },
};
