// src/lib/api/services/punchPolicy.ts
/**
 * Control de picadas por red: redes del campus, permisos de picada externa por empleado,
 * registro y modo de operación. El backend decide siempre; la UI solo administra.
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';
import type { PagedResult } from '../core/pagination';
import type {
  PunchAccessInfo,
  PunchAccessLogItem,
  PunchIpCheck,
  PunchNetwork,
  PunchNetworkMode,
  PunchNetworkSave,
  PunchPolicyBatchResult,
  PunchPolicyCreate,
  PunchPolicyDepartmentCreate,
  PunchPolicyGlobalCreate,
  PunchPolicyDepartmentPreview,
  PunchPolicyItem,
  PunchSettings,
} from '@/types/punchPolicy';

const BASE = '/api/v1/rh/attendance/punch-access';

function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `?${qs}` : '';
}

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const PunchPolicyAPI = {
  myAccess: (): Promise<ApiResponse<PunchAccessInfo>> => apiFetch<PunchAccessInfo>(`${BASE}/me`),

  networks: (): Promise<ApiResponse<PunchNetwork[]>> => apiFetch<PunchNetwork[]>(`${BASE}/networks`),
  createNetwork: (data: PunchNetworkSave): Promise<ApiResponse<PunchNetwork>> =>
    apiFetch<PunchNetwork>(`${BASE}/networks`, { method: 'POST', ...json(data) }),
  updateNetwork: (id: number, data: PunchNetworkSave): Promise<ApiResponse<PunchNetwork>> =>
    apiFetch<PunchNetwork>(`${BASE}/networks/${id}`, { method: 'PUT', ...json(data) }),
  deleteNetwork: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/networks/${id}`, { method: 'DELETE' }),
  checkIp: (ip: string): Promise<ApiResponse<PunchIpCheck>> =>
    apiFetch<PunchIpCheck>(`${BASE}/check${toQuery({ ip })}`),

  policies: (params: { search?: string; onlyEffective?: boolean; employeeId?: number; batchId?: string; page?: number; pageSize?: number }): Promise<ApiResponse<PagedResult<PunchPolicyItem>>> =>
    apiFetch<PagedResult<PunchPolicyItem>>(`${BASE}/policies${toQuery(params)}`),
  createPolicy: (data: PunchPolicyCreate): Promise<ApiResponse<PunchPolicyItem>> =>
    apiFetch<PunchPolicyItem>(`${BASE}/policies`, { method: 'POST', ...json(data) }),
  createGlobalPolicy: (data: PunchPolicyGlobalCreate): Promise<ApiResponse<PunchPolicyItem>> =>
    apiFetch<PunchPolicyItem>(`${BASE}/policies/global`, { method: 'POST', ...json(data) }),
  previewDepartmentPolicies: (params: { departmentId: number; includeChildren: boolean; validFrom?: string | null; validTo?: string | null }): Promise<ApiResponse<PunchPolicyDepartmentPreview>> =>
    apiFetch<PunchPolicyDepartmentPreview>(`${BASE}/policies/department-preview${toQuery(params)}`),
  createDepartmentPolicies: (data: PunchPolicyDepartmentCreate): Promise<ApiResponse<PunchPolicyBatchResult>> =>
    apiFetch<PunchPolicyBatchResult>(`${BASE}/policies/department`, { method: 'POST', ...json(data) }),
  revokePolicy: (policyId: number, reason?: string): Promise<ApiResponse<PunchPolicyItem>> =>
    apiFetch<PunchPolicyItem>(`${BASE}/policies/${policyId}/revoke`, { method: 'POST', ...json({ reason }) }),
  revokeBatch: (batchId: string, reason?: string): Promise<ApiResponse<{ revoked: number }>> =>
    apiFetch<{ revoked: number }>(`${BASE}/policies/batch/${batchId}/revoke`, { method: 'POST', ...json({ reason }) }),

  log: (params: { from?: string; to?: string; employeeId?: number; result?: string; page?: number; pageSize?: number }): Promise<ApiResponse<PagedResult<PunchAccessLogItem>>> =>
    apiFetch<PagedResult<PunchAccessLogItem>>(`${BASE}/log${toQuery(params)}`),

  settings: (): Promise<ApiResponse<PunchSettings>> => apiFetch<PunchSettings>(`${BASE}/settings`),
  setMode: (mode: PunchNetworkMode): Promise<ApiResponse<PunchSettings>> =>
    apiFetch<PunchSettings>(`${BASE}/settings`, { method: 'PUT', ...json({ mode }) }),
};
