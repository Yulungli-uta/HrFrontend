/**
 * Archivo: src/lib/api/services/catalogs.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Bloque funcional de catalogos maestros y geografia reutilizable.
 * - Se excluyen los catalogos relacionales de contrato y curriculum porque ya fueron
 *   agrupados en contracts.ts y cv.ts para facilitar revision funcional.
 */

// src/lib/api/services/geo.ts

/**
 * APIs de catálogos y datos de referencia
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
import type { PagedResult } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';

// =============================================================================
// DTOs de Tipos de Referencia
// =============================================================================

export interface RefType {
  id?: number;
  typeID: number;
  typeId?: number;
  category?: string;
  code?: string;
  name: string;
  description: string;
  metadata?: string | null;
  siiesLabel?: string | null;
  sortOrder?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export const TiposReferenciaAPI = {
  ...createCrudService<any, any>('/api/v1/rh/ref/types'),

  byCategory: (category: string): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/ref/types/category/${category}`),
};


// =============================================================================
// API de Países
// =============================================================================

export const PaisesAPI = createCrudService<any, any>('/api/v1/rh/geo/countries');

// =============================================================================
// API de Provincias
// =============================================================================

export const ProvinciasAPI = {
  ...createCrudService<any, any>('/api/v1/rh/geo/provinces'),

  getByCountry: (countryId: string | number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/geo/provinces/country/${countryId}`),

  /** Búsqueda paginada por nombre, con filtro opcional por país. */
  listPagedFiltered: (params: { page: number; pageSize: number; search?: string; countryId?: string }): Promise<ApiResponse<PagedResult<any>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    if (params.countryId) qs.set('countryId', params.countryId);
    return apiFetch<PagedResult<any>>(`/api/v1/rh/geo/provinces/paged?${qs.toString()}`);
  },
};

// =============================================================================
// API de Cantones
// =============================================================================

export const CantonesAPI = {
  ...createCrudService<any, any>('/api/v1/rh/geo/cantons'),

  getByProvince: (provinceId: string | number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/geo/cantons/province/${provinceId}`),

  /**
   * Búsqueda paginada por nombre, con filtro opcional por provincia.
   * No usar `list()`: el backend ya no lista todos los cantones (el catálogo tiene decenas de miles de filas).
   */
  listPagedFiltered: (params: { page: number; pageSize: number; search?: string; provinceId?: string }): Promise<ApiResponse<PagedResult<any>>> => {
    const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    if (params.provinceId) qs.set('provinceId', params.provinceId);
    return apiFetch<PagedResult<any>>(`/api/v1/rh/geo/cantons/paged?${qs.toString()}`);
  },
};

// =============================================================================
// DTOs de Escalafón Docente
// =============================================================================

export interface AcademicLadderDto {
  ladderId: number;
  code: string;
  name: string;
  categoryTypeId: number | null;
  categoryName: string | null;
  levelTypeId: number | null;
  levelName: string | null;
  dedicationTypeId: number | null;
  dedicationName: string | null;
  baseRmu: number | null;
  sequence: number;
  nextLadderId: number | null;
  nextLadderName: string | null;
  minYearsService: number | null;
  isActive: boolean;
  isTitular: boolean;
  /** Docentes con estructura docente activa asignada a este escalón. */
  activeTeachers?: number;
}

export interface AcademicLadderCreateDto {
  code: string;
  name: string;
  categoryTypeId?: number | null;
  levelTypeId?: number | null;
  dedicationTypeId?: number | null;
  baseRmu?: number | null;
  sequence: number;
  nextLadderId?: number | null;
  minYearsService?: number | null;
}

export interface AcademicLadderUpdateDto {
  name: string;
  categoryTypeId?: number | null;
  levelTypeId?: number | null;
  dedicationTypeId?: number | null;
  baseRmu?: number | null;
  sequence: number;
  nextLadderId?: number | null;
  minYearsService?: number | null;
  isActive: boolean;
}

export const AcademicLadderAPI = {
  getAll: (): Promise<ApiResponse<AcademicLadderDto[]>> =>
    apiFetch<AcademicLadderDto[]>('/api/v1/rh/academic-ladder'),

  getById: (id: number): Promise<ApiResponse<AcademicLadderDto>> =>
    apiFetch<AcademicLadderDto>(`/api/v1/rh/academic-ladder/${id}`),

  getNext: (id: number): Promise<ApiResponse<AcademicLadderDto | null>> =>
    apiFetch<AcademicLadderDto | null>(`/api/v1/rh/academic-ladder/${id}/next`),

  create: (dto: AcademicLadderCreateDto): Promise<ApiResponse<AcademicLadderDto>> =>
    apiFetch<AcademicLadderDto>('/api/v1/rh/academic-ladder', { method: 'POST', body: JSON.stringify(dto) }),

  update: (id: number, dto: AcademicLadderUpdateDto): Promise<ApiResponse<AcademicLadderDto>> =>
    apiFetch<AcademicLadderDto>(`/api/v1/rh/academic-ladder/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
};
