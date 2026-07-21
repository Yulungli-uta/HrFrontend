/**
 * API de parametrización de requisitos documentales por trámite.
 * Backend: Controllers/HR/TramiteRequirementsController.cs
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

export interface AccessibleModuleDto {
  moduleTypeId: number;
  moduleTypeName: string;
  moduleTypeDescription?: string | null;
}

export interface TramiteRequirementDto {
  requirementId: number;
  moduleTypeId: number;
  moduleTypeName?: string | null;
  specificTypeId?: number | null;
  documentTypeId: number;
  documentTypeName?: string | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TramiteRequirementCreateDto {
  moduleTypeId: number;
  specificTypeId?: number | null;
  documentTypeId: number;
  isRequired: boolean;
}

export interface TramiteRequirementUpdateDto {
  isRequired: boolean;
  isActive: boolean;
}

const BASE = '/api/v1/rh/tramite-requirements';

export const TramiteRequirementsAPI = {
  getAccessibleModules: (): Promise<ApiResponse<AccessibleModuleDto[]>> =>
    apiFetch<AccessibleModuleDto[]>(`${BASE}/accessible-modules`),

  getByModule: (moduleTypeId: number): Promise<ApiResponse<TramiteRequirementDto[]>> =>
    apiFetch<TramiteRequirementDto[]>(`${BASE}/module/${moduleTypeId}`),

  /** Lectura abierta (no requiere permiso de catálogo): requisitos aplicables a un módulo/tipo específico. */
  getApplicable: (moduleTypeId: number, specificTypeId?: number | null): Promise<ApiResponse<TramiteRequirementDto[]>> => {
    const qs = new URLSearchParams({ moduleTypeId: String(moduleTypeId) });
    if (specificTypeId != null) qs.append('specificTypeId', String(specificTypeId));
    return apiFetch<TramiteRequirementDto[]>(`${BASE}/applicable?${qs.toString()}`);
  },

  create: (dto: TramiteRequirementCreateDto): Promise<ApiResponse<TramiteRequirementDto>> =>
    apiFetch<TramiteRequirementDto>(BASE, { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: number, dto: TramiteRequirementUpdateDto): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),

  remove: (id: number): Promise<ApiResponse<void>> =>
    apiFetch<void>(`${BASE}/${id}`, { method: 'DELETE' }),
};
