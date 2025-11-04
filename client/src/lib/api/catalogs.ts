/**
 * APIs de catálogos y datos de referencia
 */

import { apiFetch, createCrudService } from './client';
import type { ApiResponse } from './client';

// =============================================================================
// API de Tipos de Referencia
// =============================================================================

export const TiposReferenciaAPI = {
  ...createCrudService<any, any>('/api/v1/rh/ref/types'),
  
  byCategory: (category: string): Promise<ApiResponse<any[]>> => 
    apiFetch<any[]>(`/api/v1/rh/ref/types/category/${category}`)
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
    apiFetch<any>(`/api/v1/rh/jobs/search?title=${encodeURIComponent(title)}`)
};

// =============================================================================
// API de Instituciones
// =============================================================================

export const InstitucionesAPI = createCrudService<any, any>('/api/v1/rh/institutions');

// =============================================================================
// API de Niveles Educativos
// =============================================================================

export const NivelesEducativosAPI = createCrudService<any, any>('/api/v1/rh/education-levels');

// =============================================================================
// API de Capacitaciones
// =============================================================================

export const CapacitacionesAPI = createCrudService<any, any>('/api/v1/rh/trainings');

// =============================================================================
// API de Experiencias Laborales
// =============================================================================

export const ExperienciasLaboralesAPI = createCrudService<any, any>('/api/v1/rh/work-experiences');

// =============================================================================
// API de Países
// =============================================================================

export const PaisesAPI = createCrudService<any, any>('/api/v1/rh/countries');

// =============================================================================
// API de Provincias
// =============================================================================

export const ProvinciasAPI = createCrudService<any, any>('/api/v1/rh/provinces');

// =============================================================================
// API de Cantones
// =============================================================================

export const CantonesAPI = createCrudService<any, any>('/api/v1/rh/cantons');
