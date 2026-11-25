import { apiFetch, type ApiResponse } from '../core/fetch';

/** Posición vigente de un empleado: principal, segundo régimen (doble régimen), autoridad o temporal. */
export interface EmployeePosition {
  employeeId: number;
  personId: number;
  idCard?: string | null;
  fullName?: string | null;
  positionType: 'Principal' | 'Segundo régimen' | 'Autoridad' | 'Temporal' | string;
  laborRegimeId?: number | null;
  laborRegimeName?: string | null;
  jobId?: number | null;
  jobName?: string | null;
  /** Cargo sin la dedicación. */
  jobBaseName?: string | null;
  /** De dónde salió el cargo: FILA, TIPO_DE_CONTRATO, ESTRUCTURA_DOCENTE o FICHA. */
  jobSource?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  dedicationCode?: string | null;
  dedicationName?: string | null;
  dedicationSource?: string | null;
  modalityName?: string | null;
  contractedHours?: number | null;
  documentNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

const BASE = '/api/v1/rh/employee-positions';

export const EmployeePositionsAPI = {
  /** Posiciones vigentes de un empleado. */
  getByEmployee: (employeeId: number): Promise<ApiResponse<EmployeePosition[]>> =>
    apiFetch<EmployeePosition[]>(`${BASE}/by-employee/${employeeId}`),

  /** Posiciones vigentes de varios empleados (los de la página visible; máximo 200). */
  getByEmployees: (employeeIds: number[]): Promise<ApiResponse<EmployeePosition[]>> =>
    apiFetch<EmployeePosition[]>(`${BASE}?employeeIds=${employeeIds.join(',')}`),
};
