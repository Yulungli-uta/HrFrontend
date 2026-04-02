// src/lib/api/services/payroll.ts

/**
 * APIs de contratos, nómina, salarios y actividades
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';
import type {
  Contract, InsertContract,
} from '@/shared/schema';

// =============================================================================
// API de Contratos (con workflow completo)
// =============================================================================

export const ContratosAPI = createCrudService<Contract, InsertContract>('/api/v1/rh/contracts');

export const ContractsRHAPI = {
  ...createCrudService<any, any>('/api/v1/rh/contracts'),

  /**
   * Obtiene los estados siguientes permitidos desde el estado actual
   */
  allowedNextStatuses: (currentStatusTypeId: number): Promise<ApiResponse<number[]>> =>
    apiFetch<number[]>(
      `/api/v1/rh/contracts/status/allowed?currentStatusTypeId=${currentStatusTypeId}`
    ),

  /**
   * Cambia el estado de un contrato
   */
  changeStatus: (
    id: number,
    payload: { toStatusTypeID: number; comment?: string | null }
  ): Promise<ApiResponse<void>> =>
    apiFetch<void>(`/api/v1/rh/contracts/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Obtiene el historial de cambios de estado de un contrato
   */
  history: (
    id: number
  ): Promise<ApiResponse<Array<{
    historyID: number;
    contractID: number;
    statusTypeID: number;
    statusName?: string | null;
    comment?: string | null;
    changedAt: string;
    changedBy?: number | null;
  }>>> =>
    apiFetch(`/api/v1/rh/contracts/${id}/history`),

  /**
   * Obtiene los addendums de un contrato
   */
  addendums: (id: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/contracts/${id}/addendums`),

  /**
   * Alias de get() para compatibilidad con componentes que usan getById()
   */
  getById: (id: string | number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/contracts/${id}`),
};

// =============================================================================
// API de Tipos de Contrato
// =============================================================================

export const ContractTypeAPI = createCrudService<any, any>('/api/v1/rh/contract-type');

// =============================================================================
// API de Solicitudes de Contrato
// =============================================================================

export const ContractRequestAPI = createCrudService<any, any>('/api/v1/rh/cv/contract-request');

// =============================================================================
// API de Historial Salarial
// =============================================================================

export const HistorialSalarialAPI = createCrudService<any, any>('/api/v1/rh/salary-history');

// =============================================================================
// API de Nómina
// =============================================================================

export const NominaAPI = createCrudService<any, any>('/api/v1/rh/payroll');

// =============================================================================
// API de Líneas de Nómina
// =============================================================================

export const LineasNominaAPI = createCrudService<any, any>('/api/v1/rh/payroll-lines');

// =============================================================================
// API de Movimientos de Personal
// =============================================================================

export const MovimientosPersonalAPI = createCrudService<any, any>(
  '/api/v1/rh/personnel-movements'
);

// =============================================================================
// API de Certificación Financiera
// =============================================================================

export const FinancialCertificationAPI = createCrudService<any, any>(
  '/api/v1/rh/financial-certification'
);

// =============================================================================
// API de Actividades
// =============================================================================

export const ActivityAPI = createCrudService<any, any>('/api/v1/rh/activity');

// =============================================================================
// API de Actividades Adicionales
// =============================================================================

export const AdditionalActivityAPI = {
  ...createCrudService<any, any>('/api/v1/rh/additional-activity'),

  getByContractId: (contractId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/additional-activity/contract/${contractId}`),
};

// =============================================================================
// API de Grados / Títulos
// =============================================================================

export const DegreeAPI = createCrudService<any, any>('/api/v1/rh/degree');

// =============================================================================
// API de Actividades de Cargos
// =============================================================================

export const JobActivityAPI = createCrudService<any, any>('/api/v1/rh/job-activity');

// =============================================================================
// API de Grupos Ocupacionales
// =============================================================================

export const OccupationalGroupAPI = createCrudService<any, any>('/api/v1/rh/occupational-group');
