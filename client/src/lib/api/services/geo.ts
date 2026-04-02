// src/lib/api/services/geo.ts

/**
 * APIs de catálogos y datos de referencia
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
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
// API de Cargos
// =============================================================================

export const CargosAPI = createCrudService<any, any>('/api/v1/rh/jobs');

// =============================================================================
// API de Cargos Especializados
// =============================================================================

export const CargosEspecializadosAPI = {
  getActiveJobs: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/jobs/active'),

  searchJobs: (title: string): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/jobs/search?title=${encodeURIComponent(title)}`),
};

// =============================================================================
// API de Instituciones
// =============================================================================

export const InstitucionesAPI = createCrudService<any, any>('/api/v1/rh/cv/institutions');

// =============================================================================
// API de Países
// =============================================================================

export const PaisesAPI = createCrudService<any, any>('/api/v1/rh/geo/countries');

// =============================================================================
// API de Provincias
// =============================================================================

export const ProvinciasAPI = {
  ...createCrudService<any, any>('/api/v1/rh/geo/provinces'),

  getByCountry: (countryId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/geo/provinces/country/${countryId}`),
};

// =============================================================================
// API de Cantones
// =============================================================================

export const CantonesAPI = {
  ...createCrudService<any, any>('/api/v1/rh/geo/cantons'),

  getByProvince: (provinceId: number): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>(`/api/v1/rh/geo/cantons/province/${provinceId}`),
};
