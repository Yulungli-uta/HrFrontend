// src/lib/api/services/userAccessScopes.ts
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

function jsonBody<T>(data: T): { body: string } {
  return { body: JSON.stringify(data) };
}

export interface UserAccessScopeDto {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  employeeEmail?: string | null;
  moduleTypeId: number;
  moduleTypeName?: string | null;
  scopeTypeId: number;
  scopeTypeName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  isActive: boolean;
  assignedAt: string;
  expiresAt?: string | null;
  assignedBy?: string | null;
  reason?: string | null;
}

export interface UserAccessScopeCreateDto {
  employeeId: number;
  moduleTypeId: number;
  scopeTypeId: number;
  departmentId?: number | null;
  expiresAt?: string | null;
  reason?: string | null;
}

export interface UserAccessScopeUpdateDto {
  scopeTypeId: number;
  departmentId?: number | null;
  expiresAt?: string | null;
  reason?: string | null;
}

export interface UserAccessScopeHistoryDto {
  id: number;
  employeeId: number;
  moduleTypeId: number;
  changeType: 'Assigned' | 'Modified' | 'Removed' | string;
  previousScopeTypeId?: number | null;
  previousDepartmentId?: number | null;
  newScopeTypeId?: number | null;
  newDepartmentId?: number | null;
  changedBy: string;
  changeReason?: string | null;
  changeDateTime: string;
}

export const UserAccessScopesAPI = {
  list: (): Promise<ApiResponse<UserAccessScopeDto[]>> =>
    apiFetch<UserAccessScopeDto[]>('/api/v1/rh/user-access-scopes', { method: 'GET' }),

  create: (data: UserAccessScopeCreateDto): Promise<ApiResponse<UserAccessScopeDto>> =>
    apiFetch<UserAccessScopeDto>('/api/v1/rh/user-access-scopes', {
      method: 'POST',
      ...jsonBody(data),
    }),

  update: (id: number, data: UserAccessScopeUpdateDto): Promise<ApiResponse<UserAccessScopeDto>> =>
    apiFetch<UserAccessScopeDto>(`/api/v1/rh/user-access-scopes/${id}`, {
      method: 'PUT',
      ...jsonBody(data),
    }),

  remove: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/rh/user-access-scopes/${id}`, { method: 'DELETE' }),

  history: (employeeId: number): Promise<ApiResponse<UserAccessScopeHistoryDto[]>> =>
    apiFetch<UserAccessScopeHistoryDto[]>(`/api/v1/rh/user-access-scopes/history/${employeeId}`, { method: 'GET' }),
} as const;
