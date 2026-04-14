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
const ATTENDANCE_LONG_TIMEOUT_MS = 1000 * 60 * 60; // 60 minutos - tiempo de session

export const AttendanceCalculationAPI = {
  /**
   * Endpoint oficial.
   * Ejecuta el pipeline completo de asistencia para un rango de fechas.
   *
   * Incluye:
   * - cálculo base
   * - permisos / vacaciones
   * - justificaciones
   * - recovery
   * - overtime / planning
   * - finalización
   */
  processAttendanceRange: (
    data: AttendanceCalculationRequestDto
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/process-range', {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: ATTENDANCE_LONG_TIMEOUT_MS,
    }),

  /**
   * Alias semántico del pipeline principal.
   * Puedes usar este nombre en pantallas nuevas si quieres dejar más claro
   * que ejecuta toda la orquestación.
   */
  runAttendancePipelineRange: (
    data: AttendanceCalculationRequestDto
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/process-range', {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: ATTENDANCE_LONG_TIMEOUT_MS,
    }),

  /**
   * @deprecated
   * Usa processAttendanceRange o runAttendancePipelineRange.
   *
   * Este endpoint ejecuta el flujo legacy de cálculo masivo y puede no estar
   * alineado con la nueva estructura de asistencia.
   */
  calculateRange: (
    data: AttendanceCalculationRequestDto
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/calculate-range', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * @deprecated
   * Los minutos nocturnos ahora forman parte del pipeline principal.
   */
  calculateNightMinutes: (
    data: AttendanceCalculationRequestDto
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/calc-night-minutes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * @deprecated
   * Las justificaciones ahora forman parte del pipeline principal.
   */
  applyJustifications: (
    data: AttendanceCalculationRequestDto
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/attendance/calculations/apply-justifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * @deprecated
   * Overtime y recovery ahora forman parte del pipeline principal.
   */
  applyOvertimeRecovery: (
    data: AttendanceCalculationRequestDto
  ): Promise<ApiResponse<any>> =>
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
