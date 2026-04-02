// src/lib/api/services/calculations.ts

/**
 * APIs de cálculos de asistencia, nómina y recuperación de tiempo
 */

import { apiFetch } from '../core/fetch';
import type { ApiResponse } from '../core/fetch';

// =============================================================================
// DTOs compartidos
// =============================================================================

export interface AttendanceCalculationRequestDto {
  fromDate: string;
  toDate: string;
  employeeId?: number;
}

export interface PayrollPeriodRequestDto {
  /** Formato YYYY-MM */
  period: string;
}

// =============================================================================
// API de Cálculos de Asistencia (operaciones especializadas)
// =============================================================================

export const AttendanceCalculationAPI = {
  /**
   * Ejecuta el cálculo masivo de asistencia para un rango de fechas
   */
  calculateRange: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/calculate-range', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Calcula los minutos nocturnos trabajados para un rango de fechas
   */
  calculateNightMinutes: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/calc-night-minutes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Procesa el rango completo de asistencia (orquestador principal)
   */
  processAttendanceRange: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/process-range', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Aplica justificaciones aprobadas para anular atrasos o ausencias
   */
  applyJustifications: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/apply-justifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Procesa el cálculo y aplicación de recuperación de horas extra
   */
  applyOvertimeRecovery: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/apply-overtime-recovery', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// API de Precio de Horas Extra
// =============================================================================

export const OvertimePriceAPI = {
  /**
   * Calcula el precio de las horas extra para un período específico
   */
  calculateOvertimePrice: (data: PayrollPeriodRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/overtime/price', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// API de Descuentos de Nómina
// =============================================================================

export const PayrollDiscountsAPI = {
  /**
   * Calcula los descuentos por atrasos y ausencias para un período de nómina
   */
  calculateDiscounts: (data: PayrollPeriodRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/payroll/discounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// API de Subsidios de Nómina
// =============================================================================

export const PayrollSubsidiesAPI = {
  /**
   * Calcula los subsidios y recargos (nocturnos/feriados) para un período de nómina
   */
  calculateSubsidies: (data: PayrollPeriodRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/payroll/subsidies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// API de Recuperación de Tiempo
// =============================================================================

export const RecoveryAPI = {
  /**
   * Consolida recuperaciones de tiempo para restar deuda de minutos adeudados
   */
  applyRecovery: (data: AttendanceCalculationRequestDto): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/cv/recovery/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
