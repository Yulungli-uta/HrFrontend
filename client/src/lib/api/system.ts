/**
 * APIs de sistema, salud y auditoría
 */

import { apiFetch, createCrudService } from './client';
import type { ApiResponse } from './client';
import type { Publication, InsertPublication } from '@shared/schema';

// =============================================================================
// API de Health Check
// =============================================================================

export const HealthAPI = {
  check: (): Promise<ApiResponse<{ status: string }>> => 
    apiFetch<{ status: string }>('/health')
};

// =============================================================================
// API de Sistema
// =============================================================================

export interface StatsResponse {
  totalUsers: number;
  activeSessions: number;
  failedAttempts: number;
}

export const SistemaAPI = {
  getStats: (): Promise<ApiResponse<StatsResponse>> =>
    apiFetch<StatsResponse>('/api/system/stats'),

  health: (): Promise<ApiResponse<{ status: string }>> =>
    apiFetch<{ status: string }>('/api/system/health')
};

// =============================================================================
// API de Auditoría
// =============================================================================

export const AuditoriaAPI = createCrudService<any, any>('/api/v1/rh/audit');

// =============================================================================
// API de Publicaciones
// =============================================================================

export const PublicacionesAPI = createCrudService<Publication, InsertPublication>('/api/v1/rh/publications');
