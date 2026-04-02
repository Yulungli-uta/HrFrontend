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
  paymentAmount?: number;
  isEligible?: boolean;
  eligibilityReason?: string;
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

  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/employee/${employeeId}`),

  getByStatus: (statusTypeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/timePlannings/status/${statusTypeId}`),
};

// =============================================================================
// API de Empleados en Planificación
// =============================================================================

export const TimePlanningEmployeesAPI = {
  getByPlan: (planId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/by-plan/${planId}`),

  getById: (planId: number, id: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/${planId}/${id}`),

  update: (
    planId: number,
    id: number,
    data: TimePlanningEmployeeUpdateDTO
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees/${planId}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (planId: number, id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/rh/planning/employees/${planId}/${id}`, {
      method: 'DELETE',
    }),

  addEmployee: (
    planId: number,
    data: TimePlanningEmployeeCreateDTO
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/planning/employees?planId=${planId}`, {
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
