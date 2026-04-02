// src/lib/api/services/system.ts

/**
 * APIs de sistema, salud y auditoría
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';

// =============================================================================
// API de Health Check
// =============================================================================

export const HealthAPI = {
  check: (): Promise<ApiResponse<{ status: string }>> =>
    apiFetch<{ status: string }>('/health'),
};

// =============================================================================
// DTOs de Sistema
// =============================================================================

export interface StatsResponse {
  totalUsers: number;
  activeSessions: number;
  failedAttempts: number;
}

// =============================================================================
// API de Sistema
// =============================================================================

export const SistemaAPI = {
  info: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/'),

  health: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/health'),
};

// =============================================================================
// API de Auditoría
// =============================================================================

export const AuditoriaAPI = createCrudService<any, any>('/api/v1/rh/audit');
