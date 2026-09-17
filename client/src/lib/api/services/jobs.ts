import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

export interface ContractExpirationResult {
  success: boolean;
  message: string;
  processed: number;
}

export interface StudentEnrollmentSyncResult {
  success: boolean;
  message: string;
  provisioned: number;
  disabled: number;
}

export interface DinardapSenescytBulkSyncResult {
  personasProcesadas: number;
  personasConError: number;
  titulosCreadosTotal: number;
  titulosOmitidosTotal: number;
}

export interface DinardapSenescytSyncOneResult {
  personId: number;
  titulosCreados: number;
  titulosOmitidos: number;
  requierenRevision: number;
}

export interface DinardapSenescytSyncResponse {
  success: boolean;
  message: string;
  bulkResult?: DinardapSenescytBulkSyncResult;
  resultado?: DinardapSenescytSyncOneResult;
}

export const ScheduledJobsAPI = {
  runContractExpiration: (): Promise<ApiResponse<ContractExpirationResult>> =>
    apiFetch<ContractExpirationResult>(
      '/api/v1/rh/scheduled-jobs/contract-expiration/run',
      { method: 'POST' },
    ),

  runStudentEnrollmentSync: (
    periodCode: string,
    previousPeriod?: string,
  ): Promise<ApiResponse<StudentEnrollmentSyncResult>> => {
    const params = new URLSearchParams({ periodCode });
    if (previousPeriod) params.append('previousPeriod', previousPeriod);
    return apiFetch<StudentEnrollmentSyncResult>(
      `/api/v1/rh/scheduled-jobs/student-enrollment/run?${params.toString()}`,
      { method: 'POST' },
    );
  },

  /**
   * Sincronización SENESCYT/DINARDAP manual. Sin personId, recorre todos los empleados
   * activos; con personId, sincroniza solo esa persona.
   */
  runDinardapSenescytSync: (personId?: number): Promise<ApiResponse<DinardapSenescytSyncResponse>> => {
    const qs = personId != null ? `?personId=${personId}` : '';
    return apiFetch<DinardapSenescytSyncResponse>(
      `/api/v1/rh/scheduled-jobs/dinardap-senescyt-sync/run${qs}`,
      { method: 'POST' },
    );
  },
};
