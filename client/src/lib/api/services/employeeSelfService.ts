// src/lib/api/services/employeeSelfService.ts
/**
 * Autoservicio del empleado. Todos los endpoints resuelven el EmployeeId desde el
 * usuario autenticado en el backend — ninguno acepta un EmployeeId editable.
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type {
  EmployeeSelfServiceProfile,
  EmployeeSelfServiceSummary,
  EmployeeSelfServiceHistoryEntry,
  EmployeeSelfServicePermission,
  EmployeeSelfServiceVacation,
  EmployeeCertificateDetail,
  PagedEmployeeCertificateResult,
  CreateEmployeeCertificateRequest,
  EmployeeInternalRequestDetail,
  PagedEmployeeInternalRequestResult,
  CreateEmployeeInternalRequest,
  UpdateEmployeeInternalRequest,
  CancelEmployeeInternalRequest,
} from '@/types/employee-self-service';

const SELF_SERVICE_BASE = '/api/v1/rh/employee-self-service';
const CERTIFICATES_BASE = '/api/v1/rh/employee-self-service/certificates';
const INTERNAL_REQUESTS_BASE = '/api/v1/rh/employee-self-service/internal-requests';

function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `?${qs}` : '';
}

export const EmployeeSelfServiceAPI = {
  getProfile: (): Promise<ApiResponse<EmployeeSelfServiceProfile>> =>
    apiFetch<EmployeeSelfServiceProfile>(`${SELF_SERVICE_BASE}/profile`),

  getSummary: (): Promise<ApiResponse<EmployeeSelfServiceSummary>> =>
    apiFetch<EmployeeSelfServiceSummary>(`${SELF_SERVICE_BASE}/summary`),

  getHistory: (): Promise<ApiResponse<EmployeeSelfServiceHistoryEntry[]>> =>
    apiFetch<EmployeeSelfServiceHistoryEntry[]>(`${SELF_SERVICE_BASE}/history`),

  getMyPermissions: (): Promise<ApiResponse<EmployeeSelfServicePermission[]>> =>
    apiFetch<EmployeeSelfServicePermission[]>(`${SELF_SERVICE_BASE}/permissions`),

  getMyVacations: (): Promise<ApiResponse<EmployeeSelfServiceVacation[]>> =>
    apiFetch<EmployeeSelfServiceVacation[]>(`${SELF_SERVICE_BASE}/vacations`),
};

export const EmployeeCertificatesAPI = {
  createMy: (payload: CreateEmployeeCertificateRequest): Promise<ApiResponse<EmployeeCertificateDetail>> =>
    apiFetch<EmployeeCertificateDetail>(`${CERTIFICATES_BASE}/my`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMy: (filter?: { status?: string; page?: number; pageSize?: number }): Promise<ApiResponse<PagedEmployeeCertificateResult>> =>
    apiFetch<PagedEmployeeCertificateResult>(`${CERTIFICATES_BASE}/my${toQuery(filter ?? {})}`),

  getMyById: (id: number): Promise<ApiResponse<EmployeeCertificateDetail>> =>
    apiFetch<EmployeeCertificateDetail>(`${CERTIFICATES_BASE}/my/${id}`),

  downloadMy: (id: number): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`${CERTIFICATES_BASE}/my/${id}/download`),
};

export const EmployeeInternalRequestsAPI = {
  createMy: (payload: CreateEmployeeInternalRequest): Promise<ApiResponse<EmployeeInternalRequestDetail>> =>
    apiFetch<EmployeeInternalRequestDetail>(`${INTERNAL_REQUESTS_BASE}/my`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMy: (filter?: { requestType?: string; status?: string; page?: number; pageSize?: number }): Promise<ApiResponse<PagedEmployeeInternalRequestResult>> =>
    apiFetch<PagedEmployeeInternalRequestResult>(`${INTERNAL_REQUESTS_BASE}/my${toQuery(filter ?? {})}`),

  getMyById: (id: number): Promise<ApiResponse<EmployeeInternalRequestDetail>> =>
    apiFetch<EmployeeInternalRequestDetail>(`${INTERNAL_REQUESTS_BASE}/my/${id}`),

  updateMy: (id: number, payload: UpdateEmployeeInternalRequest): Promise<ApiResponse<EmployeeInternalRequestDetail>> =>
    apiFetch<EmployeeInternalRequestDetail>(`${INTERNAL_REQUESTS_BASE}/my/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  cancelMy: (id: number, payload: CancelEmployeeInternalRequest): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${INTERNAL_REQUESTS_BASE}/my/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
