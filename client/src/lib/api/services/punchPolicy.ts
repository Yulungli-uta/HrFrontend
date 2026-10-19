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
  PunchPolicyItem,
  PunchPolicySave,
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

  policies: (params: { search?: string; onlyEffective?: boolean; page?: number; pageSize?: number }): Promise<ApiResponse<PagedResult<PunchPolicyItem>>> =>
    apiFetch<PagedResult<PunchPolicyItem>>(`${BASE}/policies${toQuery(params)}`),
  savePolicy: (employeeId: number, data: PunchPolicySave): Promise<ApiResponse<PunchPolicyItem>> =>
    apiFetch<PunchPolicyItem>(`${BASE}/policies/${employeeId}`, { method: 'PUT', ...json(data) }),
  deletePolicy: (employeeId: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/policies/${employeeId}`, { method: 'DELETE' }),

  log: (params: { from?: string; to?: string; employeeId?: number; result?: string; page?: number; pageSize?: number }): Promise<ApiResponse<PagedResult<PunchAccessLogItem>>> =>
    apiFetch<PagedResult<PunchAccessLogItem>>(`${BASE}/log${toQuery(params)}`),

  settings: (): Promise<ApiResponse<PunchSettings>> => apiFetch<PunchSettings>(`${BASE}/settings`),
  setMode: (mode: PunchNetworkMode): Promise<ApiResponse<PunchSettings>> =>
    apiFetch<PunchSettings>(`${BASE}/settings`, { method: 'PUT', ...json({ mode }) }),
};
