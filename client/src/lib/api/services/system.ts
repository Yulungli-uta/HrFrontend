/**
 * Archivo: src/lib/api/services/system.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Archivo conservado dentro del bloque funcional correspondiente.
 * - Se mantiene la implementacion original y solo se agrega esta cabecera descriptiva
 *   para facilitar ubicacion y revision del servicio.
 */

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
