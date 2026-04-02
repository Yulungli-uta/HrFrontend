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

export const TiposPermisosAPI = createCrudService<any, any>('/api/v1/rh/permission-types');

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

export const PlanesRecuperacionTiempoAPI = createCrudService<any, any>(
  '/api/v1/rh/time-recovery/plans'
);

// =============================================================================
// API de Registros de Recuperación de Tiempo
// =============================================================================

export const RegistrosRecuperacionTiempoAPI = createCrudService<any, any>(
  '/api/v1/rh/time-recovery/logs'
);

// =============================================================================
// API de Saldo de Tiempo (TimeBalance)
// =============================================================================

export const TimeBalanceAPI = {
  ...createCrudService<any, any>('/api/v1/rh/timebalances'),

  getByEmployee: (employeeId: number): Promise<ApiResponse<any>> =>
    apiFetch<any>(`/api/v1/rh/timebalances/${employeeId}`),
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
