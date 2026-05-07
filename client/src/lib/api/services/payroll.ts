/**
 * Archivo: src/lib/api/services/payroll.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Bloque funcional exclusivo de nomina.
 * - Contiene unicamente los servicios de nomina y lineas de nomina para separar la
 *   ejecucion de pagos de la revision contractual.
 */

// src/lib/api/services/payroll.ts

/**
 * APIs de contratos, nómina, salarios y actividades
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';
import type {
  Contract, InsertContract,
} from '@/shared/schema';

// =============================================================================
// API de Nómina
// =============================================================================

export const NominaAPI = createCrudService<any, any>('/api/v1/rh/payroll');

// =============================================================================
// API de Líneas de Nómina
// =============================================================================

export const LineasNominaAPI = createCrudService<any, any>('/api/v1/rh/payroll-lines');

