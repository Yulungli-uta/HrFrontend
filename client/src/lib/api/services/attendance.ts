/**
 * Archivo: src/lib/api/services/attendance.ts
 *
 * DESCRIPCION ESTRUCTURAL
 * - Archivo conservado dentro del bloque funcional correspondiente.
 * - Se mantiene la implementacion original y solo se agrega esta cabecera descriptiva
 *   para facilitar ubicacion y revision del servicio.
 */

// src/lib/api/services/attendance.ts

/**
 * APIs de asistencia, marcaciones, permisos y vacaciones
 */

import { apiFetch } from '../core/fetch';
import { createApiService as createCrudService } from '../core/pagination';
import type { ApiResponse } from '../core/fetch';
import type {
  AttendancePunch, InsertAttendancePunch,
  Permission, InsertPermission,
  Vacation, InsertVacation,
} from '@/shared/schema';

// =============================================================================
// API de Marcaciones
// =============================================================================

export const MarcacionesAPI = createCrudService<AttendancePunch, InsertAttendancePunch>(
  '/api/v1/rh/attendance/punches'
);

// =============================================================================
// API de Marcaciones Especializadas
// =============================================================================

export const MarcacionesEspecializadasAPI = {
  getLastPunch: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/attendance/punches/last-punch/${employeeId}`),

  getTodayPunches: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/attendance/punches/today/${employeeId}`),

  getPunchesByEmployeeAndDateRange: (
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/attendance/punches/employee/${employeeId}/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),

  getPunchesByDateRange: (
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<any>> =>
    apiFetch<any>(
      `/api/v1/rh/attendance/punches/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    ),
};

// =============================================================================
// API de Justificaciones de Marcaciones
// =============================================================================

export const JustificacionesMarcacionesAPI = createCrudService<any, any>(
  '/api/v1/rh/attendance/punch-justifications'
);

// =============================================================================
// API de Cálculos de Asistencia (CRUD base)
// =============================================================================

export const CalculosAsistenciaAPI = createCrudService<any, any>(
  '/api/v1/rh/attendance/calculations'
);

// =============================================================================
// API de Permisos (con métodos especializados completos)
// =============================================================================

export const PermisosAPI = {
  ...createCrudService<Permission, InsertPermission>('/api/v1/rh/permissions'),

  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/permissions/employee/${employeeId}`),

  getByBossId: (bossId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/permissions/bossId/${bossId}`),

  getByBossIdNonMedical: (bossId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/permissions/bossId/${bossId}/non-medical`),

  getPendingMedical: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/permissions/medical/pending'),
};

// =============================================================================
// API de Tipos de Permisos
// =============================================================================

export const TiposPermisosAPI = {
  ...createCrudService<any, any>('/api/v1/rh/permission-types'),
  /** Tipos de permiso activos filtrados por el régimen laboral del usuario autenticado. */
  getAvailable: (): Promise<ApiResponse<any[]>> =>
    apiFetch<any[]>('/api/v1/rh/permission-types/available', { method: 'GET' }),
};

// =============================================================================
// API de Vacaciones (con métodos especializados)
// =============================================================================

export const VacacionesAPI = {
  ...createCrudService<Vacation, InsertVacation>('/api/v1/rh/vacations'),

  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/vacations/employee/${employeeId}`),

  getByBossId: (bossId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/vacations/bossId/${bossId}`),
};

// =============================================================================
// API de Horarios
// =============================================================================

export const HorariosAPI = createCrudService<any, any>('/api/v1/rh/schedules');

// =============================================================================
// API de Horarios de Empleados
// =============================================================================

export const HorariosEmpleadosAPI = createCrudService<any, any>('/api/v1/rh/employee-schedules');

// =============================================================================
// API de Horas Extras
// =============================================================================

export const HorasExtrasAPI = createCrudService<any, any>('/api/v1/rh/overtime');

// =============================================================================
// API de Configuración de Horas Extras
// =============================================================================

export const ConfigHorasExtrasAPI = createCrudService<any, any>('/api/v1/rh/overtime/config');

// =============================================================================
// API de Subrogaciones
// =============================================================================

export const SubrogacionesAPI = createCrudService<any, any>('/api/v1/rh/subrogations');

// =============================================================================
// API de Planes de Recuperación de Tiempo
// =============================================================================
// OBSOLETO / SIN USO REAL (verificado 2026-07-22): ningún componente importa estos
// dos servicios. El mecanismo real de recuperación de horas fuera de horario es
// TimePlanning (PlanType='Recovery') — ver components/planning/CreatePlanningDialog.tsx
// y lib/api/services/planning.ts. El backend ya marcó los controllers correspondientes
// como [Obsolete] (WsUtaSystem.Controllers.HR.TimeRecoveryPlansController/
// TimeRecoveryLogsController) porque no afectan el saldo real del empleado.
// No usar estos dos exports para nada nuevo.

/** @deprecated Sin uso real — usar el flujo de TimePlanning (planning.ts) en su lugar. */
export const PlanesRecuperacionTiempoAPI = createCrudService<any, any>(
  '/api/v1/rh/time-recovery/plans'
);

// =============================================================================
// API de Registros de Recuperación de Tiempo
// =============================================================================

/** @deprecated Sin uso real — la ejecución real se registra en TimePlanningExecution (planning.ts). */
export const RegistrosRecuperacionTiempoAPI = createCrudService<any, any>(
  '/api/v1/rh/time-recovery/logs'
);

