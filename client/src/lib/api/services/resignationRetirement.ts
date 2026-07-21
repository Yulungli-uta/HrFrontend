// src/lib/api/services/resignationRetirement.ts
/**
 * API de solicitudes de renuncia y jubilación.
 * El EmployeeId siempre lo resuelve el backend desde el usuario autenticado —
 * ningún método de este servicio permite indicar un EmployeeId distinto.
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type {
  ApproveResignationRetirementRequest,
  CancelResignationRetirementRequest,
  CreateResignationRetirementRequest,
  EmployeeConsolidatedInfo,
  PagedResignationRetirementResult,
  ResignationRetirementDetail,
  ResignationRetirementQueryFilter,
  ResignationRetirementStatusHistoryEntry,
  ReviewResignationRetirementRequest,
  UpdateResignationRetirementRequest,
} from '@/types/resignation-retirement';

const BASE = '/api/v1/rh/resignation-retirement-requests';

function buildQuery(filter?: ResignationRetirementQueryFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams(
    Object.entries(filter)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)])
  );
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const ResignationRetirementAPI = {
  // ── Mis solicitudes (solicitante) ─────────────────────────────────────────
  getCurrentEmployeeInfo: (): Promise<ApiResponse<EmployeeConsolidatedInfo>> =>
    apiFetch<EmployeeConsolidatedInfo>(`${BASE}/current-employee-info`),

  createMy: (
    payload: CreateResignationRetirementRequest
  ): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/my`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMy: (
    filter?: ResignationRetirementQueryFilter
  ): Promise<ApiResponse<PagedResignationRetirementResult>> =>
    apiFetch<PagedResignationRetirementResult>(`${BASE}/my${buildQuery(filter)}`),

  getMyById: (id: number): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/my/${id}`),

  updateMy: (
    id: number,
    payload: UpdateResignationRetirementRequest
  ): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/my/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  cancelMy: (id: number, payload: CancelResignationRetirementRequest): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/my/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateMyDocument: (id: number): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/my/${id}/generate-document`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  downloadMyDocument: (id: number): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`${BASE}/my/${id}/download-document`),

  // ── Recursos Humanos (revisión) ───────────────────────────────────────────
  getPaged: (
    filter?: ResignationRetirementQueryFilter
  ): Promise<ApiResponse<PagedResignationRetirementResult>> =>
    apiFetch<PagedResignationRetirementResult>(`${BASE}${buildQuery(filter)}`),

  getById: (id: number): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/${id}`),

  approve: (
    id: number,
    payload: ApproveResignationRetirementRequest
  ): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reject: (
    id: number,
    payload: ReviewResignationRetirementRequest
  ): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  return: (
    id: number,
    payload: ReviewResignationRetirementRequest
  ): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancel: (
    id: number,
    payload: CancelResignationRetirementRequest
  ): Promise<ApiResponse<ResignationRetirementDetail>> =>
    apiFetch<ResignationRetirementDetail>(`${BASE}/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  history: (id: number): Promise<ApiResponse<ResignationRetirementStatusHistoryEntry[]>> =>
    apiFetch<ResignationRetirementStatusHistoryEntry[]>(`${BASE}/${id}/history`),

  downloadDocument: (id: number): Promise<ApiResponse<Blob>> =>
    apiFetch<Blob>(`${BASE}/${id}/download-document`),
};
