/**
 * APIs de contratos, nómina y salarios
 */

import { createCrudService } from './client';
import type {
  Contract, InsertContract
} from '@shared/schema';

// =============================================================================
// API de Contratos
// =============================================================================

export const ContratosAPI = createCrudService<Contract, InsertContract>('/api/v1/rh/contracts');

// =============================================================================
// API de Historial Salarial
// =============================================================================

export const HistorialSalarialAPI = createCrudService<any, any>('/api/v1/rh/salary-history');

// =============================================================================
// API de Nómina
// =============================================================================

export const NominaAPI = createCrudService<any, any>('/api/v1/rh/payroll');

// =============================================================================
// API de Líneas de Nómina
// =============================================================================

export const LineasNominaAPI = createCrudService<any, any>('/api/v1/rh/payroll-lines');

// =============================================================================
// API de Movimientos de Personal
// =============================================================================

export const MovimientosPersonalAPI = createCrudService<any, any>('/api/v1/rh/personnel-movements');
