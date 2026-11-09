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
  /** SIIES RELACION_IES manual (ref_Types SIIES_RELACION_IES). Null = se deriva del documento que respalda el régimen. */
  siiesRelacionIesTypeId?: number | null;
  siiesRelacionIesName?: string | null;
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
  /** SIIES RELACION_IES manual. Opcional; puede completarse después con setSiiesRelacionIes. */
  siiesRelacionIesTypeId?: number | null;
}

export interface EmployeeLaborRegimeCloseDto {
  effectiveTo: string;
}

export interface EmployeeLaborRegimeIngresoPorConcursoDto {
  ingresoPorConcurso: boolean;
}

export interface EmployeeLaborRegimeSiiesRelacionIesDto {
  /** TypeId de ref_Types (SIIES_RELACION_IES); null quita el valor manual y vuelve a derivarse del documento. */
  siiesRelacionIesTypeId: number | null;
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

  setSiiesRelacionIes: (
    id: number,
    data: EmployeeLaborRegimeSiiesRelacionIesDto
  ): Promise<ApiResponse<EmployeeLaborRegimeDto>> =>
    apiFetch<EmployeeLaborRegimeDto>(`${BASE_PATH}/${id}/siies-relacion-ies`, {
      method: 'POST',
      ...jsonBody(data),
    }),
} as const;
