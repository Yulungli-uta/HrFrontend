// src/lib/api/services/salaryHistory.ts

/**
 * API de historial salarial (HR.tbl_SalaryHistory)
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

export const SalaryHistoryAPI = {
  /**
   * Resuelve el RMU de referencia para prellenar "RMU Origen"/"RMU Destino" en Acciones de
   * Personal. Prioridad en el backend: último SalaryHistory real del empleado > ReferenceSalary
   * del cargo > RMU del grupo ocupacional. Al menos uno de los dos parámetros es requerido.
   */
  getReferenceRmu: (params: { employeeId?: number; jobId?: number }): Promise<ApiResponse<{ rmu: number | null }>> => {
    const query = new URLSearchParams();
    if (params.employeeId) query.set('employeeId', String(params.employeeId));
    if (params.jobId) query.set('jobId', String(params.jobId));
    return apiFetch<{ rmu: number | null }>(`/api/v1/rh/salary-history/reference-rmu?${query.toString()}`);
  },
};