// =============================================================================
// API de Saldo de Tiempo (TimeBalance)
// =============================================================================

export type VacationBalanceAdjustmentMode = 'Increment' | 'Set';
/** Vacation = HR.tbl_TimeBalances.VacationAvailableMin; Recovery = RecoveryPendingMin (incluye recuperación de horas por pandemia). */
export type TimeBalanceField = 'Vacation' | 'Recovery';

export interface VacationBalanceAdjustmentRequest {
  employeeId: number;
  laborRegimeName: string;
  balanceField?: TimeBalanceField;
  mode: VacationBalanceAdjustmentMode;
  valueMinutes: number;
  reason: string;
  allowNegativeResult: boolean;
}

export interface VacationBalanceAdjustmentResult {
  employeeId: number;
  laborRegimeId: number;
  previousBalanceMin: number;
  newBalanceMin: number;
  deltaAppliedMin: number;
}

export interface VacationBalanceBulkAdjustmentItem {
  cedula: string;
  laborRegimeName: string;
  balanceField?: TimeBalanceField;
  mode: VacationBalanceAdjustmentMode;
  valueMinutes: number;
  reason: string;
  allowNegativeResult: boolean;
}

export interface VacationBalanceBulkAdjustmentRowResult {
  cedula: string;
  success: boolean;
  message: string;
  previousBalanceMin?: number | null;
  newBalanceMin?: number | null;
}

export interface PendingVacationSettlement {
  employeeId: number;
  employeeName: string;
  laborRegimeId: number;
  laborRegimeName: string;
  regimeEffectiveTo?: string | null;
  currentBalanceMin: number;
  /** Saldo de recuperación de horas (HR.tbl_TimeBalances.RecoveryPendingMin) del régimen cerrado — a favor o en contra. */
  currentRecoveryBalanceMin: number;
  /** Motivo del cierre del régimen: Renuncia, Jubilación, Fin de contrato, Acción de personal, o Cierre manual. */
  triggerReason: string;
}

export interface VacationSettlementRequest {
  employeeId: number;
  laborRegimeName: string;
  reason: string;
}

export interface VacationSettlementResult {
  employeeId: number;
  laborRegimeId: number;
  previousVacationBalanceMin: number;
  newVacationBalanceMin: number;
  previousRecoveryBalanceMin: number;
  newRecoveryBalanceMin: number;
}

export interface CurrentTimeBalance {
  employeeId: number;
  laborRegimeId: number;
  laborRegimeName: string;
  vacationAvailableMin: number;
  recoveryPendingMin: number;
}

export const TimeBalanceAPI = {
  ...createCrudService<any, any>('/api/v1/rh/timebalances'),

  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/timebalances/${employeeId}`),

  /** Saldo actual (vacaciones + recuperación) de un empleado en un régimen específico. */
  getCurrentBalance: (employeeId: number, laborRegimeName: string): Promise<ApiResponse<CurrentTimeBalance>> =>
    apiFetch<CurrentTimeBalance>(
      `/api/v1/rh/timebalances/current?employeeId=${employeeId}&laborRegimeName=${encodeURIComponent(laborRegimeName)}`
    ),

  /** Ajuste manual individual de saldo de vacaciones (incrementar/descontar/establecer). */
  adjust: (req: VacationBalanceAdjustmentRequest): Promise<ApiResponse<VacationBalanceAdjustmentResult>> =>
    apiFetch<VacationBalanceAdjustmentResult>('/api/v1/rh/timebalances/adjust', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  /** Carga masiva de saldo (ej. listado Código de Trabajo), fila por fila, con reporte individual. */
  bulkAdjust: (
    batchTag: string,
    items: VacationBalanceBulkAdjustmentItem[]
  ): Promise<ApiResponse<VacationBalanceBulkAdjustmentRowResult[]>> =>
    apiFetch<VacationBalanceBulkAdjustmentRowResult[]>('/api/v1/rh/timebalances/bulk-adjust', {
      method: 'POST',
      body: JSON.stringify({ batchTag, items }),
    }),

  /** Buzón: empleados con régimen cerrado (contrato terminado) y saldo pendiente de liquidar. */
  getPendingSettlements: (): Promise<ApiResponse<PendingVacationSettlement[]>> =>
    apiFetch<PendingVacationSettlement[]>('/api/v1/rh/timebalances/pending-settlements'),

  /** Procesa la liquidación de un régimen ya cerrado (vacaciones + recuperación de horas, en una sola transacción). */
  settle: (req: VacationSettlementRequest): Promise<ApiResponse<VacationSettlementResult>> =>
    apiFetch<VacationSettlementResult>('/api/v1/rh/timebalances/settle', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};

// =============================================================================
// API de Tiempo del Servidor
// =============================================================================

export interface TimeResponse {
  dateTime: string;
  timestamp: number;
  timeZone?: string;
  formattedTime?: string;
  isUtc: boolean;
  serverName?: string;
}

export const TimeAPI = {
  getServerTime: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>('/api/v1/rh/time'),

  getServerTimeUtc: (): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>('/api/v1/rh/time/utc'),

  getTimeByTimeZone: (timeZoneId: string): Promise<ApiResponse<TimeResponse>> =>
    apiFetch<TimeResponse>(`/api/v1/rh/time/timezone/${timeZoneId}`),

  health: (): Promise<ApiResponse<any>> =>
    apiFetch<any>('/api/v1/rh/time/health'),
};
