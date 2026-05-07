/**
 * Archivo: src/lib/api/services/cv.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Bloque funcional de hoja de vida, curriculum y expediente personal.
 * - Reune la implementacion original de cv.ts y ademas las APIs relacionales del
 *   expediente que antes estaban dentro de employees.ts y geo.ts.
 * - Este archivo queda como punto unico de revision de curriculum.
 */

// src/lib/api/services/cv.ts

import { createApiService } from '../core/pagination';
import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

const createCrudService = createApiService;
// =============================================================================
// DTOs compartidos
// =============================================================================

export interface AttendanceCalculationRequestDto {
  fromDate: string;
  toDate: string;
  employeeId?: number;
}

// =============================================================================
// API de Justificaciones
// =============================================================================

export const JustificationsAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/justifications'),

  applyJustifications: (
    data: AttendanceCalculationRequestDto
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/justifications/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getByEmployeeId: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/justifications/employeeid/${employeeId}`),

  getByBossId: (bossId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/justifications/bossId/${bossId}`),
};

// =============================================================================
// API de Área de Conocimiento
// =============================================================================

export const AreaConocimientoAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/knowledgeArea'),

  byParentId: (parentId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/cv/knowledgeArea/parentId/${parentId}`),
};

// =============================================================================
// API de Publicaciones
// =============================================================================

export const PublicacionesAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/publications'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/publications/person/${personId}`),
};

// =============================================================================
// API de Niveles Educativos
// =============================================================================

export const NivelesEducativosAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/education-levels'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/education-levels/person/${personId}`),
};

// =============================================================================
// API de Capacitaciones
// =============================================================================

export const CapacitacionesAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/trainings'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/trainings/person/${personId}`),
};

// =============================================================================
// API de Experiencias Laborales
// =============================================================================

export const ExperienciasLaboralesAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/work-experiences'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/work-experiences/person/${personId}`),
};

// =============================================================================
// API de Parámetros de Directorio
// =============================================================================

export const DirectoryParametersAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/directory-parameters'),

  getByCode: (code: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/directory-parameters/by-code/${code}`),
};

// =============================================================================
// API de Parámetros del Sistema
// =============================================================================

export const ParametersAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/parameters'),

  getByName: (name: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/parameters/name/${name}`),
};


export const DireccionesAPI = createApiService<any, any>('/api/v1/rh/cv/addresses');

export const ContactosEmergenciaAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/emergency-contacts'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/emergency-contacts/person/${personId}`),
};

export const CargasFamiliaresAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/family-burden'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/family-burden/person/${personId}`),
};

export const CuentasBancariasAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/bank-accounts'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/bank-accounts/person/${personId}`),
};

export const LibrosAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/books'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/books/person/${personId}`),
};

export const EnfermedadesCatastroficasAPI = {
  ...createApiService<any, any>('/api/v1/rh/cv/catastrophic-illnesses'),

  getByPersonId: (personId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/cv/catastrophic-illnesses/person/${personId}`),
};

// =============================================================================
// API de Instituciones
// =============================================================================

export const InstitucionesAPI = createCrudService<any, any>('/api/v1/rh/cv/institutions');
