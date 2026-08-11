// src/lib/api/services/employeeLaborRegimes.ts
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

const BASE_PATH = '/api/v1/rh/employee-labor-regimes';

export interface EmployeeLaborRegimeDto {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  employeeEmail?: string | null;
  laborRegimeId: number;
  laborRegimeName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  jobId?: number | null;
  jobName?: string | null;
  isIndefinite: boolean;
  documentType: 'CONTRACT' | 'PERSONNEL_ACTION' | 'MIGRATION' | string;
  documentNumber?: string | null;
  sourceContractId?: number | null;
  sourcePersonnelActionId?: number | null;
  effectiveFrom: string; // ISO date "YYYY-MM-DD"
  effectiveTo?: string | null;
  isActive: boolean;
  isPrincipal: boolean;
  /** SIIES INGRESO_POR_CONCURSO. Null/undefined = sin clasificar todavía. */
  ingresoPorConcurso?: boolean | null;
}

export interface EmployeeLaborRegimeCreateDto {
  employeeId: number;
  laborRegimeId: number;
  departmentId?: number | null;
  jobId?: number | null;
  isIndefinite: boolean;
  documentType: string;
  documentNumber?: string | null;
  sourceContractId?: number | null;
  sourcePersonnelActionId?: number | null;
  effectiveFrom: string;
  /** SIIES INGRESO_POR_CONCURSO. Opcional; puede completarse después con setIngresoPorConcurso. */
  ingresoPorConcurso?: boolean | null;
}

export interface EmployeeLaborRegimeCloseDto {
  effectiveTo: string;
}

export interface EmployeeLaborRegimeIngresoPorConcursoDto {
  ingresoPorConcurso: boolean;
}

function jsonBody<T>(data: T): { body: string } {
  return { body: JSON.stringify(data) };
}

export const EmployeeLaborRegimesAPI = {
  byEmployee: (employeeId: number): Promise<ApiResponse<EmployeeLaborRegimeDto[]>> =>
    apiFetch<EmployeeLaborRegimeDto[]>(`${BASE_PATH}/by-employee/${employeeId}`, { method: 'GET' }),

  create: (data: EmployeeLaborRegimeCreateDto): Promise<ApiResponse<EmployeeLaborRegimeDto>> =>
    apiFetch<EmployeeLaborRegimeDto>(BASE_PATH, {
      method: 'POST',
      ...jsonBody(data),
    }),

  close: (id: number, data: EmployeeLaborRegimeCloseDto): Promise<ApiResponse<EmployeeLaborRegimeDto>> =>
    apiFetch<EmployeeLaborRegimeDto>(`${BASE_PATH}/${id}/close`, {
      method: 'POST',
      ...jsonBody(data),
    }),

  setIngresoPorConcurso: (
    id: number,
    data: EmployeeLaborRegimeIngresoPorConcursoDto
  ): Promise<ApiResponse<EmployeeLaborRegimeDto>> =>
    apiFetch<EmployeeLaborRegimeDto>(`${BASE_PATH}/${id}/ingreso-por-concurso`, {
      method: 'POST',
      ...jsonBody(data),
    }),
} as const;
